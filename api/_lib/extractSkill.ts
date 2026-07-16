import { ASSESS, type Question } from "../../src/data/sehra.js";

/**
 * The "document-reader skill": turns a document a school already has (a school
 * report, policy PDF, situational analysis, spreadsheet export, etc.) into a
 * set of suggested answers for the SEHRA Module 1 assessment.
 *
 * The model is given a flat catalogue of every fillable slot (its exact answer
 * key + a plain-English description) and asked to return ONLY the keys it can
 * ground in the document. Everything it cannot find is simply omitted, so
 * unanswered questions stay blank for the school to complete by hand.
 */

export const EXTRACT_MODEL = "claude-sonnet-4-6";

export type SlotKind = "text" | "choice";

export interface ExtractSlot {
  key: string; // the exact answer-store key the school app reads/writes
  label: string; // human description shown in the review list
  section: string; // component / subsection heading, for grouping the review UI
  kind: SlotKind;
  options?: string[]; // allowed values when kind === "choice"
}

/** Build the catalogue of every slot the AI is allowed to fill. */
export function buildExtractionSlots(): ExtractSlot[] {
  const slots: ExtractSlot[] = [];

  // Assessment-level metadata.
  const meta: [string, string][] = [
    ["meta_country", "Country"],
    ["meta_province", "Province or governorate"],
    ["meta_district", "District or county"],
    ["meta_date", "Date of assessment"],
  ];
  meta.forEach(([key, label]) =>
    slots.push({ key, label, section: "Context · Location", kind: "text" })
  );

  for (const comp of ASSESS) {
    const compLabel = comp.id === "context" ? "Context" : `Component ${comp.number}: ${comp.title}`;
    for (const sub of comp.subsections) {
      const section = `${compLabel} — ${sub.title}`;
      for (const q of sub.questions) slotsForQuestion(q, section, slots);
    }
  }

  // Summary free-text extras (rendered on the Summary page).
  const extras: [string, string][] = [
    ["sum_gaps", "Gaps in the evidence or open questions to look into"],
    ["sum_groups", "Notes on parent-teacher associations and child/community groups"],
    ["sum_unserved", "Groups with no eye-screening service (e.g. street children) and rough numbers"],
  ];
  extras.forEach(([key, label]) => slots.push({ key, label, section: "Summary", kind: "text" }));

  return slots;
}

function slotsForQuestion(q: Question, section: string, out: ExtractSlot[]) {
  switch (q.type) {
    case "yn": {
      const options = ["Yes", "No"];
      if (q.thirdOption) options.push(q.thirdOption);
      if (q.noOption) options.push(q.noOption);
      out.push({ key: `${q.id}__yn`, label: q.text, section, kind: "choice", options });
      out.push({ key: `${q.id}__rem`, label: `Supporting detail / remarks for: ${q.text}`, section, kind: "text" });
      break;
    }
    case "text":
    case "field":
      out.push({ key: q.id, label: q.text, section, kind: "text" });
      break;
    case "group": {
      q.items.forEach((it, i) =>
        out.push({
          key: `${q.id}__${i}`,
          label: `${q.text} → ${it}`,
          section,
          kind: "choice",
          options: ["Yes", "No"],
        })
      );
      out.push({ key: `${q.id}__rem`, label: `Remarks for: ${q.text}`, section, kind: "text" });
      break;
    }
    case "table": {
      const singleRow = q.rows.length === 1;
      q.rows.forEach((r, ri) =>
        q.cols.forEach((c, ci) => {
          const label = singleRow ? `${q.text} → ${c}` : `${q.text} → ${r} / ${c}`;
          out.push({ key: `${q.id}__${ri}_${ci}`, label, section, kind: "text" });
        })
      );
      break;
    }
    // "note" and "reflections" are the assessor's own commentary, not something
    // that lives inside a source document, so they are left out of extraction.
  }
}

export const EXTRACT_SYSTEM = `You are a careful public-health data-entry assistant for Peek Vision. A school or programme team has uploaded a document they already have (for example a school report, situational analysis, policy paper, census extract or spreadsheet). Your job is to pull out only the facts that answer specific questions in the SEHRA Module 1 scoping assessment.

You will be given a CATALOGUE of answer slots. Each line is:
  <key> | <kind> | <description>
where <kind> is either "text" (free text) or a list of allowed choices like "choice: Yes | No".

Rules, in order of importance:
1. Only fill a slot when the document clearly and directly supports it. If you are unsure, or the document does not mention it, OMIT the slot entirely. Blank is the correct, safe answer.
2. NEVER invent, infer beyond the text, or use outside knowledge. Do not guess numbers, names, dates or policies. Every value must be traceable to the document.
3. For "choice" slots, the value must be EXACTLY one of the allowed choices, copied verbatim.
4. For "text" slots, keep the value concise and factual, quoting or closely paraphrasing the document. Use British spelling and no em dashes.
5. Use the exact <key> strings from the catalogue. Do not create keys that are not listed.
6. It is completely fine — and expected — to return only a handful of slots. Coverage is not the goal; accuracy is.

Output contract: return ONLY a single JSON object, no markdown fences and no prose, of the form:
{ "answers": { "<key>": "<value>", ... } }
Return { "answers": {} } if the document supports nothing.`;

/** Serialise the slot catalogue into the compact form the prompt expects. */
export function serializeSlots(slots: ExtractSlot[]): string {
  const bySection = new Map<string, ExtractSlot[]>();
  for (const s of slots) {
    const arr = bySection.get(s.section) ?? [];
    arr.push(s);
    bySection.set(s.section, arr);
  }
  const lines: string[] = [];
  for (const [section, arr] of bySection) {
    lines.push(`\n## ${section}`);
    for (const s of arr) {
      const kind = s.kind === "choice" ? `choice: ${s.options!.join(" | ")}` : "text";
      lines.push(`${s.key} | ${kind} | ${s.label}`);
    }
  }
  return lines.join("\n");
}

export interface Suggestion {
  key: string;
  value: string;
  label: string;
  section: string;
}

/**
 * Validate the model's raw answer map against the known catalogue: drop unknown
 * keys and empty values, and coerce "choice" values onto an allowed option
 * (case-insensitive). Anything that cannot be validated is discarded.
 */
export function normalizeExtraction(raw: unknown, slots: ExtractSlot[]): Suggestion[] {
  const answers =
    raw && typeof raw === "object" && "answers" in (raw as any)
      ? (raw as any).answers
      : raw;
  if (!answers || typeof answers !== "object") return [];

  const byKey = new Map(slots.map((s) => [s.key, s]));
  const out: Suggestion[] = [];

  for (const [key, rawVal] of Object.entries(answers as Record<string, unknown>)) {
    const slot = byKey.get(key);
    if (!slot) continue;
    if (rawVal == null) continue;
    let value = String(rawVal).trim();
    if (!value) continue;

    if (slot.kind === "choice") {
      const match = slot.options!.find((o) => o.toLowerCase() === value.toLowerCase());
      if (!match) continue; // reject anything not in the allowed set
      value = match;
    }

    out.push({ key, value, label: slot.label, section: slot.section });
  }
  return out;
}
