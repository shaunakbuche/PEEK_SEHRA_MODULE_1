import { z } from "zod";
import { route, body, ApiError } from "./_lib/http.js";
import { requireAuth, hashPassword, verifyPassword } from "./_lib/auth.js";
import { q, qOne } from "./_lib/db.js";

const PutBody = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    email: z.string().email().optional(),
    newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
    fullName: z.string().max(120).optional(),
  })
  .refine((b) => b.email || b.newPassword || b.fullName !== undefined, {
    message: "Nothing to update",
  });

export default route({
  /** Update the signed-in user's own email, password or display name. */
  PUT: async (req, res) => {
    const session = requireAuth(req);
    const parsed = PutBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid input");
    const { currentPassword, email, newPassword, fullName } = parsed.data;

    const user: any = await qOne(`SELECT * FROM users WHERE id = $1`, [session.uid]);
    if (!user) throw new ApiError(404, "Account not found");
    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      throw new ApiError(401, "Current password is incorrect");
    }

    if (email) {
      const emailNorm = email.trim().toLowerCase();
      if (emailNorm !== user.email) {
        const taken = await qOne(`SELECT id FROM users WHERE email = $1 AND id <> $2`, [emailNorm, user.id]);
        if (taken) throw new ApiError(409, "That email is already in use");
        await q(`UPDATE users SET email = $2 WHERE id = $1`, [user.id, emailNorm]);
      }
    }
    if (newPassword) {
      await q(`UPDATE users SET password_hash = $2 WHERE id = $1`, [user.id, await hashPassword(newPassword)]);
    }
    if (fullName !== undefined) {
      await q(`UPDATE users SET full_name = $2 WHERE id = $1`, [user.id, fullName]);
    }

    const updated: any = await qOne(`SELECT id, email, role, full_name FROM users WHERE id = $1`, [user.id]);
    res.status(200).json({
      ok: true,
      user: { id: updated.id, email: updated.email, role: updated.role, fullName: updated.full_name },
    });
  },
});
