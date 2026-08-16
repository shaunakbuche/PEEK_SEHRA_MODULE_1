import { ASSESS, SCALE_KEY, THEMES, type Question } from "../../src/data/sehra.js";
import { ReportContentSchema, normalizeReportContent, type ReportContent } from "../../src/lib/reportTypes.js";

/**
 * The "report-writer skill": the system prompt that turns a completed SEHRA
 * Module 1 assessment into a structured country report, plus the aggregation
 * that converts raw answers into a readable digest for the model.
 */

export const REPORT_MODEL = "claude-sonnet-4-6";

export const REPORT_SKILL_SYSTEM = `You are an expert public-health analyst producing the thematic synthesis and feasibility analysis of a completed School Eye Health Rapid Assessment (SEHRA) Scoping Module (Module 1) for Peek Vision.

Module 1 determines the FEASIBILITY of a school eye health programme in an intervention area by reviewing the policy, institutional/service-delivery, human-resources, supply-chain and barrier landscape. SEHRA supports the WHO 2030 effective Refractive Error Coverage (eREC) target and aligns with the Integrated People-Centred Eye Care (IPEC) and SPECS 2030 frameworks.

The initial completeness and consistency review has already been done. Your job is the thematic synthesis and feasibility analysis. Analyse the assessment as a whole, using ALL the content provided (answers, remarks, tables, reflections and summary items).

Before writing, note any data-quality issues, inconsistencies or unclear figures, but only surface them as a brief caveat and do not let the completeness review become the main output unless issues materially affect interpretation.

Analyse the findings by the five SEHRA components, in order:
1. Sectoral legislation, policy and strategy
2. Institutional and service delivery environment
3. Human resources
4. Supply chain
5. Barriers

For each component, determine: key enablers, key barriers, a cross-cutting summary (how the component interacts with the others and affects overall feasibility), and suggested action points.

Group the enablers, barriers and action points under CONTEXT-APPROPRIATE themes that you derive from the evidence in THIS assessment. Do not mechanically apply a fixed theme list. Examples of possible themes: policy-to-implementation translation, financing and financial protection, referral continuity, data systems, workforce capacity, supervision and quality assurance, supply-chain readiness, affordability, demand-side barriers, disability inclusion, community engagement — but use only the themes that genuinely fit.

Also assign a RAG feasibility rating to each component and to the assessment overall, using EXACTLY one of these five levels:
- "Green": High feasibility. Enabling environment largely in place; focus on optimisation and scale.
- "Amber/Green": Moderately high feasibility. Strong platform, but targeted mitigation needed before/during scale.
- "Amber": Moderate feasibility. Credible opportunities, but material gaps require active mitigation and monitoring.
- "Red/Amber": Mixed or fragile feasibility. Partial enabling environment, significant constraints remain (often supply, affordability, financing, HR or implementation systems).
- "Red": Low feasibility. Foundational gaps likely to prevent effective implementation without major investment or reform.
RAG ratings must be justified by the balance of enablers and barriers in the assessment.

Writing rules:
- Ground every claim in the answers provided. Never invent statistics, names or policies. Where claims are strong but evidence is thin, phrase conclusions cautiously.
- Be analytical and synthesising, not a question-by-question restatement. Distinguish policy-level, institutional, operational, workforce, supply-chain and demand-side issues.
- Draw out implications for programme strategy/planning (design, prioritisation, sequencing, institutionalisation, resourcing, risks, whether/how to proceed to pilot, scale-up or further assessment) AND for policy advocacy (policy, legislation, financing, benefit packages, budget lines, mandates, coordination, data systems, workforce recognition, disability inclusion, social protection, education-sector accountability; distinguish national vs sub-national vs institutional where relevant).
- Action points must be practical, prioritised and linked to the barriers/enablers identified. Avoid generic recommendations not supported by the evidence.
- Plain, professional public-health English. No em dashes. British spelling (programme, organisation).

Output contract: return ONLY a single JSON object, no markdown fences and no prose outside it, exactly matching:
{
  "title": string,
  "executiveSummary": string,          // 150-250 words
  "background": string,                // background and method
  "contextSnapshot": string,           // concise snapshot of the implementation area
  "dataQualityNote": string,           // brief caveats, or "" if none material
  "components": [                       // exactly one entry per component 1-5, in order
    {
      "name": string,
      "summary": string,
      "enablers": [ { "theme": string, "points": string[] } ],
      "barriers": [ { "theme": string, "points": string[] } ],
      "crossCutting": string,
      "actionPoints": [ { "theme": string, "points": string[] } ],
      "rag": string,                    // one of the five RAG levels above
      "ragSummary": string              // short feasibility summary for this component
    }
  ],
  "overall": {
    "feasibility": string,              // overall feasibility considerations
    "strategyImplications": string,
    "policyAdvocacy": string,
    "nextSteps": string,
    "rag": string,                      // overall RAG level
    "ragInterpretation": string         // overall RAG interpretation for the site
  },
  "topActions": string[]                // up to 10 priority actions across the whole SEHRA, most important first
}`;

function answersFor(q: Question, a: Record<string, string>): string[] {
  const out: string[] = [];
  const val = (k: string) => (a[k] ?? "").trim();
  switch (q.type) {
    case "yn": {
      const v = val(q.id + "__yn");
      const rem = val(q.id + "__rem");
      if (v || rem) out.push(`Q: ${q.text}\nA: ${v || "(no selection)"}${rem ? ` — Remarks: ${rem}` : ""}`);
      break;
    }
    case "text":
    case "field": {
      const v = val(q.id);
      if (v) out.push(`Q: ${q.text}\nA: ${v}`);
      break;
    }
    case "group": {
      const items = q.items
        .map((it, i) => ({ it, v: val(`${q.id}__${i}`) }))
        .filter((x) => x.v);
      const rem = val(q.id + "__rem");
      if (items.length || rem) {
        out.push(
          `Q: ${q.text}\n` +
            items.map((x) => `  - ${x.it}: ${x.v}`).join("\n") +
            (rem ? `\n  Remarks: ${rem}` : "")
        );
      }
      break;
    }
    case "table": {
      const cells: string[] = [];
      q.rows.forEach((r, ri) =>
        q.cols.forEach((c, ci) => {
          const v = val(`${q.id}__${ri}_${ci}`);
          if (v) cells.push(`  - ${r} / ${c}: ${v}`);
        })
      );
      if (cells.length) out.push(`Table: ${q.text}\n${cells.join("\n")}`);
      break;
    }
    case "reflections": {
      const ch = [0, 1, 2].map((i) => val(`${q.id}__challenge_${i}`)).filter(Boolean);
      const su = [0, 1, 2].map((i) => val(`${q.id}__support_${i}`)).filter(Boolean);
      if (ch.length) out.push(`Key challenges noted by the assessor:\n${ch.map((x) => `  - ${x}`).join("\n")}`);
      if (su.length) out.push(`Key supporting factors noted by the assessor:\n${su.map((x) => `  - ${x}`).join("\n")}`);
      break;
    }
  }
  return out;
}

/** Convert raw answers into a readable digest, grouped by component and tagged by theme. */
export function buildAssessmentDigest(answers: Record<string, string>, org: {
  name: string; country: string; region: string;
}): string {
  const val = (k: string) => (answers[k] ?? "").trim();
  const lines: string[] = [];

  lines.push(`# SEHRA Module 1 assessment — raw answers`);
  lines.push(
    `Organization: ${org.name}\nCountry: ${val("meta_country") || org.country}\nProvince/Region: ${
      val("meta_province") || org.region
    }\nDistrict: ${val("meta_district")}\nDate: ${val("meta_date")}`
  );

  for (const comp of ASSESS) {
    const label = comp.id === "context" ? "CONTEXT" : `COMPONENT ${comp.number}: ${comp.title}`;
    lines.push(`\n## ${label}`);
    lines.push(`Purpose: ${comp.purpose}`);

    const scaleV = Number(val(`${comp.id}__scale`)) || 0;
    const scale = SCALE_KEY.find((s) => s.value === scaleV);
    if (scale) lines.push(`Assessor's overall indicator for this component: ${scale.label}`);

    for (const sub of comp.subsections) {
      const qa = sub.questions.flatMap((qq) => answersFor(qq, answers));
      if (!qa.length) continue;
      const themeTag = sub.themes?.length ? ` [themes: ${sub.themes.join(", ")}]` : "";
      lines.push(`\n### ${sub.id} ${sub.title}${themeTag}`);
      lines.push(qa.join("\n"));
    }
  }

  const extras: [string, string][] = [
    ["sum_gaps", "Evidence gaps / open research questions"],
    ["sum_groups", "Parent-teacher associations and child/community groups"],
    ["sum_unserved", "Groups with no eye screening service"],
  ];
  const extraLines = extras.filter(([k]) => val(k)).map(([k, t]) => `- ${t}: ${val(k)}`);
  if (extraLines.length) lines.push(`\n## ADDITIONAL ITEMS\n${extraLines.join("\n")}`);

  lines.push(
    `\nThe section theme tags above (e.g. [themes: ...]) are only hints drawn from these recurring SEHRA themes: ${THEMES.join("; ")}. ` +
      `Derive your own context-appropriate themes from the evidence rather than mechanically applying this list.`
  );
  return lines.join("\n");
}

/**
 * Validate a report pasted back in from the analysis skill. Tolerates the
 * common near-misses (a `{ content }` or `{ report: { content } }` wrapper, a
 * JSON string, slightly off-shape fields) by coercing with
 * normalizeReportContent, and throws a message the admin can act on when the
 * payload is not a synthesis report at all.
 */
export function parseSkillReport(raw: unknown): ReportContent {
  let candidate: any = raw;

  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      throw new Error("That is not valid JSON. Paste the whole object the skill produced, starting with { and ending with }.");
    }
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Expected a JSON object containing the report. Paste the whole object the skill produced.");
  }
  if (candidate.sehraExport) {
    throw new Error("That is a SEHRA export (the assessment sent TO the skill), not a report. Paste the synthesis JSON the skill produced.");
  }
  if (candidate.report?.content) candidate = candidate.report.content;
  else if (candidate.content && !candidate.components) candidate = candidate.content;

  const content = normalizeReportContent(candidate);

  const missing: string[] = [];
  if (!content.title.trim()) missing.push("title");
  if (!content.executiveSummary.trim()) missing.push("executiveSummary");
  if (!content.components.length) missing.push("components");
  if (missing.length) {
    throw new Error(
      `The report JSON is missing: ${missing.join(", ")}. Paste the synthesis output, the object with title, executiveSummary, components and overall.`
    );
  }

  const unnamed = content.components.findIndex((c) => !c.name.trim());
  if (unnamed !== -1) {
    throw new Error(`Component ${unnamed + 1} has no "name". Every entry in components needs a name.`);
  }

  const parsed = ReportContentSchema.safeParse(content);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".") || "the report";
    throw new Error(`The report JSON does not match the expected shape (${where}: ${issue?.message ?? "invalid"}).`);
  }
  return parsed.data;
}

/** Extract the JSON object from a model response, tolerating stray fences. */
export function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "```").trim();
  const fenced = cleaned.match(/```([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : cleaned;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON");
  return JSON.parse(candidate.slice(start, end + 1));
}
