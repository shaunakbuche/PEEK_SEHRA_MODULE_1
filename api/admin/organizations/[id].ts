import { z } from "zod";
import { route, body, ApiError } from "../../_lib/http.js";
import { requireAuth } from "../../_lib/auth.js";
import { q, qOne } from "../../_lib/db.js";

const PatchBody = z.object({
  action: z.enum(["archive", "unarchive"]),
});

export default route({
  /** Archive (hide from the default list) or restore an organization. Reversible. */
  PATCH: async (req, res) => {
    await requireAuth(req, "admin");
    const id = req.query.id as string;
    const parsed = PatchBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, "Invalid request");

    const updated: any = await qOne(
      `UPDATE organizations SET archived = $2 WHERE id = $1 RETURNING id, archived`,
      [id, parsed.data.action === "archive"]
    );
    if (!updated) throw new ApiError(404, "Organization not found");
    res.status(200).json({ ok: true, archived: updated.archived });
  },

  /**
   * Permanently deletes the organization. Cascades (via foreign keys) to its
   * school login, assessment, report and report edit history. Irreversible;
   * the client is expected to have confirmed this explicitly first.
   */
  DELETE: async (req, res) => {
    await requireAuth(req, "admin");
    const id = req.query.id as string;
    const existing = await qOne(`SELECT id FROM organizations WHERE id = $1`, [id]);
    if (!existing) throw new ApiError(404, "Organization not found");
    await q(`DELETE FROM organizations WHERE id = $1`, [id]);
    res.status(200).json({ ok: true });
  },
});
