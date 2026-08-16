import { ASSESS, SCALE_KEY, type Question } from "../../src/data/sehra.js";
import {
  CompletenessSchema,
  normalizeCompletenessReview,
  type CompletenessReview,
} from "../../src/lib/completenessTypes.js";
import { extractJson } from "./reportSkill.js";

/**
 * The "completeness-reviewer skill": Haroon's step 1. Turns a submitted SEHRA
 * module into an initial completeness and consistency review. Unlike the report
 * digest, this digest deliberately INCLUDES blank fields and full tables, so the
 * model can judge whether blanks are genuine gaps or conditional (Yes/No logic),
 * and can perform the arithmetic and cross-section consistency checks.
 */

export const COMPLETENESS_MODEL = "claude-sonnet-4-6";

export const COMPLETENESS_SYSTEM = `You are a careful public-health reviewer performing an INITIAL COMPLETENESS AND CONSISTENCY REVIEW of a submitted SEHRA Scoping Module (Module 1) for Peek Vision.

This is completeness and consistency only. It is NOT a thematic analysis, feasibility assessment, RAG rating or programme synthesis. Do not analyse enablers, barriers or recommendations, and do not provide RAG ratings.

The module has a Context section, five components (1 Sectoral legislation/policy/strategy, 2 Institutional and service delivery environment, 3 Human resources, 4 Supply chain, 5 Barriers), reflections/implications per component, and a final summary/additional-items section.

Some fields are intentionally blank because of Yes/No logic (a follow-up only applies if the answer was Yes, or vice versa). Do NOT treat every blank as incomplete: judge whether a blank looks appropriate/conditional or a genuine gap needing follow-up.

Check:
- Overall completeness: is Context sufficiently completed; is each component substantively addressed; do Yes/No questions have remarks where remarks are expected; are reflections and the final summary completed; are blanks genuine gaps or conditional.
- Fields needing attention: blank, incomplete, unclear, truncated or placeholder fields; distinguish major gaps from minor/acceptable blanks; flag remarks that should be completed because the Yes/No answer needs explanation.
- Internal consistency (arithmetic): check totals/subtotals, age-group data, school counts, enrolment, attendance rates, cadre totals, facility totals, and any budget/financing figures. Check whether values entered as counts may actually be rates or vice versa. Check whether totals reconcile with component values and whether the same figure is consistent across sections.
- Logical consistency: whether Yes/No answers align with their remarks; flag contradictions (e.g. marked "Yes" but remarks describe absence or non-functionality); check that insurance/benefit-package statements are harmonised (distinguish consultation/treatment cover from spectacles/low-vision/assistive-device cover); check that standalone-programme responses distinguish government-funded vs partner/NGO/pilot/outreach/integrated activities.
- Minor editing/formatting: spelling, terminology, formatting, truncation, readability.

Tone: practical and constructive. The aim is to help the submitting team correct or clarify the module before synthesis. Do not over-interpret. British English spelling. No em dashes.

Output contract: return ONLY a single JSON object, no markdown fences and no prose outside it, matching:
{
  "overallFinding": string,          // "Largely complete" | "Partially complete" | "Needs substantial follow-up"
  "overallSummary": string,
  "majorItems": [ { "location": string, "issue": string, "whyItMatters": string, "suggestedAction": string } ],
  "consistencyChecks": { "summary": string, "reconciled": string[], "notReconciled": string[] },
  "componentStatus": [ { "component": string, "status": string, "notes": string } ],   // one per component 1-5
  "minorIssues": string[],
  "bottomLine": { "summary": string, "priorityCorrections": string[] }
}`;

const BLANK = "[blank]";

function lineFor(q: Question, a: Record<string, string>): string[] {
  const val = (k: string) => (a[k] ?? "").trim();
  const out: string[] = [];
  switch (q.type) {
    case "yn": {
      const v = val(q.id + "__yn");
      const rem = val(q.id + "__rem");
      out.push(`Q: ${q.text}\n  Answer: ${v || BLANK}${v ? ` | Remarks: ${rem || BLANK}` : ""}`);
      break;
    }
    case "text":
    case "field":
      out.push(`Q: ${q.text}\n  Answer: ${val(q.id) || BLANK}`);
      break;
    case "group": {
      const items = q.items.map((it, i) => `${it}: ${val(`${q.id}__${i}`) || BLANK}`);
      const rem = val(q.id + "__rem");
      out.push(`Checklist: ${q.text}\n  ${items.join("; ")}${rem ? `\n  Remarks: ${rem}` : ""}`);
      break;
    }
    case "table": {
      const cells: string[] = [];
      q.rows.forEach((r, ri) => q.cols.forEach((c, ci) => cells.push(`${r} / ${c}: ${val(`${q.id}__${ri}_${ci}`) || BLANK}`)));
      out.push(`Table: ${q.text}\n  ${cells.join("; ")}`);
      break;
    }
    case "reflections": {
      const ch = [0, 1, 2].map((i) => val(`${q.id}__challenge_${i}`)).filter(Boolean);
      const su = [0, 1, 2].map((i) => val(`${q.id}__support_${i}`)).filter(Boolean);
      out.push(`Reflections — challenges: ${ch.length ? ch.join("; ") : BLANK}; supporting factors: ${su.length ? su.join("; ") : BLANK}`);
      break;
    }
  }
  return out;
}

/** Digest for the completeness review: every field, blanks included. */
export function buildCompletenessDigest(answers: Record<string, string>, org: {
  name: string; country: string; region: string;
}): string {
  const val = (k: string) => (answers[k] ?? "").trim();
  const lines: string[] = [];
  lines.push(`# SEHRA Module 1 — submitted answers for completeness review`);
  lines.push(
    `Organization: ${org.name}\nCountry: ${val("meta_country") || org.country}\nProvince/Region: ${val("meta_province") || org.region}\nDistrict: ${val("meta_district") || BLANK}\nDate: ${val("meta_date") || BLANK}`
  );

  for (const comp of ASSESS) {
    const label = comp.id === "context" ? "CONTEXT" : `COMPONENT ${comp.number}: ${comp.title}`;
    lines.push(`\n## ${label}`);
    const scaleV = Number(val(`${comp.id}__scale`)) || 0;
    const scale = SCALE_KEY.find((sk) => sk.value === scaleV);
    if (comp.id !== "context") lines.push(`Assessor readiness rating: ${scale ? scale.label : BLANK}`);
    for (const sub of comp.subsections) {
      lines.push(`\n### ${sub.id} ${sub.title}`);
      for (const q of sub.questions) lineFor(q, answers).forEach((l) => lines.push(l));
    }
  }

  const extras: [string, string][] = [
    ["sum_gaps", "Evidence gaps / open questions"],
    ["sum_groups", "Parent-teacher and child/community groups"],
    ["sum_unserved", "Groups with no eye screening service"],
  ];
  lines.push(`\n## FINAL SUMMARY / ADDITIONAL ITEMS`);
  extras.forEach(([k, t]) => lines.push(`${t}: ${val(k) || BLANK}`));

  return lines.join("\n");
}

/**
 * Validate a completeness review pasted back in from the analysis skill. Step 1
 * normally runs inside Claude Enterprise, so the review arrives as text copied
 * out of a chat: sometimes the bare object, sometimes a JSON string, often
 * inside a markdown fence or with a sentence either side. extractJson is reused
 * so a paste is tolerated exactly as far as a model response is. The shape is
 * then coerced with normalizeCompletenessReview, and anything that is not a
 * review at all throws a message the school or admin can act on.
 */
export function parseSkillCompleteness(raw: unknown): CompletenessReview {
  let candidate: any = raw;

  if (typeof candidate === "string") {
    if (!candidate.trim()) {
      throw new Error("Nothing was pasted. Copy the completeness review JSON from the skill and paste it here.");
    }
    try {
      candidate = extractJson(candidate);
    } catch {
      throw new Error(
        "That is not valid JSON. Paste the whole object the skill produced, starting with { and ending with }. A markdown code fence or a sentence either side is fine."
      );
    }
  }
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("Expected a JSON object containing the completeness review. Paste the whole object the skill produced.");
  }
  if (candidate.sehraExport) {
    throw new Error(
      "That is a SEHRA export (the assessment sent TO the skill), not a completeness review. Paste the review JSON the skill produced."
    );
  }

  const inner =
    candidate.review ?? candidate.completenessReview ?? (candidate.overallFinding ? null : candidate.content);
  if (inner && typeof inner === "object" && !Array.isArray(inner)) candidate = inner;

  if (!candidate.overallFinding && (candidate.executiveSummary || candidate.topActions)) {
    throw new Error(
      "That is the step 2 synthesis report, not the step 1 completeness review. Paste the completeness review JSON instead."
    );
  }

  const review = normalizeCompletenessReview(candidate);

  const missing: string[] = [];
  if (!review.overallFinding.trim()) missing.push("overallFinding");
  if (!review.overallSummary.trim()) missing.push("overallSummary");
  if (!review.componentStatus.length) missing.push("componentStatus");
  if (missing.length) {
    throw new Error(
      `The completeness review JSON is missing: ${missing.join(", ")}. Paste the review output, the object with overallFinding, overallSummary, componentStatus and bottomLine.`
    );
  }

  const unnamed = review.componentStatus.findIndex((c) => !c.component.trim());
  if (unnamed !== -1) {
    throw new Error(
      `Entry ${unnamed + 1} of componentStatus has no "component". Every entry needs the component it refers to.`
    );
  }

  const parsed = CompletenessSchema.safeParse(review);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".") || "the review";
    throw new Error(`The completeness review JSON does not match the expected shape (${where}: ${issue?.message ?? "invalid"}).`);
  }
  return parsed.data;
}
