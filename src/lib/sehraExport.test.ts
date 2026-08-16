import { afterEach, describe, expect, it, vi } from "vitest";
import { ASSESS, keysForQuestions } from "@/data/sehra";
import {
  SEHRA_EXPORT_TOOL,
  SEHRA_EXPORT_VERSION,
  buildSehraExport,
  downloadSehraExport,
  sehraExportFilename,
  type SehraExportQuestion,
} from "./sehraExport";

const ORG = { name: "Makueni County", country: "Kenya", region: "Eastern" };
const ASSESSMENT = {
  id: "11111111-2222-3333-4444-555555555555",
  status: "submitted",
  submittedAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-02T09:00:00.000Z",
};
const AT = "2026-03-03T12:00:00.000Z";

function build(answers: Record<string, string> = {}) {
  return buildSehraExport(answers, ORG, ASSESSMENT, { exportedAt: AT }).sehraExport;
}

/** Find a serialised question anywhere in the export by its id. */
function findQ(x: ReturnType<typeof build>, id: string): SehraExportQuestion {
  const hit = x.components
    .flatMap((c) => c.subsections)
    .flatMap((s) => s.questions)
    .find((q) => q.id === id);
  if (!hit) throw new Error(`question ${id} not in export`);
  return hit;
}

describe("buildSehraExport / contract shape", () => {
  it("wraps everything under sehraExport with the v1 envelope", () => {
    const doc = buildSehraExport({}, ORG, ASSESSMENT, { exportedAt: AT });
    expect(Object.keys(doc)).toEqual(["sehraExport"]);
    expect(doc.sehraExport.version).toBe(SEHRA_EXPORT_VERSION);
    expect(doc.sehraExport.version).toBe("1.0");
    expect(doc.sehraExport.tool).toBe(SEHRA_EXPORT_TOOL);
    expect(doc.sehraExport.exportedAt).toBe(AT);
  });

  it("carries the top-level keys the skill consumes", () => {
    expect(Object.keys(build()).sort()).toEqual(
      ["assessment", "completion", "components", "exportedAt", "organisation", "rawAnswers", "summaryExtras", "tool", "version"]
    );
  });

  it("exports the context section plus components 1 to 5, in order", () => {
    const x = build();
    expect(x.components.map((c) => c.id)).toEqual(["context", "c1", "c2", "c3", "c4", "c5"]);
    expect(x.components.map((c) => c.number)).toEqual(["C", 1, 2, 3, 4, 5]);
    expect(x.components[1].title).toBe("Sectoral Legislation, Policy and Strategy");
    expect(x.components[1].purpose).toContain("policy and strategy environment");
  });

  it("keeps subsection ids, titles and themes", () => {
    const sub = build().components[1].subsections[0];
    expect(sub.id).toBe("1.1");
    expect(sub.title).toBe("Legislation");
    expect(sub.themes).toEqual(["Policy & Integration"]);
  });

  it("drops note blocks, which hold no answer", () => {
    const ids = build()
      .components.flatMap((c) => c.subsections)
      .flatMap((s) => s.questions)
      .map((q) => q.type);
    expect(ids).not.toContain("note");
  });

  it("prefers the assessor's meta fields over the organisation record", () => {
    const x = build({ meta_country: "Nepal", meta_province: "Bagmati", meta_district: "Lalitpur", meta_date: "2026-02-14" });
    expect(x.organisation).toEqual({
      name: "Makueni County",
      country: "Nepal",
      region: "Bagmati",
      district: "Lalitpur",
      assessmentDate: "2026-02-14",
    });
  });

  it("falls back to the organisation record when meta fields are blank", () => {
    const x = build();
    expect(x.organisation.country).toBe("Kenya");
    expect(x.organisation.region).toBe("Eastern");
    expect(x.organisation.district).toBe("");
  });

  it("passes the assessment identifiers straight through", () => {
    expect(build().assessment).toEqual(ASSESSMENT);
  });
});

describe("buildSehraExport / blanks", () => {
  it("marks an unanswered question blank with a null answer", () => {
    const q = findQ(build(), "c1_leg");
    expect(q.blank).toBe(true);
    expect(q.answer).toBeNull();
    expect(q.remarks).toBeNull();
  });

  it("marks every question blank when nothing has been filled in", () => {
    const all = build()
      .components.flatMap((c) => c.subsections)
      .flatMap((s) => s.questions);
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((q) => q.blank)).toBe(true);
  });

  it("clears blank once a Yes/No answer is given", () => {
    const q = findQ(build({ c1_leg__yn: "Yes" }), "c1_leg");
    expect(q.blank).toBe(false);
    expect(q.answer).toBe("Yes");
    expect(q.remarks).toBeNull();
  });

  it("clears blank when only remarks are given, so a missing selection is still visible", () => {
    const q = findQ(build({ c1_leg__rem: "Mentioned in the 2019 Act." }), "c1_leg");
    expect(q.blank).toBe(false);
    expect(q.answer).toBeNull();
    expect(q.remarks).toBe("Mentioned in the 2019 Act.");
  });

  it("treats whitespace-only answers as blank", () => {
    const q = findQ(build({ ctx_pop: "   " }), "ctx_pop");
    expect(q.blank).toBe(true);
    expect(q.answer).toBeNull();
  });
});

describe("buildSehraExport / question serialisation", () => {
  it("lists the allowed options for a Yes/No question, including its custom option", () => {
    expect(findQ(build(), "c1_leg").options).toEqual(["Yes", "No"]);
    expect(findQ(build(), "c1_natedu").options).toEqual(["Yes", "No", "No policy exists"]);
    expect(findQ(build(), "c2_emis").options).toEqual(["Yes", "No", "This does not exist"]);
  });

  it("carries help text where the question has it", () => {
    expect(findQ(build(), "c1_leg").help).toContain("laws passed by parliament");
    expect(findQ(build(), "c1_natedu").help).toBeNull();
  });

  it("serialises a text answer without options or items", () => {
    const q = findQ(build({ ctx_pop: "1200000" }), "ctx_pop");
    expect(q.type).toBe("field");
    expect(q.answer).toBe("1200000");
    expect(q.options).toBeNull();
    expect(q.items).toBeNull();
    expect(q.table).toBeNull();
  });

  it("serialises a group as labelled items plus remarks", () => {
    const q = findQ(build({ ctx_drops__0: "Yes", ctx_drops__2: "No", ctx_drops__rem: "Stockouts are common." }), "ctx_drops");
    expect(q.items).not.toBeNull();
    expect(q.items![0]).toEqual({ label: "School nurse", answer: "Yes" });
    expect(q.items![1]).toEqual({ label: "Community health level", answer: null });
    expect(q.items![2]).toEqual({ label: "Primary health level", answer: "No" });
    expect(q.remarks).toBe("Stockouts are common.");
    expect(q.blank).toBe(false);
    expect(q.answer).toBeNull();
  });

  it("serialises a table as cols, rows and a rows-by-cols cell grid", () => {
    const q = findQ(build({ ctx_children__0_0: "40000", ctx_children__0_3: "51000" }), "ctx_children");
    expect(q.table).not.toBeNull();
    expect(q.table!.cols).toEqual(["1 – 4 years", "5 – 9 years", "10 – 14 years", "15 – 19 years"]);
    expect(q.table!.rows).toEqual(["Number of children"]);
    expect(q.table!.cells).toEqual([["40000", null, null, "51000"]]);
    expect(q.blank).toBe(false);
  });

  it("keeps a fully empty table but marks it blank", () => {
    const q = findQ(build(), "ctx_children");
    expect(q.table!.cells).toEqual([[null, null, null, null]]);
    expect(q.blank).toBe(true);
  });

  it("serialises reflections as challenges and supports, dropping empty slots", () => {
    const q = findQ(build({ c1__challenge_0: "Weak financing", c1__challenge_2: "No lead unit", c1__support_1: "Strong policy" }), "c1");
    expect(q.type).toBe("reflections");
    expect(q.reflections).toEqual({ challenges: ["Weak financing", "No lead unit"], supports: ["Strong policy"] });
    expect(q.blank).toBe(false);
  });

  it("reports the assessor's readiness rating per component", () => {
    const x = build({ c1__scale: "3" });
    expect(x.components[1].readinessRating).toEqual({ value: 3, label: "Good Possibilities" });
    expect(x.components[2].readinessRating).toEqual({ value: null, label: null });
  });
});

describe("buildSehraExport / completion stats", () => {
  it("counts every answerable field in the module when nothing is answered", () => {
    const expected = ASSESS.reduce(
      (n, c) => n + keysForQuestions(c.subsections.flatMap((s) => s.questions)).length,
      0
    );
    const x = build();
    expect(x.completion.totalFields).toBe(expected);
    expect(x.completion.answeredFields).toBe(0);
    expect(x.completion.percent).toBe(0);
  });

  it("adds the per-component totals up to the overall totals", () => {
    const x = build({ ctx_pop: "1200000", c1_leg__yn: "Yes", c1_natedu__yn: "No", c4_minwage: "15000" });
    expect(x.completion.byComponent.reduce((n, c) => n + c.total, 0)).toBe(x.completion.totalFields);
    expect(x.completion.byComponent.reduce((n, c) => n + c.answered, 0)).toBe(x.completion.answeredFields);
    expect(x.completion.answeredFields).toBe(4);
  });

  it("attributes answers to the right component", () => {
    const x = build({ ctx_pop: "1200000", c1_leg__yn: "Yes" });
    const by = Object.fromEntries(x.completion.byComponent.map((c) => [c.id, c.answered]));
    expect(by.context).toBe(1);
    expect(by.c1).toBe(1);
    expect(by.c2).toBe(0);
  });

  it("does not count remarks or readiness ratings as answerable fields", () => {
    const empty = build().completion;
    const withExtras = build({ c1_leg__rem: "Some detail", c1__scale: "4" }).completion;
    expect(withExtras.totalFields).toBe(empty.totalFields);
    expect(withExtras.answeredFields).toBe(0);
  });

  it("rounds the percent from the answered fraction", () => {
    const x = build({ ctx_pop: "1200000" });
    expect(x.completion.percent).toBe(Math.round((x.completion.answeredFields / x.completion.totalFields) * 100));
  });
});

describe("buildSehraExport / rawAnswers and summary extras", () => {
  it("round-trips every raw answer verbatim, untrimmed", () => {
    const answers = {
      ctx_pop: "  1200000  ",
      c1_leg__yn: "Yes",
      c1_leg__rem: "Included in the Basic Education Act.",
      not_a_model_key: "kept anyway",
    };
    const x = build(answers);
    expect(x.rawAnswers).toEqual(answers);
  });

  it("copies rawAnswers rather than aliasing the caller's object", () => {
    const answers = { ctx_pop: "1" };
    const x = build(answers);
    answers.ctx_pop = "2";
    expect(x.rawAnswers.ctx_pop).toBe("1");
  });

  it("survives a JSON round-trip unchanged", () => {
    const doc = buildSehraExport({ ctx_pop: "1200000", c1__scale: "3" }, ORG, ASSESSMENT, { exportedAt: AT });
    expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
  });

  it("exports the three summary extras, null when blank", () => {
    expect(build().summaryExtras).toEqual({ sum_gaps: null, sum_groups: null, sum_unserved: null });
    expect(build({ sum_gaps: "No prevalence study." }).summaryExtras.sum_gaps).toBe("No prevalence study.");
  });
});

describe("sehraExportFilename", () => {
  it("slugs the organisation name and dates the file from exportedAt", () => {
    const doc = buildSehraExport({}, ORG, ASSESSMENT, { exportedAt: AT });
    expect(sehraExportFilename(doc)).toBe("sehra-export-makueni-county-2026-03-03.json");
  });

  it("collapses punctuation and falls back when the name slugs to nothing", () => {
    const messy = buildSehraExport({}, { name: "St. Mary's — School #2" }, ASSESSMENT, { exportedAt: AT });
    expect(sehraExportFilename(messy)).toBe("sehra-export-st-mary-s-school-2-2026-03-03.json");
    const blank = buildSehraExport({}, { name: "///" }, ASSESSMENT, { exportedAt: AT });
    expect(sehraExportFilename(blank)).toBe("sehra-export-assessment-2026-03-03.json");
  });
});

describe("downloadSehraExport", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("offers the export as a named .json download and cleans up the object URL", () => {
    const createObjectURL = vi.fn(() => "blob:sehra");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadSehraExport(buildSehraExport({ ctx_pop: "1200000" }, ORG, ASSESSMENT, { exportedAt: AT }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    const anchor = click.mock.instances[0] as HTMLAnchorElement;
    expect(anchor.download).toBe("sehra-export-makueni-county-2026-03-03.json");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:sehra");
    expect(document.querySelector("a[download]")).toBeNull();
  });

  it("does nothing when there is no browser to download into", () => {
    vi.stubGlobal("URL", {});
    expect(() => downloadSehraExport(buildSehraExport({}, ORG, ASSESSMENT, { exportedAt: AT }))).not.toThrow();
  });
});
