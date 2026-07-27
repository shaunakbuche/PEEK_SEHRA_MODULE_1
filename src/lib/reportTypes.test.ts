import { describe, expect, it } from "vitest";
import { ReportContentSchema, toRag, normalizeReportContent } from "./reportTypes";

function validReport() {
  return {
    title: "SEHRA Scoping Module — Kenya",
    executiveSummary: "A short summary.",
    background: "Background and method.",
    contextSnapshot: "Some context.",
    dataQualityNote: "",
    components: [
      {
        name: "Sectoral Legislation, Policy and Strategy",
        summary: "Component summary.",
        enablers: [{ theme: "Policy-to-implementation", points: ["An enabler"] }],
        barriers: [{ theme: "Financing", points: ["A barrier"] }],
        crossCutting: "How it interacts with the rest.",
        actionPoints: [{ theme: "Financing", points: ["Do this"] }],
        rag: "Amber/Green",
        ragSummary: "Moderately high for this component.",
      },
    ],
    overall: {
      feasibility: "Overall feasibility.",
      strategyImplications: "Strategy.",
      policyAdvocacy: "Advocacy.",
      nextSteps: "Next steps.",
      rag: "Amber",
      ragInterpretation: "Overall interpretation.",
    },
    topActions: ["Do this first."],
  };
}

describe("ReportContentSchema", () => {
  it("accepts a well-formed report", () => {
    expect(ReportContentSchema.safeParse(validReport()).success).toBe(true);
  });

  it("rejects a report missing a required field", () => {
    const bad = validReport();
    // @ts-expect-error intentionally deleting a required field for the test
    delete bad.overall;
    expect(ReportContentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a component with the wrong shape", () => {
    const bad = validReport();
    bad.components = [{ name: "X" } as any];
    expect(ReportContentSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects non-array topActions", () => {
    const bad: any = validReport();
    bad.topActions = "not an array";
    expect(ReportContentSchema.safeParse(bad).success).toBe(false);
  });
});

describe("normalizeReportContent", () => {
  it("upgrades an old-schema report into the new shape without throwing", () => {
    const old = {
      title: "Old report",
      executiveSummary: "Summary",
      context: "Old context field",
      components: [
        { name: "Policy", indicatorLevel: "Good Possibilities", findings: "Old findings", challenges: ["a barrier"], supports: ["an enabler"] },
      ],
      themeAnalysis: [{ theme: "Policy", assessment: "x", evidence: ["e"] }],
      feasibility: { verdict: "Feasible with conditions", rationale: "because" },
      recommendations: ["do this"],
    };
    const n = normalizeReportContent(old);
    // Valid against the new schema
    expect(ReportContentSchema.safeParse(n).success).toBe(true);
    // Legacy fields mapped across
    expect(n.contextSnapshot).toBe("Old context field");
    expect(n.components[0].summary).toBe("Old findings");
    expect(n.components[0].rag).toBe("Amber/Green"); // Good Possibilities -> Amber/Green
    expect(n.components[0].barriers[0].points).toEqual(["a barrier"]);
    expect(n.components[0].enablers[0].points).toEqual(["an enabler"]);
    expect(n.overall.feasibility).toBe("because");
    expect(n.topActions).toEqual(["do this"]);
  });

  it("handles null / empty input safely", () => {
    expect(ReportContentSchema.safeParse(normalizeReportContent(null)).success).toBe(true);
    expect(normalizeReportContent(undefined).components).toEqual([]);
  });

  it("is idempotent for already-new content", () => {
    const n1 = normalizeReportContent(validReport());
    const n2 = normalizeReportContent(n1);
    expect(n2).toEqual(n1);
  });
});

describe("toRag", () => {
  it("normalises known levels case-insensitively", () => {
    expect(toRag("green")).toBe("Green");
    expect(toRag("Red/Amber")).toBe("Red/Amber");
  });
  it("defaults unknown values to Amber", () => {
    expect(toRag("banana")).toBe("Amber");
    expect(toRag("")).toBe("Amber");
    expect(toRag(undefined)).toBe("Amber");
  });
});
