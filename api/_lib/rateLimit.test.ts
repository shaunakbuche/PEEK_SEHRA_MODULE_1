import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, recordFailure, clearFailures } from "./rateLimit.js";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not block a key with no recorded failures", () => {
    expect(checkRateLimit("fresh-key").blocked).toBe(false);
  });

  it("does not block before the failure threshold is reached", () => {
    const key = "under-threshold";
    for (let i = 0; i < 4; i++) recordFailure(key);
    expect(checkRateLimit(key).blocked).toBe(false);
  });

  it("blocks once the failure threshold is reached, and reports a retry time", () => {
    const key = "over-threshold";
    for (let i = 0; i < 5; i++) recordFailure(key);
    const result = checkRateLimit(key);
    expect(result.blocked).toBe(true);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it("clearFailures immediately unblocks a locked key", () => {
    const key = "clears";
    for (let i = 0; i < 5; i++) recordFailure(key);
    expect(checkRateLimit(key).blocked).toBe(true);
    clearFailures(key);
    expect(checkRateLimit(key).blocked).toBe(false);
  });

  it("unblocks automatically once the lock duration has passed", () => {
    const key = "expires";
    for (let i = 0; i < 5; i++) recordFailure(key);
    expect(checkRateLimit(key).blocked).toBe(true);
    vi.advanceTimersByTime(16 * 60 * 1000); // past the 15 minute lock
    expect(checkRateLimit(key).blocked).toBe(false);
  });

  it("tracks separate keys independently", () => {
    for (let i = 0; i < 5; i++) recordFailure("attacker@example.com");
    expect(checkRateLimit("attacker@example.com").blocked).toBe(true);
    expect(checkRateLimit("innocent@example.com").blocked).toBe(false);
  });
});
