import { z } from "zod";
import { route, body, ApiError } from "../../_lib/http.js";
import { requireAuth } from "../../_lib/auth.js";
import { qOne } from "../../_lib/db.js";

const PatchBody = z.object({
  action: z.literal("return"),
  note: z.string().max(2000).optional().default(""),
});

export default route({
  /** Admin: send an assessment back to the school for changes. */
  PATCH: async (req, res) => {
    requireAuth(req, "admin");
    const id = req.query.id as string;
    const parsed = PatchBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, "Invalid request");

    const updated: any = await qOne(
      `UPDATE assessments
       SET status = 'returned', return_note = $2, updated_at = now()
       WHERE id = $1
       RETURNING id, status`,
      [id, parsed.data.note]
    );
    if (!updated) throw new ApiError(404, "Assessment not found");
    res.status(200).json({ ok: true, status: updated.status });
  },
});
