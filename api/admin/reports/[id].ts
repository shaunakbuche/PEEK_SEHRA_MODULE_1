import { z } from "zod";
import { put } from "@vercel/blob";
import { route, body, ApiError } from "../../_lib/http.js";
import { requireAuth } from "../../_lib/auth.js";
import { q, qOne } from "../../_lib/db.js";
import { renderReportPdf } from "../../_lib/pdf.js";
import { renderReportDocx } from "../../_lib/docxGen.js";
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

  /**
   * Approve & publish: renders the final PDF and DOCX, uploads both to Vercel
   * Blob, marks the report approved and the assessment approved so the school
   * can see and download it.
   */
  POST: async (req, res) => {
    const session = await requireAuth(req, "admin");
    const id = req.query.id as string;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError(500, "File publishing unavailable. Create a Blob store in the Vercel dashboard.");
    }

    const row: any = await qOne(
      `SELECT r.*, a.id AS assessment_id, o.name AS org_name, o.country AS org_country
       FROM reports r
       JOIN assessments a ON a.id = r.assessment_id
       JOIN organizations o ON o.id = a.org_id
       WHERE r.id = $1`,
      [id]
    );
    if (!row) throw new ApiError(404, "Report not found");

    const content = ReportContentSchema.parse(row.content);
    const meta = { org: row.org_name, country: row.org_country };

    const [pdfBuf, docxBuf] = await Promise.all([
      renderReportPdf(content, meta),
      renderReportDocx(content, meta),
    ]);

    const slug = row.org_name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "report";
    const [pdfBlob, docxBlob] = await Promise.all([
      put(`sehra-reports/${id}/SEHRA-Report-${slug}.pdf`, pdfBuf, {
        access: "public",
        contentType: "application/pdf",
        addRandomSuffix: true,
      }),
      put(`sehra-reports/${id}/SEHRA-Report-${slug}.docx`, docxBuf, {
        access: "public",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        addRandomSuffix: true,
      }),
    ]);

    const updated2: any = await qOne(
      `UPDATE reports
       SET status = 'approved', pdf_url = $2, docx_url = $3,
           approved_by = $4, approved_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, pdfBlob.url, docxBlob.url, session.uid]
    );
    await qOne(
      `UPDATE assessments SET status = 'approved', updated_at = now() WHERE id = $1 RETURNING id`,
      [row.assessment_id]
    );

    res.status(200).json({
      report: {
        id: updated2.id,
        status: updated2.status,
        pdfUrl: updated2.pdf_url,
        docxUrl: updated2.docx_url,
        approvedAt: updated2.approved_at,
      },
    });
  },
});
