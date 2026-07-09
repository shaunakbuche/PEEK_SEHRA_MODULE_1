import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "./http";

const COOKIE = "sehra_session";
const WEEK_S = 60 * 60 * 24 * 7;

export interface Session {
  uid: string;
  role: "school" | "admin";
  orgId: string | null;
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

export function getSession(req: VercelRequest): Session | null {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  try {
    const p = jwt.verify(token, secret()) as any;
    return { uid: p.uid, role: p.role, orgId: p.orgId ?? null };
  } catch {
    return null;
  }
}

export function requireAuth(req: VercelRequest, role?: "school" | "admin"): Session {
  const s = getSession(req);
  if (!s) throw new ApiError(401, "Not signed in");
  if (role && s.role !== role) throw new ApiError(403, "Not allowed");
  return s;
}
