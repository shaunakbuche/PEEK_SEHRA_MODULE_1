import { ASSESS, SCALE_KEY, keysForQuestions, type Component, type Question } from "@/data/sehra";

/**
 * The canonical SEHRA export (v1): the JSON the website hands to the analysis
 * skill running inside Claude Enterprise. It is deliberately self-describing —
 * question text, help text, allowed options and table headers travel with the
 * answers — so the skill never has to guess the content model, and a past
 * export can be replayed later for validation.
 *
 * Blanks are represented EXPLICITLY (blank: true, answer: null). The
 * completeness review depends on seeing what is missing, so nothing is dropped.
 *
 * Pure and dependency-free apart from the content model, so it can be unit
 * tested and run identically in the browser or in a script.
 */

export const SEHRA_EXPORT_VERSION = "1.0";
export const SEHRA_EXPORT_TOOL = "SEHRA Scoping Module (Module 1)";

export type SehraQuestionType = "yn" | "text" | "field" | "group" | "table" | "reflections";

export interface SehraExportGroupItem {
  label: string;
  answer: string | null;
}

export interface SehraExportTable {
  cols: string[];
  rows: string[];
  cells: (string | null)[][];
}

export interface SehraExportReflections {
  challenges: string[];
  supports: string[];
}

export interface SehraExportQuestion {
  id: string;
  type: SehraQuestionType;
  text: string;
  help: string | null;
  /** yn / text / field answers. Null for group, table and reflections. */
  answer: string | null;
  /** yn and group remarks. */
  remarks: string | null;
  /** True when the question carries no answer, remark, item, cell or reflection. */
  blank: boolean;
  options: string[] | null;
  items: SehraExportGroupItem[] | null;
  table: SehraExportTable | null;
  reflections: SehraExportReflections | null;
}

export interface SehraExportSubsection {
  id: string;
  title: string;
  themes: string[];
  questions: SehraExportQuestion[];
}

export interface SehraExportComponent {
  id: string;
  number: number | string;
  title: string;
  purpose: string;
  readinessRating: { value: number | null; label: string | null };
  subsections: SehraExportSubsection[];
}

export interface SehraExportCompletionComponent {
  id: string;
  title: string;
  total: number;
  answered: number;
  percent: number;
}

export interface SehraExportDocument {
  sehraExport: {
    version: string;
    exportedAt: string;
    tool: string;
    organisation: {
      name: string;
      country: string;
      region: string;
      district: string;
      assessmentDate: string;
    };
    assessment: {
      id: string;
      status: string;
      submittedAt: string | null;
      updatedAt: string | null;
    };
    completion: {
      totalFields: number;
      answeredFields: number;
      percent: number;
      byComponent: SehraExportCompletionComponent[];
    };
    components: SehraExportComponent[];
    summaryExtras: {
      sum_gaps: string | null;
      sum_groups: string | null;
      sum_unserved: string | null;
    };
    rawAnswers: Record<string, string>;
  };
}

export interface SehraExportOrg {
  name: string;
  country?: string | null;
  region?: string | null;
}

export interface SehraExportAssessment {
  id: string;
  status: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
}

/** The label shown for a reflections block, which carries no question text. */
const REFLECTIONS_TEXT = "Reflections and implications";

function reader(answers: Record<string, string>) {
  return (k: string) => {
    const v = answers[k];
    return v === undefined || v === null ? "" : String(v).trim();
  };
}

/** A single question serialised with its answers, or null for non-input blocks. */
function exportQuestion(q: Question, val: (k: string) => string): SehraExportQuestion | null {
  if (q.type === "note") return null;

  const base = {
    id: q.id,
    type: q.type,
    text: q.type === "reflections" ? REFLECTIONS_TEXT : q.text,
    help: ("help" in q && q.help) || null,
    answer: null as string | null,
    remarks: null as string | null,
    blank: true,
    options: null as string[] | null,
    items: null as SehraExportGroupItem[] | null,
    table: null as SehraExportTable | null,
    reflections: null as SehraExportReflections | null,
  };

  switch (q.type) {
    case "yn": {
      const answer = val(`${q.id}__yn`) || null;
      const remarks = val(`${q.id}__rem`) || null;
      return {
        ...base,
        answer,
        remarks,
        blank: !answer && !remarks,
        options: ["Yes", "No", ...(q.thirdOption ? [q.thirdOption] : []), ...(q.noOption ? [q.noOption] : [])],
      };
    }
    case "text":
    case "field": {
      const answer = val(q.id) || null;
      return { ...base, answer, blank: !answer };
    }
    case "group": {
      const items = q.items.map((label, i) => ({ label, answer: val(`${q.id}__${i}`) || null }));
      const remarks = val(`${q.id}__rem`) || null;
      return { ...base, remarks, items, blank: !remarks && items.every((it) => !it.answer) };
    }
    case "table": {
      const cells = q.rows.map((_, ri) => q.cols.map((__, ci) => val(`${q.id}__${ri}_${ci}`) || null));
      return {
        ...base,
        table: { cols: [...q.cols], rows: [...q.rows], cells },
        blank: cells.every((row) => row.every((c) => !c)),
      };
    }
    case "reflections": {
      const challenges = [0, 1, 2].map((i) => val(`${q.id}__challenge_${i}`)).filter(Boolean);
      const supports = [0, 1, 2].map((i) => val(`${q.id}__support_${i}`)).filter(Boolean);
      return {
        ...base,
        reflections: { challenges, supports },
        blank: !challenges.length && !supports.length,
      };
    }
    default:
      return null;
  }
}

/** Answered-field counts for one component, using the same keys as the school-side progress. */
function componentCompletion(comp: Component, val: (k: string) => string): SehraExportCompletionComponent {
  const keys = keysForQuestions(comp.subsections.flatMap((s) => s.questions));
  const answered = keys.filter((k) => val(k) !== "").length;
  return {
    id: comp.id,
    title: comp.title,
    total: keys.length,
    answered,
    percent: keys.length ? Math.round((answered / keys.length) * 100) : 0,
  };
}

/**
 * Build the canonical export document. `exportedAt` can be supplied so callers
 * and tests get a deterministic result; it defaults to now.
 */
export function buildSehraExport(
  answers: Record<string, string>,
  org: SehraExportOrg,
  assessment: SehraExportAssessment,
  opts: { exportedAt?: string } = {}
): SehraExportDocument {
  const val = reader(answers);

  const components: SehraExportComponent[] = ASSESS.map((comp) => {
    const scaleValue = Number(val(`${comp.id}__scale`)) || null;
    const scale = SCALE_KEY.find((s) => s.value === scaleValue);
    return {
      id: comp.id,
      number: comp.number,
      title: comp.title,
      purpose: comp.purpose,
      readinessRating: { value: scale ? scale.value : null, label: scale ? scale.label : null },
      subsections: comp.subsections.map((sub) => ({
        id: sub.id,
        title: sub.title,
        themes: sub.themes ? [...sub.themes] : [],
        questions: sub.questions
          .map((q) => exportQuestion(q, val))
          .filter((q): q is SehraExportQuestion => q !== null),
      })),
    };
  });

  const byComponent = ASSESS.map((comp) => componentCompletion(comp, val));
  const totalFields = byComponent.reduce((n, c) => n + c.total, 0);
  const answeredFields = byComponent.reduce((n, c) => n + c.answered, 0);

  return {
    sehraExport: {
      version: SEHRA_EXPORT_VERSION,
      exportedAt: opts.exportedAt ?? new Date().toISOString(),
      tool: SEHRA_EXPORT_TOOL,
      organisation: {
        name: org.name,
        country: val("meta_country") || org.country || "",
        region: val("meta_province") || org.region || "",
        district: val("meta_district"),
        assessmentDate: val("meta_date"),
      },
      assessment: {
        id: assessment.id,
        status: assessment.status,
        submittedAt: assessment.submittedAt ?? null,
        updatedAt: assessment.updatedAt ?? null,
      },
      completion: {
        totalFields,
        answeredFields,
        percent: totalFields ? Math.round((answeredFields / totalFields) * 100) : 0,
        byComponent,
      },
      components,
      summaryExtras: {
        sum_gaps: val("sum_gaps") || null,
        sum_groups: val("sum_groups") || null,
        sum_unserved: val("sum_unserved") || null,
      },
      rawAnswers: { ...answers },
    },
  };
}

/** sehra-export-<org-slug>-<yyyy-mm-dd>.json */
export function sehraExportFilename(doc: SehraExportDocument): string {
  const { organisation, exportedAt } = doc.sehraExport;
  const slug =
    organisation.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "assessment";
  const date = (exportedAt || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `sehra-export-${slug}-${date}.json`;
}

/** Trigger a browser download of the export. No-op outside a browser. */
export function downloadSehraExport(doc: SehraExportDocument, filename = sehraExportFilename(doc)): void {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return;
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
