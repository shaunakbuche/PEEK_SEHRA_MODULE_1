import { ASSESS, COMPONENTS, CONTEXT, SCALE_KEY, THEMES, keysForQuestions } from "../../src/data/sehra.js";
import type { ReportContent } from "../../src/lib/reportTypes.js";

/**
 * Builds a full SEHRA report directly from the assessor's own answers, with
 * no AI call. Every field is assembled mechanically from what the school
 * already wrote (their indicator ratings, their reflections notes, their
 * context data) so it works with no API key. Peek reviews and edits it in
 * the same editor as an AI-drafted report before publishing either way.
 */
export function buildTemplateReport(
  answers: Record<string, string>,
  org: { name: string; country: string; region: string }
): ReportContent {
  const val = (k: string) => (answers[k] ?? "").trim();

  const scaleLabel = (compId: string) => {
    const v = Number(val(`${compId}__scale`)) || 0;
    return SCALE_KEY.find((s) => s.value === v)?.label ?? "Not set";
  };

  // Completion, for the executive summary.
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
    `This report summarises the SEHRA Scoping Module (Module 1) assessment completed by ${org.name}` +
    `${country ? ` in ${country}` : ""}${region ? `, ${region}` : ""}. ` +
    `${pct}% of the assessment's ${totalKeys} questions were answered (${doneKeys} of ${totalKeys}). ` +
    `The findings below are assembled directly from the assessor's own answers, indicator ratings and reflections notes, ` +
    `for the Peek team to review, refine and approve before publishing.`;

  const contextParts: string[] = [];
  const pop = val("ctx_pop");
  if (pop) contextParts.push(`Total population: ${pop}.`);
  const ethnic = val("ctx_ethnic");
  if (ethnic) contextParts.push(`Primary ethnic groups: ${ethnic}.`);
  const hasSeh = val("ctx_seh_prog__yn");
  if (hasSeh) contextParts.push(`Standalone school eye health programme already running: ${hasSeh}.`);
  const context = contextParts.length
    ? contextParts.join(" ")
    : "No context summary fields were filled in. See the full assessment answers for details on the implementation area.";

  const components = COMPONENTS.map((comp) => {
    const keys = keysForQuestions(comp.subsections.flatMap((s) => s.questions));
    const done = keys.filter((k) => val(k)).length;
    const challenges = [0, 1, 2].map((i) => val(`${comp.id}__challenge_${i}`)).filter(Boolean);
    const supports = [0, 1, 2].map((i) => val(`${comp.id}__support_${i}`)).filter(Boolean);
    return {
      name: comp.title,
      indicatorLevel: scaleLabel(comp.id),
      findings: keys.length
        ? `${done} of ${keys.length} questions in this component were answered. Indicator set by the assessor: ${scaleLabel(comp.id)}.`
        : "No questions were answered in this component.",
      challenges: challenges.length ? challenges : ["No challenges were noted by the assessor for this component."],
      supports: supports.length ? supports : ["No supporting factors were noted by the assessor for this component."],
    };
  });

  const themeAnalysis = THEMES.map((theme) => {
    const evidence: string[] = [];
    for (const comp of ASSESS) {
      for (const sub of comp.subsections) {
        if (!sub.themes?.includes(theme)) continue;
        const keys = keysForQuestions(sub.questions);
        if (keys.some((k) => val(k))) {
          evidence.push(`${comp.id === "context" ? "Context" : `Component ${comp.number}`}, ${sub.id} ${sub.title}`);
        }
      }
    }
    return {
      theme,
      assessment: evidence.length
        ? `Answered in ${evidence.length} relevant section${evidence.length === 1 ? "" : "s"}. See the listed sections in the full assessment for detail.`
        : "No sections tagged with this theme were answered.",
      evidence,
    };
  }).filter((t) => t.evidence.length > 0);

  const scaleValues = COMPONENTS.map((c) => Number(val(`${c.id}__scale`)) || 0).filter((v) => v > 0);
  const avgScale = scaleValues.length ? scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length : 0;
  const verdict =
    scaleValues.length === 0
      ? "Insufficient information"
      : avgScale >= 3
        ? "Feasible"
        : avgScale >= 2
          ? "Feasible with conditions"
          : "Not currently feasible";
  const rationale =
    scaleValues.length === 0
      ? "None of the five components have an indicator rating set yet. Peek should review the full assessment and set a verdict manually."
      : `Based on the assessor's own indicator ratings across ${scaleValues.length} of 5 components (average ${avgScale.toFixed(1)} of 4). This is a mechanical starting point, not a judgement call. Peek should confirm or adjust it after reviewing the full assessment.`;

  const recommendations = COMPONENTS.flatMap((comp) =>
    [0, 1, 2].map((i) => val(`${comp.id}__challenge_${i}`)).filter(Boolean).map((c) => `Address: ${c}`)
  );

  return {
    title: `SEHRA Scoping Module Report — ${org.name}${country ? `, ${country}` : ""}`,
    executiveSummary,
    context,
    components,
    themeAnalysis,
    feasibility: { verdict, rationale },
    recommendations: recommendations.length ? recommendations : ["No specific recommendations were generated. Add recommendations based on your review of the full assessment."],
  };
}
