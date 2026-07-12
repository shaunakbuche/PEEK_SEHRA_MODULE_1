import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "./http.js";
import { qOne } from "./db.js";

const COOKIE = "sehra_session";
const WEEK_S = 60 * 60 * 24 * 7;

export interface Session {
  uid: string;
  role: "school" | "admin";
  orgId: string | null;
  tv: number;
}

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new ApiError(500, "JWT_SECRET is not set. Add it in Vercel environment variables.");
  return s;
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

export function setSession(res: VercelResponse, session: Session) {
  const token = jwt.sign(session, secret(), { expiresIn: WEEK_S });
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${WEEK_S}`
  );
}

export function clearSession(res: VercelResponse) {
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

function readCookie(req: VercelRequest, name: string): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

/** Decodes the session cookie without touching the database (fast path, used for the /api/me read). */
export function getSession(req: VercelRequest): Session | null {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  try {
    const p = jwt.verify(token, secret()) as any;
    return { uid: p.uid, role: p.role, orgId: p.orgId ?? null, tv: p.tv ?? 0 };
  } catch {
    return null;
  }
}

/**
 * Full auth check for protected routes: decodes the cookie, then confirms the
 * token's version still matches the user's current token_version in the
 * database. A password change bumps token_version, which immediately
 * invalidates any other outstanding sessions for that account.
 */
export async function requireAuth(req: VercelRequest, role?: "school" | "admin"): Promise<Session> {
  const s = getSession(req);
  if (!s) throw new ApiError(401, "Not signed in");
  if (role && s.role !== role) throw new ApiError(403, "Not allowed");

  const row = await qOne<{ token_version: number }>(`SELECT token_version FROM users WHERE id = $1`, [s.uid]);
  if (!row || row.token_version !== s.tv) {
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  return s;
}
