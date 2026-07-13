import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { route, body, ApiError } from "../../_lib/http.js";
import { requireAuth } from "../../_lib/auth.js";
import { qOne } from "../../_lib/db.js";
import { REPORT_MODEL, REPORT_SKILL_SYSTEM, buildAssessmentDigest, extractJson } from "../../_lib/reportSkill.js";
import { buildTemplateReport } from "../../_lib/reportTemplate.js";
import { ReportContentSchema } from "../../../src/lib/reportTypes.js";

const GenBody = z.object({
  assessmentId: z.string().uuid(),
  mode: z.enum(["ai", "template"]).default("ai"),
});

/** Naive per-instance rate limit so a stuck button can't burn API credit. */
const lastRun = new Map<string, number>();

export default route({
  POST: async (req, res) => {
    const session = await requireAuth(req, "admin");

    const parsed = GenBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, "assessmentId (uuid) is required");
    const { assessmentId, mode } = parsed.data;

    if (mode === "ai" && !process.env.ANTHROPIC_API_KEY) {
      throw new ApiError(500, "AI report generation unavailable. Set ANTHROPIC_API_KEY in Vercel environment variables, or generate from answers instead (no key needed).");
    }

    const row: any = await qOne(
      `SELECT a.*, o.name AS org_name, o.country AS org_country, o.region AS org_region
       FROM assessments a JOIN organizations o ON o.id = a.org_id
       WHERE a.id = $1`,
      [assessmentId]
    );
    if (!row) throw new ApiError(404, "Assessment not found");
    if (row.status === "draft") {
      throw new ApiError(409, "This assessment has not been submitted yet");
    }

    const orgMeta = { name: row.org_name, country: row.org_country, region: row.org_region };
    let content;
    let aiModel = "";

    if (mode === "template") {
      content = buildTemplateReport(row.answers || {}, orgMeta);
    } else {
      const last = lastRun.get(session.uid) ?? 0;
      if (Date.now() - last < 15_000) {
        throw new ApiError(429, "A report was just generated. Wait a few seconds and try again.");
      }
      lastRun.set(session.uid, Date.now());

      const digest = buildAssessmentDigest(row.answers || {}, orgMeta);
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const msg = await client.messages.create({
        model: REPORT_MODEL,
        max_tokens: 8000,
        system: REPORT_SKILL_SYSTEM,
        messages: [
          { role: "user", content: `Write the SEHRA Module 1 report for the assessment below.\n\n${digest}` },
        ],
      });

      const text = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      try {
        content = ReportContentSchema.parse(extractJson(text));
      } catch (e) {
        console.error("Report parse failure:", e, text.slice(0, 500));
        throw new ApiError(502, "The AI returned an unexpected format. Try generating again.");
      }
      aiModel = REPORT_MODEL;
    }

    const report: any = await qOne(
      `INSERT INTO reports (assessment_id, content, ai_model, status)
       VALUES ($1, $2, $3, 'generated')
       ON CONFLICT (assessment_id) DO UPDATE
         SET content = EXCLUDED.content, ai_model = EXCLUDED.ai_model,
             status = 'generated', pdf_url = NULL, docx_url = NULL,
             approved_by = NULL, approved_at = NULL, updated_at = now()
       RETURNING *`,
      [assessmentId, JSON.stringify(content), aiModel]
    );
    await qOne(
      `UPDATE assessments SET status = 'in_review', updated_at = now() WHERE id = $1 AND status = 'submitted' RETURNING id`,
      [assessmentId]
    );

    res.status(200).json({
      report: { id: report.id, status: report.status, content: report.content },
    });
  },
});
