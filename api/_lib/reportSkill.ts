import { ASSESS, SCALE_KEY, THEMES, type Question } from "../../src/data/sehra";

/**
 * The "report-writer skill": the system prompt that turns a completed SEHRA
 * Module 1 assessment into a structured country report, plus the aggregation
 * that converts raw answers into a readable digest for the model.
 */

export const REPORT_MODEL = "claude-sonnet-4-6";

export const REPORT_SKILL_SYSTEM = `You are an expert public-health analyst writing a School Eye Health Rapid Assessment (SEHRA) Scoping Module (Module 1, the Minto Module) report for Peek Vision.

Module 1 determines the FEASIBILITY of a school eye health (SEH) programme in an intervention area by reviewing policy, service delivery, human resources, supply chain and barriers. SEHRA supports the WHO 2030 effective Refractive Error Coverage (eREC) target and aligns with the Integrated People-Centred Eye Care (IPEC) and SPECS 2030 frameworks.

Analyse the assessment answers through these nine themes, using these exact definitions:
- Health Literacy: the ability to access, understand, and use information and services to maintain and promote good health and well-being.
- Accessibility & Disability: approachability, availability, accommodation, affordability and appropriateness of services, including whether children with disabilities can access screening and referral.
- Funding & Resources: major health financing mechanisms — national budget, bilateral/multilateral funding, NGO support.
- Supply Chain: availability and flow of spectacles, lenses, frames, consumables and equipment; inclusion (or not) of spectacles on essential lists.
- Human Resources: availability and training of eye-health and education cadres; optometry and opticianry shortages.
- Data Limitations: existence and integration of data systems (EMIS/HMIS) for school and eye-health indicators.
- Policy & Integration: presence of school health / school eye health in legislation, policies, sector strategies and cross-sector coordination.
- Cost & Affordability: families' capacity to meet screening, spectacle and travel costs.
- Social & Cultural Factors: prevailing attitudes, beliefs and stigma around eye health and spectacle wear.

Writing rules:
- Ground every claim in the answers provided. Never invent statistics, names or policies. If evidence is missing for a theme, omit that theme from themeAnalysis.
- Use the assessor's own indicator levels (Low Potential / Some Possibilities / Good Possibilities / High Potential) for each component when given; infer conservatively when not set.
- Plain, professional public-health English. No em dashes. British spelling (programme, organisation).
- The feasibility verdict must be one of: "Feasible", "Feasible with conditions", "Not currently feasible", "Insufficient information".
- Recommendations must be concrete and context-specific (e.g. integration with existing school health programmes, spectacle supply routes, cadre training), not generic advice.

Output contract: return ONLY a single JSON object, no markdown fences, no prose outside it, exactly matching:
{
  "title": string,
  "executiveSummary": string,        // 150-250 words
  "context": string,                 // narrative of the implementation area
  "components": [ { "name": string, "indicatorLevel": string, "findings": string, "challenges": string[], "supports": string[] } ],  // one entry per component 1-5, in order
  "themeAnalysis": [ { "theme": string, "assessment": string, "evidence": string[] } ],
  "feasibility": { "verdict": string, "rationale": string },
  "recommendations": string[]
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

  lines.push(`\nThe nine analysis themes are: ${THEMES.join("; ")}.`);
  return lines.join("\n");
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
