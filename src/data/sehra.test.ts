import { describe, expect, it } from "vitest";
import { keysForQuestions, ASSESS, type Question } from "./sehra";

describe("keysForQuestions", () => {
  it("produces one key for a yes/no question", () => {
    const q: Question = { type: "yn", id: "q1", text: "Is this a question?" };
    expect(keysForQuestions([q])).toEqual(["q1__yn"]);
  });

  it("produces one key for a text or field question", () => {
    expect(keysForQuestions([{ type: "text", id: "t1", text: "Explain" }])).toEqual(["t1"]);
    expect(keysForQuestions([{ type: "field", id: "f1", text: "Value" }])).toEqual(["f1"]);
  });

  it("produces one key per item for a group question", () => {
    const q: Question = { type: "group", id: "g1", text: "Pick all that apply", items: ["A", "B", "C"] };
    expect(keysForQuestions([q])).toEqual(["g1__0", "g1__1", "g1__2"]);
  });

  it("produces one key per row x column cell for a table question", () => {
    const q: Question = { type: "table", id: "tb1", text: "Fill this in", cols: ["X", "Y"], rows: ["R1", "R2"] };
    expect(keysForQuestions([q])).toEqual(["tb1__0_0", "tb1__0_1", "tb1__1_0", "tb1__1_1"]);
  });

  it("produces six keys (3 challenges + 3 supports) for a reflections question", () => {
    const q: Question = { type: "reflections", id: "c1" };
    const keys = keysForQuestions([q]);
    expect(keys).toHaveLength(6);
    expect(keys).toContain("c1__challenge_0");
    expect(keys).toContain("c1__support_2");
  });

  it("produces no keys for a note (informational only)", () => {
    expect(keysForQuestions([{ type: "note", text: "Just a note" }])).toEqual([]);
  });

  it("every component in ASSESS has at least one subsection with questions", () => {
    for (const comp of ASSESS) {
      expect(comp.subsections.length).toBeGreaterThan(0);
      const totalKeys = comp.subsections.flatMap((s) => keysForQuestions(s.questions));
      expect(totalKeys.length).toBeGreaterThan(0);
    }
  });
});
