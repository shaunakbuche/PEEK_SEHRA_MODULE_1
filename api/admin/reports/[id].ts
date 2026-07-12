import { z } from "zod";
import { route, body, ApiError } from "../../_lib/http.js";
import { requireAuth } from "../../_lib/auth.js";
import { q, qOne } from "../../_lib/db.js";
import { ReportContentSchema } from "../../../src/lib/reportTypes.js";

const PutBody = z.object({ content: ReportContentSchema });

export default route({
  GET: async (req, res) => {
    await requireAuth(req, "admin");
    const id = req.query.id as string;
    const report: any = await qOne(
      `SELECT r.*, a.org_id, a.status AS assessment_status, o.name AS org_name, o.country AS org_country
       FROM reports r
       JOIN assessments a ON a.id = r.assessment_id
       JOIN organizations o ON o.id = a.org_id
       WHERE r.id = $1`,
      [id]
    );
    if (!report) throw new ApiError(404, "Report not found");
    res.status(200).json({
      report: {
        id: report.id,
        status: report.status,
        content: report.content,
        pdfUrl: report.pdf_url,
        docxUrl: report.docx_url,
        approvedAt: report.approved_at,
        org: { id: report.org_id, name: report.org_name, country: report.org_country },
        assessmentStatus: report.assessment_status,
      },
    });
  },

  /** Save Peek's edits to the report content. */
  PUT: async (req, res) => {
    const session = await requireAuth(req, "admin");
    const id = req.query.id as string;
    const parsed = PutBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, "Invalid report content");

    const updated: any = await qOne(
      `UPDATE reports
       SET content = $2, status = CASE WHEN status = 'approved' THEN 'approved' ELSE 'edited' END,
           updated_at = now()
       WHERE id = $1
       RETURNING id, status, content`,
      [id, JSON.stringify(parsed.data.content)]
    );
    if (!updated) throw new ApiError(404, "Report not found");

    await q(
      `INSERT INTO report_edits (report_id, editor_id, diff) VALUES ($1, $2, $3)`,
      [id, session.uid, JSON.stringify({ snapshot: parsed.data.content })]
    );

    res.status(200).json({ report: { id: updated.id, status: updated.status, content: updated.content } });
  },
});
