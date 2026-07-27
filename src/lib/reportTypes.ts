import { z } from "zod";

/**
 * The structured SEHRA analysis produced by the AI (or the no-key template) and
 * edited/approved by Peek. It carries BOTH of Haroon's required outputs in one
 * record: a detailed themed synthesis report, and a concise RAG feasibility
 * dashboard. Enablers, barriers and action points are grouped under
 * context-appropriate themes derived from the evidence.
 */

export const RAG_LEVELS = ["Green", "Amber/Green", "Amber", "Red/Amber", "Red"] as const;
export type RagLevel = (typeof RAG_LEVELS)[number];

/** Haroon's fixed RAG legend, shown verbatim on the dashboard. */
export const RAG_LEGEND: { level: RagLevel; description: string }[] = [
  { level: "Green", description: "High feasibility. Enabling environment is largely in place; focus is on optimisation and scale." },
  { level: "Amber/Green", description: "Moderately high feasibility. Strong enabling platform exists, but targeted mitigation is needed before or during scale." },
  { level: "Amber", description: "Moderate feasibility. Credible opportunities exist, but material gaps require active mitigation and monitoring." },
  { level: "Red/Amber", description: "Mixed or fragile feasibility. Partial enabling environment exists, but significant constraints remain, usually in supply, affordability, financing, HR or implementation systems." },
  { level: "Red", description: "Low feasibility. Foundational gaps are likely to prevent effective implementation without major investment or reform." },
];

const ThemeGroupSchema = z.object({
  theme: z.string(),
  points: z.array(z.string()),
});
export type ThemeGroup = z.infer<typeof ThemeGroupSchema>;

export const ReportComponentSchema = z.object({
  name: z.string(),
  summary: z.string(),
  enablers: z.array(ThemeGroupSchema),
  barriers: z.array(ThemeGroupSchema),
  crossCutting: z.string(),
  actionPoints: z.array(ThemeGroupSchema),
  rag: z.string(), // one of RAG_LEVELS; kept as string so an odd value never breaks parsing
  ragSummary: z.string(),
});
export type ReportComponent = z.infer<typeof ReportComponentSchema>;

export const ReportContentSchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  background: z.string(),
  contextSnapshot: z.string(),
  dataQualityNote: z.string(), // "" when there is nothing material to flag
  components: z.array(ReportComponentSchema),
  overall: z.object({
    feasibility: z.string(),
    strategyImplications: z.string(),
    policyAdvocacy: z.string(),
    nextSteps: z.string(),
    rag: z.string(),
    ragInterpretation: z.string(),
  }),
  topActions: z.array(z.string()),
});

export type ReportContent = z.infer<typeof ReportContentSchema>;

export interface ReportRecord {
  id: string;
  status: "generated" | "edited" | "approved";
  content: ReportContent;
  pdfUrl?: string | null;
  docxUrl?: string | null;
  approvedAt?: string | null;
}

/** Normalise any string onto a valid RAG level (defaults to Amber). */
export function toRag(v: string | undefined | null): RagLevel {
  const hit = RAG_LEVELS.find((l) => l.toLowerCase() === String(v ?? "").trim().toLowerCase());
  return hit ?? "Amber";
}

function indicatorToRag(level: string | undefined): RagLevel {
  switch (String(level ?? "").trim()) {
    case "High Potential": return "Green";
    case "Good Possibilities": return "Amber/Green";
    case "Some Possibilities": return "Red/Amber";
    case "Low Potential": return "Red";
    default: return "Amber";
  }
}

/**
 * Coerce any stored report content — including reports saved under the earlier
 * schema (context / findings / indicatorLevel / themeAnalysis / feasibility /
 * recommendations) — into the current synthesis + RAG shape, filling safe
 * defaults so rendering and editing never crash. Idempotent for new content.
 */
export function normalizeReportContent(raw: any): ReportContent {
  const c = raw ?? {};
  const str = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const strArr = (v: any) => (Array.isArray(v) ? v.map(str) : []);
  const groups = (v: any): ThemeGroup[] =>
    Array.isArray(v)
      ? v.map((g) => ({ theme: str(g?.theme), points: strArr(g?.points) }))
      : [];
  const groupsOrLegacy = (v: any, legacy: any, legacyTheme: string): ThemeGroup[] => {
    const g = groups(v);
    if (g.length) return g;
    const pts = strArr(legacy);
    return pts.length ? [{ theme: legacyTheme, points: pts }] : [];
  };

  return {
    title: str(c.title),
    executiveSummary: str(c.executiveSummary),
    background: str(c.background),
    contextSnapshot: str(c.contextSnapshot || c.context),
    dataQualityNote: str(c.dataQualityNote),
    components: Array.isArray(c.components)
      ? c.components.map((comp: any) => ({
          name: str(comp?.name),
          summary: str(comp?.summary || comp?.findings),
          enablers: groupsOrLegacy(comp?.enablers, comp?.supports, "Supporting factors"),
          barriers: groupsOrLegacy(comp?.barriers, comp?.challenges, "Challenges"),
          crossCutting: str(comp?.crossCutting),
          actionPoints: groups(comp?.actionPoints),
          rag: comp?.rag ? toRag(comp.rag) : indicatorToRag(comp?.indicatorLevel),
          ragSummary: str(comp?.ragSummary),
        }))
      : [],
    overall: {
      feasibility: str(c.overall?.feasibility || c.feasibility?.rationale),
      strategyImplications: str(c.overall?.strategyImplications),
      policyAdvocacy: str(c.overall?.policyAdvocacy),
      nextSteps: str(c.overall?.nextSteps),
      rag: toRag(c.overall?.rag),
      ragInterpretation: str(c.overall?.ragInterpretation || c.feasibility?.verdict),
    },
    topActions: strArr(c.topActions).length ? strArr(c.topActions) : strArr(c.recommendations),
  };
}
