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

/**
 * Coerce a review into the shape above, filling safe defaults so the near
 * misses a pasted review tends to carry (a missing array, a number where a
 * string belongs, a dropped optional field) render instead of failing.
 * Idempotent for a well-formed review.
 */
export function normalizeCompletenessReview(raw: any): CompletenessReview {
  const c = raw ?? {};
  const str = (v: any) => (typeof v === "string" ? v : v == null ? "" : String(v));
  /** Blank entries are dropped: they would render as empty bullets. */
  const strArr = (v: any) => (Array.isArray(v) ? v.map(str).filter((s) => s.trim()) : []);

  return {
    overallFinding: str(c.overallFinding),
    overallSummary: str(c.overallSummary),
    majorItems: Array.isArray(c.majorItems)
      ? c.majorItems.map((m: any) => ({
          location: str(m?.location),
          issue: str(m?.issue),
          whyItMatters: str(m?.whyItMatters),
          suggestedAction: str(m?.suggestedAction),
        }))
      : [],
    consistencyChecks: {
      summary: str(c.consistencyChecks?.summary),
      reconciled: strArr(c.consistencyChecks?.reconciled),
      notReconciled: strArr(c.consistencyChecks?.notReconciled),
    },
    componentStatus: Array.isArray(c.componentStatus)
      ? c.componentStatus.map((s: any) => ({
          component: str(s?.component),
          status: str(s?.status),
          notes: str(s?.notes),
        }))
      : [],
    minorIssues: strArr(c.minorIssues),
    bottomLine: {
      summary: str(c.bottomLine?.summary),
      priorityCorrections: strArr(c.bottomLine?.priorityCorrections),
    },
  };
}
