import { describe, it, expect } from "vitest";
import { ASSESS, keysForQuestions } from "../../src/data/sehra.js";
import { buildExtractionSlots, normalizeExtraction, serializeSlots } from "./extractSkill.js";

describe("buildExtractionSlots", () => {
  const slots = buildExtractionSlots();

  it("produces a non-trivial catalogue", () => {
    expect(slots.length).toBeGreaterThan(100);
  });

  it("targets real answer-store keys", () => {
    // Every slot key, apart from remarks (__rem) and the meta/summary extras,
    // must be a key the school app actually reads and writes. If this drifts,
    // applied suggestions would silently land on fields that do not exist.
    const real = new Set(
      ASSESS.flatMap((c) => keysForQuestions(c.subsections.flatMap((s) => s.questions)))
    );
    const orphans = slots
      .map((s) => s.key)
      .filter((k) => !k.endsWith("__rem") && !k.startsWith("meta_") && !k.startsWith("sum_"))
      .filter((k) => !real.has(k));
    expect(orphans).toEqual([]);
  });

  it("gives every choice slot a set of allowed options", () => {
    for (const s of slots) {
      if (s.kind === "choice") expect(s.options && s.options.length).toBeTruthy();
    }
  });

  it("serialises without throwing and includes keys", () => {
    const text = serializeSlots(slots);
    expect(text).toContain("meta_country");
    expect(text).toContain("choice:");
  });
});

describe("normalizeExtraction", () => {
  const slots = buildExtractionSlots();

  it("keeps valid text answers and drops unknown keys", () => {
    const out = normalizeExtraction(
      { answers: { meta_country: "Kenya", not_a_real_key: "x" } },
      slots
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ key: "meta_country", value: "Kenya" });
  });

  it("drops empty and whitespace-only values", () => {
    const out = normalizeExtraction({ answers: { meta_country: "  ", meta_district: "" } }, slots);
    expect(out).toEqual([]);
  });

  it("coerces choice values case-insensitively to an allowed option", () => {
    const ynKey = slots.find((s) => s.kind === "choice" && s.options?.includes("Yes"))!.key;
    const out = normalizeExtraction({ answers: { [ynKey]: "yes" } }, slots);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe("Yes");
  });

  it("rejects a choice value that is not an allowed option", () => {
    const ynKey = slots.find((s) => s.kind === "choice" && s.options?.includes("Yes"))!.key;
    const out = normalizeExtraction({ answers: { [ynKey]: "maybe" } }, slots);
    expect(out).toEqual([]);
  });

  it("accepts a bare answer map without the { answers } wrapper", () => {
    const out = normalizeExtraction({ meta_country: "Nepal" }, slots);
    expect(out).toHaveLength(1);
    expect(out[0].value).toBe("Nepal");
  });

  it("returns nothing for junk input", () => {
    expect(normalizeExtraction(null, slots)).toEqual([]);
    expect(normalizeExtraction("nope", slots)).toEqual([]);
    expect(normalizeExtraction({ answers: null }, slots)).toEqual([]);
  });
});
