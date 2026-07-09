import { z } from "zod";

/** The structured SEHRA report produced by the AI and edited/approved by Peek. */
export const ReportContentSchema = z.object({
  title: z.string(),
  executiveSummary: z.string(),
  context: z.string(),
  components: z.array(
    z.object({
      name: z.string(),
      indicatorLevel: z.string(),
      findings: z.string(),
      challenges: z.array(z.string()),
      supports: z.array(z.string()),
    })
  ),
  themeAnalysis: z.array(
    z.object({
      theme: z.string(),
      assessment: z.string(),
      evidence: z.array(z.string()),
    })
  ),
  feasibility: z.object({
    verdict: z.string(),
    rationale: z.string(),
  }),
  recommendations: z.array(z.string()),
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

export const INDICATOR_LEVELS = [
  "Low Potential",
  "Some Possibilities",
  "Good Possibilities",
  "High Potential",
] as const;
