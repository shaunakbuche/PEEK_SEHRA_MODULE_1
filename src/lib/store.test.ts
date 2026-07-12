import { beforeEach, describe, expect, it } from "vitest";
import { CONTEXT, keysForQuestions } from "@/data/sehra";
import { getField, setField, filled, completionPct, subStatus, hydrate } from "./store";

describe("store", () => {
  beforeEach(() => {
    hydrate({});
  });

  it("filled() treats missing and whitespace-only values as blank", () => {
    expect(filled("nonexistent_key")).toBe(false);
    setField("some_key", "   ");
    expect(filled("some_key")).toBe(false);
    setField("some_key", "yes");
    expect(filled("some_key")).toBe(true);
  });

  it("getField returns an empty string for unset keys and the stored value otherwise", () => {
    expect(getField("missing")).toBe("");
    setField("missing", "hello");
    expect(getField("missing")).toBe("hello");
  });

  it("completionPct is 0 right after hydrating an empty answer set", () => {
    expect(completionPct()).toBe(0);
  });

  it("completionPct increases once a meaningful share of questions are filled, and never exceeds 100", () => {
    const before = completionPct();
    // A single answer can legitimately round to 0% against the full assessment
    // (hundreds of keys), so fill every key in one whole component instead.
    const allContextKeys = CONTEXT.subsections.flatMap((s) => keysForQuestions(s.questions));
    for (const k of allContextKeys) setField(k, "answer");
    const after = completionPct();
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThanOrEqual(100);
  });

  it("subStatus reports none, partial then complete as a real subsection's keys are filled", () => {
    const sub = CONTEXT.subsections[0];
    const keys = keysForQuestions(sub.questions);
    expect(keys.length).toBeGreaterThan(1);

    expect(subStatus(sub.questions).state).toBe("");

    setField(keys[0], "some answer");
    expect(subStatus(sub.questions).state).toBe("partial");

    for (const k of keys) setField(k, "filled");
    const done = subStatus(sub.questions);
    expect(done.state).toBe("complete");
    expect(done.done).toBe(done.total);
  });
});
