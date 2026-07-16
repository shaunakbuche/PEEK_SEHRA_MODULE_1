import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { route, body, ApiError } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";
import { q, qOne } from "../_lib/db.js";
import { extractJson } from "../_lib/reportSkill.js";
import {
  EXTRACT_MODEL,
  EXTRACT_SYSTEM,
  buildExtractionSlots,
  serializeSlots,
  normalizeExtraction,
} from "../_lib/extractSkill.js";

async function getOrCreateForOrg(orgId: string) {
  const existing = await qOne(`SELECT * FROM assessments WHERE org_id = $1`, [orgId]);
  if (existing) return existing;
  return qOne(
    `INSERT INTO assessments (org_id) VALUES ($1)
     ON CONFLICT (org_id) DO UPDATE SET org_id = EXCLUDED.org_id
     RETURNING *`,
    [orgId]
  );
}

const PatchBody = z.object({
  patch: z.record(z.string(), z.string()).refine((p) => Object.keys(p).length <= 400, {
    message: "Patch too large",
  }),
});

/** ~4.2MB guard on the base64 payload, under Vercel's ~4.5MB request-body limit. */
const MAX_B64 = 4_200_000;
const ExtractBody = z.object({
  document: z
    .object({
      name: z.string().max(300).optional(),
      mediaType: z.string().max(100).optional(),
      dataBase64: z.string().max(MAX_B64).optional(),
      text: z.string().max(600_000).optional(),
    })
    .refine((d) => !!(d.dataBase64 || d.text), { message: "No document content" }),
});

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);

/** Per-instance throttle so a stuck upload button can't burn API credit. */
const lastExtract = new Map<string, number>();

export default route({
  /** School: own assessment. Admin: ?orgId=<uuid>. Includes the report when visible. */
  GET: async (req, res) => {
    const session = await requireAuth(req);
    let orgId: string;
    if (session.role === "admin") {
      const query = (req.query.orgId as string) || "";
      if (!query) throw new ApiError(400, "orgId is required for admin");
      orgId = query;
    } else {
      if (!session.orgId) throw new ApiError(400, "Your login has no organization attached");
      orgId = session.orgId;
    }

    const assessment: any = await getOrCreateForOrg(orgId);
    const report: any = await qOne(`SELECT * FROM reports WHERE assessment_id = $1`, [assessment.id]);
    const reportVisible =
      report && (session.role === "admin" || report.status === "approved");

    res.status(200).json({
      assessment: {
        id: assessment.id,
        orgId: assessment.org_id,
        status: assessment.status,
        answers: assessment.answers,
        returnNote: assessment.return_note,
        submittedAt: assessment.submitted_at,
        updatedAt: assessment.updated_at,
      },
      report: reportVisible
        ? {
            id: report.id,
            status: report.status,
            content: report.content,
            pdfUrl: report.pdf_url,
            docxUrl: report.docx_url,
            approvedAt: report.approved_at,
          }
        : null,
    });
  },

  /** School autosave: merge a patch of answer keys into the answers jsonb. */
  PUT: async (req, res) => {
    const session = await requireAuth(req, "school");
    if (!session.orgId) throw new ApiError(400, "Your login has no organization attached");
    const parsed = PatchBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, "Invalid patch");

    const assessment: any = await getOrCreateForOrg(session.orgId);
    if (!["draft", "returned"].includes(assessment.status)) {
      throw new ApiError(409, "This assessment has been submitted and can no longer be edited");
    }

    const updated: any = await qOne(
      `UPDATE assessments
       SET answers = answers || $2::jsonb, updated_at = now()
       WHERE id = $1
       RETURNING status, updated_at`,
      [assessment.id, JSON.stringify(parsed.data.patch)]
    );
    res.status(200).json({ ok: true, status: updated.status, updatedAt: updated.updated_at });
  },

  /**
   * School: scan an uploaded document (PDF, image or text) and return suggested
   * answers. This never writes to the assessment — the school reviews the
   * suggestions and applies the ones it wants via the normal PUT autosave.
   */
  POST: async (req, res) => {
    const session = await requireAuth(req, "school");
    if (!session.orgId) throw new ApiError(400, "Your login has no organization attached");

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new ApiError(
        501,
        "Document scanning is not enabled yet. Add ANTHROPIC_API_KEY in the Vercel environment variables to turn it on."
      );
    }

    const last = lastExtract.get(session.uid) ?? 0;
    if (Date.now() - last < 10_000) {
      throw new ApiError(429, "A document was just scanned. Please wait a few seconds and try again.");
    }

    const parsed = ExtractBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, "A document (text or a base64-encoded file) is required");
    const doc = parsed.data.document;

    const content: Anthropic.ContentBlockParam[] = [];
    if (doc.text && doc.text.trim()) {
      content.push({ type: "text", text: `DOCUMENT (${doc.name || "uploaded text"}):\n\n${doc.text}` });
    } else if (doc.dataBase64) {
      const mt = (doc.mediaType || "").toLowerCase();
      if (mt === "application/pdf") {
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: doc.dataBase64 } });
      } else if (IMAGE_TYPES.has(mt)) {
        content.push({ type: "image", source: { type: "base64", media_type: mt as any, data: doc.dataBase64 } });
      } else if (TEXT_TYPES.has(mt)) {
        let decoded = "";
        try {
          decoded = Buffer.from(doc.dataBase64, "base64").toString("utf8");
        } catch {
          decoded = "";
        }
        if (!decoded.trim()) throw new ApiError(400, "That file appears to be empty.");
        content.push({ type: "text", text: `DOCUMENT (${doc.name || "uploaded text"}):\n\n${decoded}` });
      } else {
        throw new ApiError(415, "Unsupported file type. Upload a PDF, an image (JPG or PNG), or a text file.");
      }
    } else {
      throw new ApiError(400, "No document content provided");
    }

    lastExtract.set(session.uid, Date.now());

    const slots = buildExtractionSlots();
    content.push({
      type: "text",
      text:
        "Read the document above and fill in whatever it directly supports from this catalogue. " +
        "Omit everything you cannot ground in the document.\n\nCATALOGUE:\n" +
        serializeSlots(slots),
    });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    let text = "";
    try {
      const msg = await client.messages.create({
        model: EXTRACT_MODEL,
        max_tokens: 8000,
        system: EXTRACT_SYSTEM,
        messages: [{ role: "user", content }],
      });
      text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
    } catch (e: any) {
      console.error("Extraction call failed:", e?.message || e);
      throw new ApiError(502, "The document could not be read just now. Please try again.");
    }

    let suggestions;
    try {
      suggestions = normalizeExtraction(extractJson(text), slots);
    } catch (e) {
      console.error("Extraction parse failure:", e, text.slice(0, 400));
      throw new ApiError(502, "The document reader returned an unexpected result. Please try again.");
    }

    res.status(200).json({ suggestions, model: EXTRACT_MODEL });
  },
});
