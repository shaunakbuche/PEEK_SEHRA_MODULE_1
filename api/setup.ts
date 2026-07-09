import { route } from "./_lib/http";
import { ensureSchema, qOne, q } from "./_lib/db";
import { hashPassword } from "./_lib/auth";

/**
 * One-time bootstrap. Idempotent and safe to call repeatedly:
 *  1. Applies the database schema (CREATE TABLE IF NOT EXISTS).
 *  2. Creates the first Peek admin from ADMIN_EMAIL / ADMIN_PASSWORD env vars,
 *     but only if no admin exists yet.
 * If SETUP_KEY is set in the environment, ?key=<SETUP_KEY> is required.
 */
async function setup(req: any, res: any) {
  const guard = process.env.SETUP_KEY;
  if (guard && req.query.key !== guard) {
    res.status(403).json({ error: "Invalid setup key" });
    return;
  }

  await ensureSchema();

  const existing = await qOne(`SELECT id FROM users WHERE role = 'admin' LIMIT 1`);
  let adminCreated = false;

  if (!existing) {
    const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "";
    if (email && password) {
      await q(
        `INSERT INTO users (email, password_hash, role, full_name)
         VALUES ($1, $2, 'admin', 'Peek Vision Admin')
         ON CONFLICT (email) DO NOTHING`,
        [email, await hashPassword(password)]
      );
      adminCreated = true;
    }
  }

  res.status(200).json({
    ok: true,
    schema: "applied",
    admin: existing ? "already exists" : adminCreated ? "created from env" : "not created (set ADMIN_EMAIL and ADMIN_PASSWORD)",
  });
}

export default route({ GET: setup, POST: setup });
