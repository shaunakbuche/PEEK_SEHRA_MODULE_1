import { route, ApiError } from "../_lib/http.js";
import { requireAuth } from "../_lib/auth.js";
import { qOne } from "../_lib/db.js";

export default route({
  POST: async (req, res) => {
    const session = requireAuth(req, "school");
    if (!session.orgId) throw new ApiError(400, "Your login has no organization attached");

    const assessment: any = await qOne(`SELECT * FROM assessments WHERE org_id = $1`, [session.orgId]);
    if (!assessment) throw new ApiError(404, "No assessment found");
    if (!["draft", "returned"].includes(assessment.status)) {
      throw new ApiError(409, "Already submitted");
    }

    const updated: any = await qOne(
      `UPDATE assessments
       SET status = 'submitted', submitted_at = now(), return_note = '', updated_at = now()
       WHERE id = $1
       RETURNING status, submitted_at`,
      [assessment.id]
    );
    res.status(200).json({ ok: true, status: updated.status, submittedAt: updated.submitted_at });
  },
});
