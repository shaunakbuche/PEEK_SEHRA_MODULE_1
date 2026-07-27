import { ASSESS, COMPONENTS, SCALE_KEY, keysForQuestions } from "../../src/data/sehra.js";
import type { ReportContent } from "../../src/lib/reportTypes.js";

/**
 * Builds a SEHRA analysis directly from the assessor's own answers, with no AI
 * call, in the same shape the AI synthesis produces. Every field is assembled
 * mechanically from what the school wrote (their readiness ratings, reflections
 * and context data), so the tool still works with no API key. Peek reviews and
 * edits it in the same editor before publishing either way. It is intentionally
 * a scaffold, not an analysis: the connective, interpretive writing and the
 * evidence-derived themes only come from the AI synthesis.
 */

/** Map the assessor's 1-4 readiness scale onto a RAG level. */
function scaleToRag(v: number): string {
  return v === 4 ? "Green" : v === 3 ? "Amber/Green" : v === 2 ? "Red/Amber" : v === 1 ? "Red" : "Amber";
}

export function buildTemplateReport(
  answers: Record<string, string>,
  org: { name: string; country: string; region: string }
): ReportContent {
  const val = (k: string) => (answers[k] ?? "").trim();
  const scaleVal = (compId: string) => Number(val(`${compId}__scale`)) || 0;
  const scaleLabel = (compId: string) =>
    SCALE_KEY.find((s) => s.value === scaleVal(compId))?.label ?? "Not set";

  // Completion, for the executive summary and data-quality note.
  let totalKeys = 0, doneKeys = 0;
  for (const comp of ASSESS) {
    const keys = keysForQuestions(comp.subsections.flatMap((s) => s.questions));
    totalKeys += keys.length;
    doneKeys += keys.filter((k) => val(k)).length;
  }
  const pct = totalKeys ? Math.round((doneKeys / totalKeys) * 100) : 0;

  const country = val("meta_country") || org.country;
  const region = val("meta_province") || org.region;

  const executiveSummary =
    `This document assembles the SEHRA Scoping Module (Module 1) assessment completed by ${org.name}` +
    `${country ? ` in ${country}` : ""}${region ? `, ${region}` : ""} into the analysis structure. ` +
    `${pct}% of the assessment's ${totalKeys} fields were completed (${doneKeys} of ${totalKeys}). ` +
    `It was produced without AI, directly from the assessor's own answers, readiness ratings and reflections, ` +
    `as a starting scaffold for the Peek team to develop into a full thematic synthesis before publishing.`;

  const background =
    `SEHRA Module 1 scopes the policy, institutional, service-delivery, human-resource, supply-chain and barrier ` +
    `landscape to judge the feasibility of a school eye health programme. This draft was generated from the ` +
    `submitted answers using the built-in template (no AI). Peek should replace the component and overall sections ` +
    `with an evidence-based synthesis once reviewed.`;

  const ctx: string[] = [];
  if (val("ctx_pop")) ctx.push(`Total population: ${val("ctx_pop")}.`);
  if (val("ctx_ethnic")) ctx.push(`Primary ethnic groups: ${val("ctx_ethnic")}.`);
  if (val("ctx_seh_prog__yn")) ctx.push(`Standalone school eye health programme already running: ${val("ctx_seh_prog__yn")}.`);
  const contextSnapshot = ctx.length
    ? ctx.join(" ")
    : "No context summary fields were filled in. See the full assessment answers for the implementation area.";

  const dataQualityNote =
    pct < 100
      ? `${totalKeys - doneKeys} of ${totalKeys} fields were left blank (${100 - pct}%). Some blanks may be intentional (conditional on a Yes/No answer); others may be genuine gaps. Confirm completeness before relying on this analysis.`
      : "";

  const components = COMPONENTS.map((comp) => {
    const keys = keysForQuestions(comp.subsections.flatMap((s) => s.questions));
    const done = keys.filter((k) => val(k)).length;
    const challenges = [0, 1, 2].map((i) => val(`${comp.id}__challenge_${i}`)).filter(Boolean);
    const supports = [0, 1, 2].map((i) => val(`${comp.id}__support_${i}`)).filter(Boolean);
    return {
      name: comp.title,
      summary:
        `${done} of ${keys.length} fields in this component were answered. ` +
        `The assessor's readiness rating was: ${scaleLabel(comp.id)}. ` +
        `Replace this with a synthesis of what the answers mean for feasibility.`,
      enablers: supports.length
        ? [{ theme: "Assessor-noted supporting factors", points: supports }]
        : [],
      barriers: challenges.length
        ? [{ theme: "Assessor-noted challenges", points: challenges }]
        : [],
      crossCutting: "",
      actionPoints: challenges.length
        ? [{ theme: "Suggested follow-up", points: challenges.map((c) => `Address: ${c}`) }]
        : [],
      rag: scaleToRag(scaleVal(comp.id)),
      ragSummary: `Derived from the assessor's readiness rating (${scaleLabel(comp.id)}). Confirm after review.`,
    };
  });

  const scaleValues = COMPONENTS.map((c) => scaleVal(c.id)).filter((v) => v > 0);
  const avg = scaleValues.length ? scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length : 0;
  const overallRag = scaleToRag(Math.round(avg));

  const topActions = COMPONENTS.flatMap((comp) =>
    [0, 1, 2].map((i) => val(`${comp.id}__challenge_${i}`)).filter(Boolean).map((c) => `Address: ${c}`)
  ).slice(0, 10);

  return {
    title: `SEHRA Scoping Module — ${org.name}${country ? `, ${country}` : ""}`,
    executiveSummary,
    background,
    contextSnapshot,
    dataQualityNote,
    components,
    overall: {
      feasibility: scaleValues.length
        ? `Based on the assessor's readiness ratings across ${scaleValues.length} of 5 components (average ${avg.toFixed(1)} of 4). This is a mechanical starting point, not a judgement; Peek should confirm after reviewing the evidence.`
        : "No readiness ratings were set. Peek should review the full assessment and set the feasibility position manually.",
      strategyImplications: "To be completed by Peek: what the findings mean for programme design, prioritisation, sequencing, resourcing and whether to proceed to pilot, scale-up or further assessment.",
      policyAdvocacy: "To be completed by Peek: where the findings point to policy, legislation, financing, benefit-package, coordination or data-system changes, and at which level (national, sub-national, institutional).",
      nextSteps: "To be completed by Peek: the recommended sequence of next steps for the partner and Peek.",
      rag: overallRag,
      ragInterpretation: scaleValues.length
        ? `Overall RAG derived mechanically from the assessor's readiness ratings. Confirm against the evidence.`
        : "No readiness ratings set; overall RAG defaults to Amber pending Peek's review.",
    },
    topActions,
  };
}
