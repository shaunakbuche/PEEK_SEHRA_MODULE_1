import type { VercelRequest } from "@vercel/node";

/**
 * Naive in-memory rate limiter, scoped per serverless instance. Not a
 * substitute for a shared store, but real defense-in-depth against casual
 * brute-forcing without adding another service to the stack.
 */
interface Bucket { failures: number; firstFailureAt: number; lockedUntil?: number; }
const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60 * 1000;

export function checkRateLimit(key: string): { blocked: boolean; retryAfterSec?: number } {
  const b = buckets.get(key);
  if (!b) return { blocked: false };
  const now = Date.now();
  if (b.lockedUntil && b.lockedUntil > now) {
    return { blocked: true, retryAfterSec: Math.ceil((b.lockedUntil - now) / 1000) };
  }
  if (now - b.firstFailureAt > WINDOW_MS) {
    buckets.delete(key);
    return { blocked: false };
  }
  return { blocked: false };
}

export function recordFailure(key: string) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.firstFailureAt > WINDOW_MS) {
    buckets.set(key, { failures: 1, firstFailureAt: now });
    return;
  }
  b.failures++;
  if (b.failures >= MAX_FAILURES) b.lockedUntil = now + LOCK_MS;
}

export function clearFailures(key: string) {
  buckets.delete(key);
}

export function clientIp(req: VercelRequest): string {
  const fwd = (req.headers["x-forwarded-for"] as string) || "";
  return fwd.split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}
