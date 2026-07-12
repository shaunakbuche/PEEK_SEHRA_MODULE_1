import { describe, expect, it } from "vitest";
import { extractJson, buildAssessmentDigest } from "./reportSkill.js";

describe("extractJson", () => {
  it("parses a raw JSON object", () => {
    expect(extractJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    const text = "Here is the report:\n```json\n{\"a\": 1, \"b\": [1,2,3]}\n```\nDone.";
    expect(extractJson(text)).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it("parses JSON wrapped in a plain code fence (no json tag)", () => {
    const text = "```\n{\"ok\": true}\n```";
    expect(extractJson(text)).toEqual({ ok: true });
  });

  it("throws when no JSON object is present", () => {
    expect(() => extractJson("no braces here at all")).toThrow();
  });
});

describe("buildAssessmentDigest", () => {
  const org = { name: "Test School", country: "Kenya", region: "Nairobi" };

  it("includes the organization name and country in the header", () => {
    const digest = buildAssessmentDigest({}, org);
    expect(digest).toContain("Test School");
    expect(digest).toContain("Kenya");
  });

  it("lists all nine analysis themes at the end", () => {
    const digest = buildAssessmentDigest({}, org);
    expect(digest).toContain("Health Literacy");
    expect(digest).toContain("Social & Cultural Factors");
  });

  it("omits a subsection heading when none of its questions are answered", () => {
    const digest = buildAssessmentDigest({}, org);
    expect(digest).not.toContain("### c.1");
  });

  it("includes a subsection heading and the answer once a question in it is filled", () => {
    const digest = buildAssessmentDigest({ ctx_pop: "12345" }, org);
    expect(digest).toContain("### c.1");
    expect(digest).toContain("12345");
  });

  it("includes the assessor's chosen indicator level for a component when set", () => {
    const digest = buildAssessmentDigest({ c1__scale: "3" }, org);
    expect(digest).toContain("Good Possibilities");
  });
});
