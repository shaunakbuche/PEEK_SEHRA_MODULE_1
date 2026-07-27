import { z } from "zod";

/**
 * Haroon's step 1: an initial completeness and consistency review of a
 * submitted SEHRA module. NOT a thematic analysis, feasibility assessment or
 * RAG rating — it only checks whether the module is complete, internally
 * consistent and ready for the synthesis stage.
 */
export const CompletenessSchema = z.object({
  overallFinding: z.string(), // e.g. "Largely complete" | "Partially complete" | "Needs substantial follow-up"
  overallSummary: z.string(),
  majorItems: z.array(
    z.object({
      location: z.string(), // section / component
      issue: z.string(),
      whyItMatters: z.string(),
      suggestedAction: z.string(),
    })
  ),
  consistencyChecks: z.object({
    summary: z.string(),
    reconciled: z.array(z.string()),
    notReconciled: z.array(z.string()),
  }),
  componentStatus: z.array(
    z.object({
      component: z.string(),
      status: z.string(), // Complete / largely complete / partially complete / needs attention
      notes: z.string(),
    })
  ),
  minorIssues: z.array(z.string()),
  bottomLine: z.object({
    summary: z.string(),
    priorityCorrections: z.array(z.string()),
  }),
});

export type CompletenessReview = z.infer<typeof CompletenessSchema>;
