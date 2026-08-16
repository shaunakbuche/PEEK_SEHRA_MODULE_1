import { describe, expect, it } from "vitest";
import { buildCompletenessDigest, parseSkillCompleteness } from "./completenessSkill.js";

describe("buildCompletenessDigest", () => {
  const org = { name: "Test School", country: "Kenya", region: "Nairobi" };

  it("keeps blank fields visible so the reviewer can judge the gaps", () => {
    const digest = buildCompletenessDigest({}, org);
    expect(digest).toContain("[blank]");
    expect(digest).toContain("Test School");
  });

  it("shows an answered field instead of the blank marker", () => {
    const digest = buildCompletenessDigest({ ctx_pop: "12345" }, org);
    expect(digest).toContain("12345");
  });
});

describe("parseSkillCompleteness", () => {
  const skillReview = () => ({
    overallFinding: "Partially complete",
    overallSummary: "Context and Components 1 and 2 are substantively complete.",
    majorItems: [
      {
        location: "Component 4, 4.4 Costing of eyeglasses",
        issue: "Public and private prices appear transposed.",
        whyItMatters: "Affordability analysis depends on these figures.",
        suggestedAction: "Confirm both figures and the currency used.",
      },
    ],
    consistencyChecks: {
      summary: "Most Context figures reconcile.",
      reconciled: ["Age-group counts sit within the stated total population."],
      notReconciled: ["Public enrolment male plus female does not match the Public / Total cell."],
    },
    componentStatus: [
      { component: "1 Sectoral Legislation, Policy and Strategy", status: "Largely complete", notes: "No remarks on the budget-line question." },
      { component: "5 Barriers", status: "Complete", notes: "Checklists and reflections are both completed." },
    ],
    minorIssues: ['"optomotrist" is misspelled in 3.1 remarks.'],
    bottomLine: {
      summary: "The module is usable once the supply-chain costing is corrected.",
      priorityCorrections: ["Confirm the spectacle prices in 4.4 and state the currency."],
    },
  });

  it("accepts a well-formed review object", () => {
    const out = parseSkillCompleteness(skillReview());
    expect(out.overallFinding).toBe("Partially complete");
    expect(out.componentStatus).toHaveLength(2);
    expect(out.majorItems[0].location).toContain("Component 4");
  });

  it("accepts the review as a JSON string", () => {
    expect(parseSkillCompleteness(JSON.stringify(skillReview())).overallFinding).toBe("Partially complete");
  });

  it("accepts a review inside a markdown code fence", () => {
    const text = "```json\n" + JSON.stringify(skillReview()) + "\n```";
    expect(parseSkillCompleteness(text).overallFinding).toBe("Partially complete");
  });

  it("accepts a review with prose either side of it", () => {
    const text =
      "Here is the completeness review as JSON:\n" +
      JSON.stringify(skillReview()) +
      "\nLet me know if you would like it as Markdown as well.";
    expect(parseSkillCompleteness(text).overallSummary).toContain("substantively complete");
  });

  it("accepts a review that is both fenced and wrapped in prose", () => {
    const text =
      "Certainly. The review is below.\n\n```json\n" +
      JSON.stringify(skillReview(), null, 2) +
      "\n```\n\nThe two figures in 4.4 are the priority.";
    expect(parseSkillCompleteness(text).bottomLine.priorityCorrections).toHaveLength(1);
  });

  it("unwraps a { review } or { content } envelope", () => {
    expect(parseSkillCompleteness({ review: skillReview() }).overallFinding).toBe("Partially complete");
    expect(parseSkillCompleteness({ content: skillReview() }).overallFinding).toBe("Partially complete");
  });

  it("fills safe defaults for optional parts the skill left out", () => {
    const partial: any = skillReview();
    delete partial.majorItems;
    delete partial.minorIssues;
    delete partial.consistencyChecks;
    const out = parseSkillCompleteness(partial);
    expect(out.majorItems).toEqual([]);
    expect(out.minorIssues).toEqual([]);
    expect(out.consistencyChecks).toEqual({ summary: "", reconciled: [], notReconciled: [] });
  });

  it("coerces non-string values rather than failing", () => {
    const odd: any = skillReview();
    odd.componentStatus[0].status = 3;
    odd.minorIssues = ["A real issue", ""];
    const out = parseSkillCompleteness(odd);
    expect(out.componentStatus[0].status).toBe("3");
    expect(out.minorIssues).toEqual(["A real issue"]);
  });

  it("rejects a SEHRA export pasted in by mistake", () => {
    expect(() => parseSkillCompleteness({ sehraExport: { version: "1.0" } })).toThrow(
      /SEHRA export .*not a completeness review/i
    );
  });

  it("rejects a SEHRA export pasted as a JSON string", () => {
    const doc = JSON.stringify({
      sehraExport: { version: "1.0", tool: "SEHRA Scoping Module (Module 1)", rawAnswers: { ctx_pop: "12345" } },
    });
    expect(() => parseSkillCompleteness(doc)).toThrow(/SEHRA export .*not a completeness review/i);
  });

  it("rejects the step 2 synthesis report pasted in by mistake", () => {
    const report = { title: "SEHRA Module 1", executiveSummary: "A summary.", components: [], topActions: [] };
    expect(() => parseSkillCompleteness(report)).toThrow(/synthesis report/i);
  });

  it("rejects junk", () => {
    expect(() => parseSkillCompleteness("not json at all")).toThrow(/not valid JSON/i);
    expect(() => parseSkillCompleteness("{ nope: not json }")).toThrow(/not valid JSON/i);
    expect(() => parseSkillCompleteness("   ")).toThrow(/Nothing was pasted/i);
    expect(() => parseSkillCompleteness([1, 2, 3])).toThrow(/JSON object/i);
    expect(() => parseSkillCompleteness(null)).toThrow(/JSON object/i);
  });

  it("names the fields that are missing", () => {
    const bad: any = skillReview();
    bad.overallFinding = "";
    bad.componentStatus = [];
    expect(() => parseSkillCompleteness(bad)).toThrow(/overallFinding, componentStatus/);
  });

  it("points at a componentStatus entry with no component name", () => {
    const bad: any = skillReview();
    bad.componentStatus[1].component = "";
    expect(() => parseSkillCompleteness(bad)).toThrow(/Entry 2 of componentStatus has no "component"/);
  });
});
