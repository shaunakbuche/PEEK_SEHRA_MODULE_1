#!/usr/bin/env python3
"""Tests for compare_runs.py, stage 3 of the double-extraction protocol."""

import json
import os
import tempfile
import unittest

import compare_runs as cr


def report(rag_c1="Amber", rag_c2="Amber/Green", overall="Amber", barriers=None, top=None):
    return {
        "title": "SEHRA Module 1 — Example District",
        "executiveSummary": "Summary covering policy, financing and referral.",
        "background": "Background and method.",
        "contextSnapshot": "Context for the example district.",
        "dataQualityNote": "",
        "components": [
            {
                "name": "Sectoral legislation",
                "summary": "Component summary.",
                "enablers": [{"theme": "Policy", "points": [
                    "School health appears in the national education sector plan"]}],
                "barriers": barriers if barriers is not None else [
                    {"theme": "Financing", "points": [
                        "No dedicated budget line exists for school eye health"]}],
                "crossCutting": "Interacts with financing.",
                "actionPoints": [{"theme": "Financing", "points": [
                    "Secure a ring-fenced budget line"]}],
                "rag": rag_c1,
                "ragSummary": "Summary.",
            },
            {
                "name": "Service delivery",
                "summary": "Component summary.",
                "enablers": [], "barriers": [], "crossCutting": "",
                "actionPoints": [], "rag": rag_c2, "ragSummary": "Summary.",
            },
        ],
        "overall": {
            "feasibility": "Feasible with conditions.",
            "strategyImplications": "Sequence carefully.",
            "policyAdvocacy": "Pursue a budget line.",
            "nextSteps": "Pilot in two districts.",
            "rag": overall,
            "ragInterpretation": "Interpretation.",
        },
        "topActions": top if top is not None else [
            "Secure a ring-fenced budget line for school eye health"],
    }


def barriers_with(text, theme="Financing"):
    return [{"theme": theme, "points": [text]}]


class TestRagClassification(unittest.TestCase):
    def test_identical_runs_agree_exactly(self):
        res = cr.compare(report(), report())
        self.assertEqual(res["ragByComponent"][0]["agreement"], "exact")
        self.assertEqual(res["verdict"]["agreement"], "High")
        self.assertEqual(res["adjudicate"], [])

    def test_one_level_apart_is_adjacent_not_divergent(self):
        res = cr.compare(report(rag_c1="Amber"), report(rag_c1="Amber/Green"))
        row = res["ragByComponent"][0]
        self.assertEqual(row["agreement"], "adjacent")
        self.assertEqual(row["distance"], 1)
        self.assertEqual(res["verdict"]["divergentCount"], 0)

    def test_two_levels_apart_is_divergent_and_escalates(self):
        res = cr.compare(report(rag_c1="Amber"), report(rag_c1="Green"))
        row = res["ragByComponent"][0]
        self.assertEqual(row["agreement"], "divergent")
        self.assertEqual(row["distance"], 2)
        self.assertEqual(res["verdict"]["agreement"], "Low")
        self.assertTrue(any("human must decide" in a for a in res["adjudicate"]))

    def test_extreme_ends_are_divergent(self):
        res = cr.compare(report(rag_c1="Green"), report(rag_c1="Red"))
        self.assertEqual(res["ragByComponent"][0]["distance"], 4)
        self.assertEqual(res["ragByComponent"][0]["agreement"], "divergent")

    def test_scale_order_is_best_to_worst(self):
        self.assertEqual(cr.RAG_SCALE,
                         ["Green", "Amber/Green", "Amber", "Red/Amber", "Red"])

    def test_unreadable_rag_is_flagged_not_guessed(self):
        a = report()
        b = report()
        b["components"][0]["rag"] = "banana"
        res = cr.compare(a, b)
        self.assertEqual(res["ragByComponent"][0]["agreement"], "unknown")
        self.assertTrue(any("could not be read" in x for x in res["adjudicate"]))

    def test_overall_rag_divergence_is_reported(self):
        res = cr.compare(report(overall="Green"), report(overall="Amber"))
        self.assertEqual(res["overallRag"]["agreement"], "divergent")


class TestSimilarityMatching(unittest.TestCase):
    def test_differently_worded_equivalent_points_are_matched(self):
        a = report(barriers=barriers_with(
            "No dedicated budget line exists for school eye health"))
        b = report(barriers=barriers_with(
            "There is no dedicated budget line for school eye health anywhere"))
        row = [c for c in cr.compare(a, b)["coverage"] if c["field"] == "Barriers"][0]
        self.assertEqual(row["both"], 1)
        self.assertEqual(row["onlyA"], 0)
        self.assertEqual(row["onlyB"], 0)

    def test_genuinely_different_points_are_not_matched(self):
        a = report(barriers=barriers_with(
            "No dedicated budget line exists for school eye health"))
        b = report(barriers=barriers_with(
            "Optometrists are concentrated entirely in urban private practice"))
        row = [c for c in cr.compare(a, b)["coverage"] if c["field"] == "Barriers"][0]
        self.assertEqual(row["both"], 0)
        self.assertEqual(row["onlyA"], 1)
        self.assertEqual(row["onlyB"], 1)

    def test_theme_rename_alone_is_not_a_disagreement(self):
        """Themes are derived per run, so different wording must not count."""
        a = report(barriers=barriers_with("No dedicated budget line exists", "Financing"))
        b = report(barriers=barriers_with("No dedicated budget line exists", "Funding"))
        res = cr.compare(a, b)
        row = [c for c in res["coverage"] if c["field"] == "Barriers"][0]
        self.assertEqual(row["both"], 1)
        self.assertNotEqual(row["themesA"], row["themesB"])
        self.assertEqual(res["adjudicate"], [])

    def test_similarity_bounds(self):
        self.assertEqual(cr.similarity("", "anything"), 0.0)
        self.assertAlmostEqual(cr.similarity("budget line school", "budget line school"), 1.0)


class TestRobustness(unittest.TestCase):
    def test_unwraps_content_key(self):
        self.assertIn("components", cr.unwrap({"content": report()}))

    def test_unwraps_nested_report_content(self):
        self.assertIn("components", cr.unwrap({"report": {"content": report()}}))

    def test_empty_and_junk_input_do_not_crash(self):
        for junk in ({}, {"nonsense": True}, None):
            res = cr.compare(report(), cr.unwrap(junk) if junk else {})
            self.assertIn("verdict", res)

    def test_mismatched_component_counts_do_not_crash(self):
        b = report()
        b["components"] = b["components"][:1]
        res = cr.compare(report(), b)
        self.assertEqual(len(res["ragByComponent"]), 2)

    def test_render_produces_text(self):
        out = cr.render(cr.compare(report(), report()))
        self.assertIn("RAG AGREEMENT", out)
        self.assertIn("computed by script", out)

    def test_cli_round_trip(self):
        d = tempfile.mkdtemp()
        pa, pb = os.path.join(d, "a.json"), os.path.join(d, "b.json")
        json.dump(report(), open(pa, "w"))
        json.dump(report(rag_c1="Green"), open(pb, "w"))
        self.assertEqual(cr.main([pa, pb, "--json"]), 0)

    def test_no_real_partner_names_in_the_shipped_package(self):
        """The package must read as synthetic. Test files carry the denylist
        itself, so they are excluded; everything a reader sees is scanned."""
        denylist = ("makueni", "nairobi", "kenyan", " kes ")
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        offenders = []
        for dirpath, _dirs, files in os.walk(root):
            for fn in files:
                if fn.startswith("test_") or not fn.endswith((".md", ".json", ".py")):
                    continue
                path = os.path.join(dirpath, fn)
                with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                    text = fh.read().lower()
                for name in denylist:
                    if name in text:
                        offenders.append("%s contains %r" % (os.path.relpath(path, root), name.strip()))
        self.assertEqual(offenders, [], "real partner names found: %s" % offenders)


if __name__ == "__main__":
    unittest.main()
