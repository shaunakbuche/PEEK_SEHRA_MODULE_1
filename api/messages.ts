import { z } from "zod";
import { route, body, ApiError } from "./_lib/http.js";
import { requireAuth, type Session } from "./_lib/auth.js";
import { q, qOne } from "./_lib/db.js";

const PostBody = z.object({
  body: z.string().trim().min(1, "Write a message first").max(4000),
  orgId: z.string().uuid().optional(), // required for admin, ignored for school
});

/** School threads are always their own org; admin must say which org. */
function resolveOrgId(session: Session, candidate?: string): string {
  if (session.role === "school") {
    if (!session.orgId) throw new ApiError(400, "Your login has no organization attached");
    return session.orgId;
  }
  if (!candidate) throw new ApiError(400, "orgId is required for admin");
  return candidate;
}

export default route({
  /** List a thread, oldest first. School: own org. Admin: ?orgId=<uuid>. */
  GET: async (req, res) => {
    const session = await requireAuth(req);
    const orgId = resolveOrgId(session, req.query.orgId as string | undefined);

    const rows = await q<{ id: string; sender_role: "school" | "admin"; body: string; created_at: string }>(
      `SELECT id, sender_role, body, created_at FROM messages WHERE org_id = $1 ORDER BY created_at ASC`,
      [orgId]
    );
    res.status(200).json({
      messages: rows.map((r) => ({ id: r.id, senderRole: r.sender_role, body: r.body, createdAt: r.created_at })),
    });
  },

  /** Post a message. School: own org. Admin: body.orgId required. */
  POST: async (req, res) => {
    const session = await requireAuth(req);
    const parsed = PostBody.safeParse(body(req));
    if (!parsed.success) throw new ApiError(400, parsed.error.issues[0]?.message || "Invalid message");
    const orgId = resolveOrgId(session, parsed.data.orgId);

    const row: any = await qOne(
      `INSERT INTO messages (org_id, sender_role, body) VALUES ($1,$2,$3)
       RETURNING id, sender_role, body, created_at`,
      [orgId, session.role, parsed.data.body]
    );
    res.status(201).json({
      message: { id: row.id, senderRole: row.sender_role, body: row.body, createdAt: row.created_at },
    });
  },
});
