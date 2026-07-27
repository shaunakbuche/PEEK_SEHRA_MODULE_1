import { describe, it, expect } from "vitest";
import { renderReportPdf } from "./pdf.js";
import { renderReportDocx } from "./docxGen.js";
import { buildTemplateReport } from "./reportTemplate.js";
import { normalizeReportContent } from "../../src/lib/reportTypes.js";

const meta = { org: "Test School", country: "Testland" };

// A full new-schema report.
const sample = buildTemplateReport(
  { meta_country: "Testland", ctx_pop: "500000", c1__scale: "3", c1__challenge_0: "Weak financing", c1__support_0: "Strong policy" },
  { name: "Test School", country: "Testland", region: "Test Region" }
);

describe("report renderers run on the new synthesis + RAG schema", () => {
  it("renders a PDF without throwing", async () => {
    const buf = await renderReportPdf(sample, meta);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders a DOCX without throwing", async () => {
    const buf = await renderReportDocx(sample, meta);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("renders an OLD-schema report (via the normalizer) without throwing", async () => {
    const old: any = {
      title: "Old", executiveSummary: "s", context: "ctx",
      components: [{ name: "Policy", indicatorLevel: "Good Possibilities", findings: "f", challenges: ["c"], supports: ["s"] }],
      themeAnalysis: [{ theme: "T", assessment: "a", evidence: ["e"] }],
      feasibility: { verdict: "Feasible", rationale: "r" },
      recommendations: ["do x"],
    };
    const normalized = normalizeReportContent(old);
    const [pdf, docx] = await Promise.all([renderReportPdf(normalized, meta), renderReportDocx(normalized, meta)]);
    expect(pdf.length).toBeGreaterThan(1000);
    expect(docx.length).toBeGreaterThan(1000);
  });
});
