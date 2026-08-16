import { describe, expect, it } from "vitest";
import { extractJson, buildAssessmentDigest, parseSkillReport } from "./reportSkill.js";

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

describe("parseSkillReport", () => {
  const skillReport = () => ({
    title: "SEHRA Module 1 — Example District",
    executiveSummary: "A short summary of feasibility.",
    background: "Background and method.",
    contextSnapshot: "Context.",
    dataQualityNote: "",
    components: [
      {
        name: "Sectoral Legislation, Policy and Strategy",
        summary: "Component summary.",
        enablers: [{ theme: "Policy", points: ["An enabler"] }],
        barriers: [{ theme: "Financing", points: ["A barrier"] }],
        crossCutting: "Interactions.",
        actionPoints: [{ theme: "Financing", points: ["Do this"] }],
        rag: "Amber/Green",
        ragSummary: "Moderately high.",
      },
    ],
    overall: {
      feasibility: "Feasible with mitigation.",
      strategyImplications: "Strategy.",
      policyAdvocacy: "Advocacy.",
      nextSteps: "Next steps.",
      rag: "Amber",
      ragInterpretation: "Interpretation.",
    },
    topActions: ["Do this first."],
  });

  it("accepts a well-formed skill report", () => {
    const out = parseSkillReport(skillReport());
    expect(out.title).toBe("SEHRA Module 1 — Example District");
    expect(out.components).toHaveLength(1);
    expect(out.overall.rag).toBe("Amber");
  });

  it("accepts the report as a JSON string", () => {
    expect(parseSkillReport(JSON.stringify(skillReport())).title).toBe("SEHRA Module 1 — Example District");
  });

  it("unwraps a { content } or { report: { content } } envelope", () => {
    expect(parseSkillReport({ content: skillReport() }).title).toBe("SEHRA Module 1 — Example District");
    expect(parseSkillReport({ report: { content: skillReport() } }).title).toBe("SEHRA Module 1 — Example District");
  });

  it("fills safe defaults for optional fields the skill left out", () => {
    const partial: any = skillReport();
    delete partial.dataQualityNote;
    delete partial.background;
    const out = parseSkillReport(partial);
    expect(out.dataQualityNote).toBe("");
    expect(out.background).toBe("");
  });

  it("normalises an odd RAG value rather than failing", () => {
    const odd: any = skillReport();
    odd.overall.rag = "amber/green";
    expect(parseSkillReport(odd).overall.rag).toBe("Amber/Green");
  });

  it("rejects a SEHRA export pasted in by mistake", () => {
    expect(() => parseSkillReport({ sehraExport: { version: "1.0" } })).toThrow(/not a report/i);
  });

  it("rejects a non-object payload", () => {
    expect(() => parseSkillReport([1, 2, 3])).toThrow(/JSON object/i);
    expect(() => parseSkillReport("not json at all")).toThrow(/not valid JSON/i);
    expect(() => parseSkillReport(null)).toThrow(/JSON object/i);
  });

  it("names the fields that are missing", () => {
    const bad: any = skillReport();
    bad.title = "";
    bad.components = [];
    expect(() => parseSkillReport(bad)).toThrow(/title, components/);
  });

  it("points at a component that has no name", () => {
    const bad: any = skillReport();
    bad.components[0].name = "";
    expect(() => parseSkillReport(bad)).toThrow(/Component 1 has no "name"/);
  });
});
