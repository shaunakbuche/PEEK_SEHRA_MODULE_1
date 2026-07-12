import { z } from "zod";
import { route, body, ApiError } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";
import { q, qOne } from "../_lib/db.js";

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
});
