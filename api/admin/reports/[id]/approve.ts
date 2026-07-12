import { put } from "@vercel/blob";
import { route, ApiError } from "../../../_lib/http.js";
import { requireAuth } from "../../../_lib/auth.js";
import { qOne } from "../../../_lib/db.js";
import { renderReportPdf } from "../../../_lib/pdf.js";
import { renderReportDocx } from "../../../_lib/docxGen.js";
import { ReportContentSchema } from "../../../../src/lib/reportTypes.js";

/**
 * Approve & publish: renders the final PDF and DOCX, uploads both to Vercel
 * Blob, marks the report approved and the assessment approved so the school
 * can see and download it.
 */
export default route({
  POST: async (req, res) => {
    const session = requireAuth(req, "admin");
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

    const updated: any = await qOne(
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
        id: updated.id,
        status: updated.status,
        pdfUrl: updated.pdf_url,
        docxUrl: updated.docx_url,
        approvedAt: updated.approved_at,
      },
    });
  },
});
