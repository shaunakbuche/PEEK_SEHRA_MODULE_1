import { describe, expect, it } from "vitest";
import { ReportContentSchema } from "./reportTypes";

function validReport() {
  return {
    title: "SEHRA Scoping Module Report — Kenya",
    executiveSummary: "A short summary.",
    context: "Some context.",
    components: [
      { name: "Sectoral Legislation, Policy and Strategy", indicatorLevel: "Good Possibilities", findings: "Findings text.", challenges: ["A challenge"], supports: ["A support"] },
    ],
    themeAnalysis: [
      { theme: "Policy & Integration", assessment: "Assessment text.", evidence: ["Some evidence"] },
    ],
    feasibility: { verdict: "Feasible with conditions", rationale: "Because of X." },
    recommendations: ["Do this first."],
  };
}

describe("ReportContentSchema", () => {
  it("accepts a well-formed report", () => {
    const result = ReportContentSchema.safeParse(validReport());
    expect(result.success).toBe(true);
  });

  it("rejects a report missing a required field", () => {
    const bad = validReport();
    // @ts-expect-error intentionally deleting a required field for the test
    delete bad.feasibility;
    const result = ReportContentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects a component with the wrong shape", () => {
    const bad = validReport();
    bad.components = [{ name: "X" } as any];
    const result = ReportContentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects non-array recommendations", () => {
    const bad: any = validReport();
    bad.recommendations = "not an array";
    const result = ReportContentSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});
