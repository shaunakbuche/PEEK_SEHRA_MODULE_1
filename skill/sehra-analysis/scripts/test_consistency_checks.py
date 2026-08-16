#!/usr/bin/env python3
"""
Tests for the deterministic SEHRA checks.

Run from this directory:
    python3 -m unittest -v

The sample export carries deliberately planted problems. Every one of them must
be detected, and a clean export must produce no major findings.
"""

from __future__ import annotations

import io
import json
import os
import re
import sys
import unittest
from contextlib import redirect_stdout
from typing import Any, Dict, List, Optional, Sequence

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import consistency_checks as cc  # noqa: E402
import summarise_export as se  # noqa: E402

SAMPLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sample_export.json")

# Real names from the partner site the fixture used to be labelled with, plus the
# country and currency that went with it. None of them may reappear: the fixture
# stands in for a confidential hand-written review and must read as invented.
REAL_NAMES = ("makueni", "kenya", "kenyan", "kes", "nairobi", "eastern",
              "kamba", "maasai", "kikuyu", "peek")


def by_code(result: Dict[str, Any], code: str) -> List[Dict[str, Any]]:
    return [f for f in result["findings"] if f["code"] == code]


def majors(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [f for f in result["findings"] if f["severity"] == "major"]


def gap_ids(result: Dict[str, Any], which: str) -> List[str]:
    return [b["questionId"] for b in result["blanks"][which]]


def gap_for(result: Dict[str, Any], qid: str) -> Dict[str, Any]:
    for b in result["blanks"]["genuine"]:
        if b["questionId"] == qid:
            return b
    raise AssertionError("no genuine gap recorded for %s" % qid)


def one_question_export(question: Dict[str, Any]) -> Dict[str, Any]:
    """The smallest export that carries a single question, for focused checks."""
    base = {
        "id": "", "type": "text", "text": "", "help": "",
        "answer": None, "remarks": None, "blank": False,
        "options": None, "items": None, "table": None, "reflections": None,
    }
    base.update(question)
    return {"components": [{
        "id": "context", "number": "C", "title": "Context",
        "subsections": [{"id": "c.1", "title": "Population & demographics",
                         "questions": [base]}],
    }]}


def table_export(text: str, cols: Sequence[str], rows: Sequence[str],
                 cells: Sequence[Sequence[str]], help_text: str = "") -> Dict[str, Any]:
    """An export carrying one table question, for the arithmetic checks."""
    return one_question_export({
        "id": "t1", "type": "table", "text": text, "help": help_text,
        "table": {"cols": list(cols), "rows": list(rows),
                  "cells": [list(r) for r in cells]},
    })


def yn_export(help_text: str, answer: str = "Yes",
              remarks: Optional[str] = None) -> Dict[str, Any]:
    """An export carrying one Yes/No question, for the blank classification."""
    return one_question_export({
        "id": "q1", "type": "yn", "help": help_text, "answer": answer,
        "remarks": remarks, "options": ["Yes", "No"],
        "text": "Is there an allocated budget for school health / school eye health?",
    })


# ---------------------------------------------------------------------------

def clean_export() -> Dict[str, Any]:
    """
    A small but complete export with no problems at all.

    Everything is answered, every total adds up, the two school tables agree,
    and no Yes/No answer is contradicted by its remarks.
    """
    def q(**kw: Any) -> Dict[str, Any]:
        base = {
            "id": "", "type": "text", "text": "", "help": "",
            "answer": None, "remarks": None, "blank": False,
            "options": None, "items": None, "table": None, "reflections": None,
        }
        base.update(kw)
        return base

    return {
        "sehraExport": {
            "version": "1.0",
            "exportedAt": "2026-05-14T09:00:00.000Z",
            "tool": "SEHRA Scoping Module (Module 1)",
            "organisation": {
                "name": "Clean Test County", "country": "Example Country",
                "region": "Example Region", "district": "Testville",
                "assessmentDate": "2026-05-01",
            },
            "assessment": {"id": "asmt_clean", "status": "submitted"},
            "components": [
                {
                    "id": "context", "number": "C", "title": "Context",
                    "purpose": "Overview of the implementation area.",
                    "readinessRating": {"value": None, "label": None},
                    "subsections": [
                        {
                            "id": "c.1", "title": "Population & demographics", "themes": [],
                            "questions": [
                                q(id="ctx_pop", type="field", text="Total population",
                                  answer="850,000"),
                                q(id="ctx_schools", type="table",
                                  text="Number of schools by level and school type",
                                  table={
                                      "cols": ["Pre-Primary", "Primary", "Secondary", "Total"],
                                      "rows": ["Public", "Private"],
                                      "cells": [["100", "400", "50", "550"],
                                                ["40", "100", "20", "160"]],
                                  }),
                            ],
                        },
                        {
                            "id": "c.2", "title": "Existing school eye health programme", "themes": [],
                            "questions": [
                                q(id="ctx_seh_prog", type="yn",
                                  text="Are there any standalone school eye health programmes?",
                                  help="Who is the implementer? Who is the funder?",
                                  options=["Yes", "No"], answer="Yes",
                                  remarks="A school eye health programme operates in 30 primary "
                                          "schools, run by the county health team with teacher "
                                          "screening and referral to the county eye unit."),
                            ],
                        },
                    ],
                },
                {
                    "id": "c1", "number": 1, "title": "Sectoral Legislation, Policy and Strategy",
                    "purpose": "Policy environment.",
                    "readinessRating": {"value": 3, "label": "Good Possibilities"},
                    "subsections": [
                        {
                            "id": "1.3", "title": "Finance", "themes": [],
                            "questions": [
                                q(id="c1_budget_sh", type="yn",
                                  text="Is there an allocated budget for school health?",
                                  help="Which ministry / ministries? What is the annual expenditure?",
                                  options=["Yes", "No"], answer="Yes",
                                  remarks="The Ministry of Health allocates an annual school health "
                                          "line of 12 million in local currency, managed by the "
                                          "county health department."),
                                q(id="c1_budget_eye", type="yn",
                                  text="Is there an allocated budget for eye health?",
                                  help="Which ministry / ministries?",
                                  options=["Yes", "No"], answer="No"),
                            ],
                        },
                    ],
                },
                {
                    "id": "c2", "number": 2,
                    "title": "Institutional and Service Delivery Environment",
                    "purpose": "Service delivery situation.",
                    "readinessRating": {"value": 3, "label": "Good Possibilities"},
                    "subsections": [
                        {
                            "id": "2.2", "title": "Infrastructure", "themes": [],
                            "questions": [
                                q(id="c2_inf_edu", type="table",
                                  text="Education Sector Infrastructure / Number of Facilities",
                                  table={
                                      "cols": ["Pre-Primary", "Primary", "Secondary"],
                                      "rows": ["Public Sector", "Private"],
                                      "cells": [["100", "400", "50"], ["40", "100", "20"]],
                                  }),
                            ],
                        },
                        {
                            "id": "2.9", "title": "Reflections and Implications",
                            "questions": [
                                q(id="c2", type="reflections", text="Reflections and implications",
                                  reflections={
                                      "challenges": ["Referral completion is hard to track."],
                                      "supports": ["A county eye unit already runs refraction clinics."],
                                  }),
                            ],
                        },
                    ],
                },
            ],
            "summaryExtras": {
                "sum_gaps": "Prevalence data for the southern wards still needs a desk review.",
                "sum_groups": "Parent-teacher associations meet termly in most public schools.",
                "sum_unserved": "Children in non-formal settlements are not yet screened.",
            },
            "rawAnswers": {"ctx_pop": "850,000"},
        }
    }


# ---------------------------------------------------------------------------

class TestPlantedProblems(unittest.TestCase):
    """Each planted problem in sample_export.json must be found."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.result = cc.run_all_checks(cc.load_export(SAMPLE))

    def test_total_that_does_not_add_up_is_found(self) -> None:
        hits = by_code(self.result, "ARITH_TOTAL_MISMATCH")
        self.assertEqual(len(hits), 1, "expected exactly one arithmetic mismatch")
        hit = hits[0]
        self.assertEqual(hit["severity"], "major")
        self.assertIn("Number of schools", hit["location"])
        ev = hit["evidence"]
        self.assertEqual(ev["declaredTotal"], 700.0)
        self.assertEqual(ev["computedSum"], 694.0)
        self.assertEqual(ev["difference"], 6.0)
        self.assertEqual(ev["crossLabel"], "Public")

    def test_correct_totals_are_not_flagged(self) -> None:
        """The Private and NGO rows add up and must stay silent."""
        for hit in by_code(self.result, "ARITH_TOTAL_MISMATCH"):
            self.assertNotIn(hit["evidence"].get("crossLabel"), ("Private", "NGO or Faith-based"))

    def test_percentage_totals_are_never_summed(self) -> None:
        """The attendance table holds rates, so none of its totals is ever summed."""
        for hit in by_code(self.result, "ARITH_TOTAL_MISMATCH"):
            self.assertNotIn("attendance rate", hit["location"].lower())
        # Every rate in that table sits inside the range of its parts.
        self.assertEqual(by_code(self.result, "ARITH_RATE_TOTAL_OUT_OF_RANGE"), [])

    def test_every_component_id_is_exercised(self) -> None:
        ids = [c["id"] for c in self.result["completeness"]["computed"]["byComponent"]]
        self.assertEqual(ids, ["context", "c1", "c2", "c3", "c4", "c5"])

    def test_count_entered_where_a_rate_is_expected_is_found(self) -> None:
        hits = by_code(self.result, "UNIT_COUNT_IN_RATE_FIELD")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["severity"], "major")
        self.assertIn("attendance rate", hits[0]["location"].lower())
        flagged = [v for v in hits[0]["evidence"]["values"]]
        self.assertTrue(any("41230" in str(v) for v in flagged), flagged)

    def test_rate_entered_where_a_count_is_expected_is_found(self) -> None:
        hits = by_code(self.result, "UNIT_RATE_IN_COUNT_FIELD")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["severity"], "major")
        self.assertIn("Health Sector Infrastructure", hits[0]["location"])
        self.assertTrue(any("78%" in str(v) for v in hits[0]["evidence"]["values"]))

    def test_row_mixing_counts_and_percentages_is_found(self) -> None:
        hits = by_code(self.result, "UNIT_MIXED_ROW")
        self.assertTrue(hits, "the attendance row mixes 41,230 with percentages")
        self.assertIn("Attendance", hits[0]["location"])

    def test_yes_contradicted_by_remarks_is_found(self) -> None:
        hits = [h for h in by_code(self.result, "LOGIC_YES_BUT_ABSENCE")
                if h["severity"] == "major"]
        self.assertEqual(len(hits), 1)
        self.assertIn("coordination mechanism", hits[0]["location"])
        self.assertEqual(hits[0]["evidence"]["answer"], "Yes")
        phrases = [p.lower() for p in hits[0]["evidence"]["absencePhrases"]]
        self.assertIn("there is no", phrases)

    def test_no_answer_with_negated_remarks_is_not_a_false_positive(self) -> None:
        """'Spectacles are not reimbursed' must not read as presence."""
        for hit in by_code(self.result, "LOGIC_NO_BUT_PRESENCE"):
            self.assertNotIn("eyeglasses", hit["location"].lower())

    def test_cross_section_figure_mismatch_is_found(self) -> None:
        hits = by_code(self.result, "XREF_VALUE_MISMATCH")
        self.assertEqual(len(hits), 1)
        self.assertEqual(hits[0]["severity"], "major")
        mismatches = hits[0]["evidence"]["mismatches"]
        self.assertEqual(len(mismatches), 1)
        self.assertEqual({mismatches[0]["firstValue"], mismatches[0]["secondValue"]},
                         {412.0, 389.0})
        self.assertEqual(hits[0]["evidence"]["comparedValues"], 8)

    def test_truncated_value_is_found(self) -> None:
        hits = by_code(self.result, "VALUE_TRUNCATED")
        self.assertTrue(hits)
        self.assertTrue(any("teachers" in h["location"].lower() for h in hits))

    def test_genuine_gaps_are_found(self) -> None:
        ids = gap_ids(self.result, "genuine")
        for expected in ("ctx_prev", "c1_budget_sh", "c2_datashare", "sum_gaps"):
            self.assertIn(expected, ids)

    def test_conditional_blanks_are_not_reported_as_gaps(self) -> None:
        conditional = gap_ids(self.result, "conditional")
        genuine = gap_ids(self.result, "genuine")
        # Blank remarks after "No" / "No policy exists" / "This does not exist".
        for expected in ("c4_wtp", "c1_natedu", "c2_me", "c1_budget_eye"):
            self.assertIn(expected, conditional)
            self.assertNotIn(expected, genuine)

    def test_unanswered_parent_does_not_double_count_its_remarks(self) -> None:
        """c2_datashare is one gap (the Yes/No), not two."""
        gaps = [b for b in self.result["blanks"]["genuine"] if b["questionId"] == "c2_datashare"]
        self.assertEqual(len(gaps), 1)
        self.assertEqual(gaps[0]["what"], "Yes/No answer")

    def test_findings_are_sorted_major_first(self) -> None:
        severities = [f["severity"] for f in self.result["findings"]]
        self.assertEqual(severities, sorted(severities, key=lambda s: 0 if s == "major" else 1))

    def test_every_finding_has_the_required_shape(self) -> None:
        for f in self.result["findings"]:
            self.assertIn(f["severity"], ("major", "minor"))
            for key in ("code", "category", "location", "issue", "evidence", "rule"):
                self.assertIn(key, f)
            self.assertTrue(f["location"], "a finding must say where it is")
            self.assertTrue(f["issue"])

    def test_no_check_crashed(self) -> None:
        self.assertEqual(by_code(self.result, "CHECK_FAILED"), [])


class TestCleanInput(unittest.TestCase):
    """A complete, internally consistent export must raise nothing major."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.result = cc.run_all_checks(cc.load_export(clean_export()))

    def test_no_major_findings(self) -> None:
        found = majors(self.result)
        self.assertEqual(
            found, [],
            "clean input produced majors: %s" % [(f["code"], f["location"]) for f in found],
        )
        self.assertEqual(self.result["summary"]["major"], 0)

    def test_no_genuine_gaps(self) -> None:
        self.assertEqual(gap_ids(self.result, "genuine"), [])

    def test_matching_tables_produce_no_cross_reference_finding(self) -> None:
        self.assertEqual(by_code(self.result, "XREF_VALUE_MISMATCH"), [])

    def test_correct_totals_produce_no_arithmetic_finding(self) -> None:
        self.assertEqual(by_code(self.result, "ARITH_TOTAL_MISMATCH"), [])

    def test_completeness_is_fully_answered(self) -> None:
        computed = self.result["completeness"]["computed"]
        self.assertEqual(computed["percent"], 100)
        self.assertEqual(computed["answeredFields"], computed["totalFields"])

    def test_blank_after_a_no_is_conditional_not_a_gap(self) -> None:
        self.assertIn("c1_budget_eye", gap_ids(self.result, "conditional"))


class TestNumberParsing(unittest.TestCase):

    def test_thousands_separators(self) -> None:
        self.assertEqual(cc.parse_number("41,230").value, 41230.0)
        self.assertEqual(cc.parse_number("12 340").value, 12340.0)
        self.assertEqual(cc.parse_number("1,012,600").value, 1012600.0)

    def test_percentages(self) -> None:
        p = cc.parse_number("88%")
        self.assertEqual(p.value, 88.0)
        self.assertTrue(p.is_percent)
        self.assertFalse(cc.parse_number("88").is_percent)

    def test_stray_text_and_currency(self) -> None:
        p = cc.parse_number("15,201 per month in local currency units")
        self.assertEqual(p.value, 15201.0)
        self.assertTrue(p.has_extra_text)

    def test_trailing_comma_looks_truncated(self) -> None:
        self.assertTrue(cc.parse_number("12,").truncated)
        self.assertTrue(cc.parse_number("trained in 2023 and").truncated)
        self.assertFalse(cc.parse_number("412").truncated)

    def test_ranges_are_flagged(self) -> None:
        self.assertTrue(cc.parse_number("10-20").is_range)

    def test_placeholders(self) -> None:
        self.assertEqual(cc.parse_number("TBC").placeholder, "pending")
        self.assertEqual(cc.parse_number("N/A").placeholder, "na")
        self.assertFalse(cc.parse_number("TBC").ok)

    def test_empty_and_junk(self) -> None:
        for junk in (None, "", "   ", "no data recorded"):
            self.assertFalse(cc.parse_number(junk).ok)


class TestYesNoPolarity(unittest.TestCase):

    def test_alternative_negative_labels_read_as_not_applicable(self) -> None:
        for label in ("No policy exists", "This does not exist", "No Eye Health Policy exists",
                      "No IPEC Plan exists", "Does not exist"):
            self.assertEqual(cc.yn_polarity(label), "na", label)

    def test_plain_answers(self) -> None:
        self.assertEqual(cc.yn_polarity("Yes"), "yes")
        self.assertEqual(cc.yn_polarity("No"), "no")
        self.assertEqual(cc.yn_polarity(""), "")
        self.assertEqual(cc.yn_polarity(None), "")


class TestTotalDetection(unittest.TestCase):

    def test_grouped_totals_pair_with_their_own_siblings(self) -> None:
        cols = ["Public / M", "Public / F", "Public / Total",
                "NGO/Faith / M", "NGO/Faith / F", "NGO/Faith / Total"]
        targets = cc._total_targets(cols)
        self.assertEqual(len(targets), 2)
        grouped = {t["label"]: sorted(t["siblings"]) for t in targets}
        self.assertEqual(grouped["Public / Total"], [0, 1])
        self.assertEqual(grouped["NGO/Faith / Total"], [3, 4])

    def test_exact_total_excludes_other_totals_from_its_siblings(self) -> None:
        cols = ["Public / M", "Public / Total", "Private / M", "Private / Total", "Total"]
        targets = [t for t in cc._total_targets(cols) if t["kind"] == "exact"]
        self.assertEqual(len(targets), 1)
        self.assertEqual(sorted(targets[0]["siblings"]), [0, 2])


class TestRateTablesAreNeverSummed(unittest.TestCase):
    """
    Rates across separate categories must never be added together.

    An assessor filling a table whose title already says "rate" routinely omits
    the percent sign. Summing 88 and 86 to test a declared total of 87 invents an
    arithmetic error the assessor never made, and because the skill treats these
    figures as established fact it would reach the partner as confidently wrong.
    """

    GROUPED = ["Public / M", "Public / F", "Public / Total",
               "NGO/Faith / M", "NGO/Faith / F", "NGO/Faith / Total"]
    RATE_TITLE = "School attendance rate by school type and gender"

    def arith(self, export: Dict[str, Any]) -> List[Dict[str, Any]]:
        result = cc.run_all_checks(cc.load_export(export))
        self.assertEqual(by_code(result, "CHECK_FAILED"), [])
        return [f for f in result["findings"] if f["category"] == "arithmetic"]

    def test_bare_numbers_in_a_rate_table_raise_nothing(self) -> None:
        found = self.arith(table_export(
            self.RATE_TITLE, self.GROUPED, ["Attendance"],
            [["88", "86", "87", "84", "83", "83"]]))
        self.assertEqual(found, [],
                         "a rate table filled without percent signs was summed: %s"
                         % [(f["code"], f["issue"]) for f in found])

    def test_the_percent_sign_is_not_what_makes_a_rate_table_safe(self) -> None:
        """The same figures with and without % must reach the same verdict."""
        bare = self.arith(table_export(
            self.RATE_TITLE, self.GROUPED, ["Attendance"],
            [["88", "86", "87", "84", "83", "83"]]))
        marked = self.arith(table_export(
            self.RATE_TITLE, self.GROUPED, ["Attendance"],
            [["88%", "86%", "87%", "84%", "83%", "83%"]]))
        self.assertEqual([f["code"] for f in bare], [f["code"] for f in marked])

    def test_a_rate_named_only_on_the_axis_is_still_respected(self) -> None:
        """The question text says nothing about rates; the row label does."""
        found = self.arith(table_export(
            "School figures by school type and gender",
            ["Public / M", "Public / F", "Public / Total"],
            ["Attendance rate"], [["88", "86", "87"]]))
        self.assertEqual(found, [])

    def test_a_rate_total_outside_the_range_of_its_parts_is_minor(self) -> None:
        """A weighted mean cannot sit outside its parts, so this is reportable."""
        found = self.arith(table_export(
            self.RATE_TITLE, ["Public / M", "Public / F", "Public / Total"],
            ["Attendance"], [["88", "86", "95"]]))
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["code"], "ARITH_RATE_TOTAL_OUT_OF_RANGE")
        self.assertEqual(found[0]["severity"], "minor")
        self.assertEqual(found[0]["evidence"]["contributorRange"], [86.0, 88.0])

    def test_a_genuine_count_table_mismatch_is_still_major(self) -> None:
        """No regression: counts are still added up and still checked."""
        found = self.arith(table_export(
            "Number of schools by level and school type",
            ["Pre-Primary", "Primary", "Total"], ["Public"],
            [["120", "412", "700"]]))
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["code"], "ARITH_TOTAL_MISMATCH")
        self.assertEqual(found[0]["severity"], "major")
        self.assertEqual(found[0]["evidence"]["computedSum"], 532.0)
        self.assertEqual(found[0]["evidence"]["declaredTotal"], 700.0)

    def test_a_correct_count_total_stays_silent(self) -> None:
        self.assertEqual(self.arith(table_export(
            "Number of schools by level and school type",
            ["Pre-Primary", "Primary", "Total"], ["Public"],
            [["120", "412", "532"]])), [])

    def test_ambiguous_labels_are_summed_only_when_the_figures_settle_it(self) -> None:
        """Values too large to be percentages are counts, so they are summed."""
        title = "School enrolment by school type and gender (or Net Enrolment Rate)"
        found = self.arith(table_export(
            title, ["Public / M", "Public / F", "Public / Total"],
            ["Enrolment"], [["22,100", "21,400", "43,900"]]))
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["code"], "ARITH_TOTAL_MISMATCH")
        self.assertEqual(found[0]["evidence"]["computedSum"], 43500.0)

    def test_small_ambiguous_figures_are_queried_not_asserted(self) -> None:
        """The same label with rate-sized figures cannot be judged either way."""
        title = "School enrolment by school type and gender (or Net Enrolment Rate)"
        found = self.arith(table_export(
            title, ["Public / M", "Public / F", "Public / Total"],
            ["Enrolment"], [["88", "86", "87"]]))
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["code"], "ARITH_TOTAL_UNRECONCILED")
        self.assertEqual(found[0]["severity"], "minor")

    def test_no_rate_table_ever_produces_a_major_arithmetic_finding(self) -> None:
        for cells in ([["88", "86", "87", "84", "83", "83"]],
                      [["88", "86", "95", "84", "83", "200"]],
                      [["88%", "86%", "87%", "84%", "83%", "83%"]],
                      [["0", "0", "0", "0", "0", "0"]]):
            found = self.arith(table_export(
                self.RATE_TITLE, self.GROUPED, ["Attendance"], cells))
            self.assertEqual([f for f in found if f["severity"] == "major"], [],
                             "major arithmetic finding on a rate table: %s" % cells)


class TestRemarksAfterYes(unittest.TestCase):
    """Blank remarks after a Yes are only major when detail was actually asked for."""

    def gap(self, help_text: str) -> Dict[str, Any]:
        return gap_for(cc.run_all_checks(cc.load_export(yn_export(help_text))), "q1")

    def test_if_yes_wording_is_major(self) -> None:
        gap = self.gap("If 'Yes', please describe the mechanism.")
        self.assertEqual(gap["severity"], "major")
        self.assertIn("explicitly asks", gap["rule"])

    def test_help_that_poses_follow_up_questions_is_major(self) -> None:
        gap = self.gap("Which ministry / ministries? What is the annual public expenditure?")
        self.assertEqual(gap["severity"], "major")
        self.assertIn("follow-up questions", gap["rule"])

    def test_help_that_only_explains_a_term_is_minor(self) -> None:
        """Explanatory help is not a prompt, so it must not claim to be one."""
        gap = self.gap("EMIS is the education sector's routine data system.")
        self.assertEqual(gap["severity"], "minor")
        self.assertNotIn("prompt", gap["rule"].lower())
        self.assertNotIn("asks", gap["rule"].lower())

    def test_no_help_at_all_is_minor(self) -> None:
        gap = self.gap("")
        self.assertEqual(gap["severity"], "minor")


class TestFixtureIsSynthetic(unittest.TestCase):
    """
    The fixture stands in for a confidential partner review, so it must not be
    labelled with a real site. Anyone reading it should see at once that it is
    invented.
    """

    def assert_no_real_names(self, text: str, what: str) -> None:
        for name in REAL_NAMES:
            self.assertIsNone(
                re.search(r"\b%s\b" % re.escape(name), text, re.I),
                "%s still names %r" % (what, name),
            )

    def test_the_sample_export_names_no_real_place(self) -> None:
        with open(SAMPLE, "r", encoding="utf-8") as fh:
            self.assert_no_real_names(fh.read(), "sample_export.json")

    def test_the_inline_clean_export_names_no_real_place(self) -> None:
        self.assert_no_real_names(json.dumps(clean_export()), "clean_export()")

    def test_the_organisation_reads_as_an_example(self) -> None:
        org = cc.load_export(SAMPLE)["organisation"]
        for key in ("name", "country", "region", "district"):
            self.assertIn("example", str(org.get(key)).lower(),
                          "organisation.%s does not read as invented" % key)

    def test_the_raw_answers_carry_the_same_invented_place(self) -> None:
        raw = cc.load_export(SAMPLE)["rawAnswers"]
        for key in ("meta_country", "meta_province", "meta_district"):
            self.assertIn("Example", raw[key])


class TestRobustness(unittest.TestCase):
    """Odd or missing fields must produce findings, never exceptions."""

    def test_empty_and_malformed_inputs(self) -> None:
        for bad in ({}, {"sehraExport": {}}, {"components": None},
                    {"components": "not a list"}, {"components": [None, 7, "x"]}):
            result = cc.run_all_checks(cc.load_export(bad))
            self.assertEqual(by_code(result, "CHECK_FAILED"), [])
            self.assertIsInstance(result["findings"], list)

    def test_ragged_and_missing_table_data(self) -> None:
        export = {"components": [{
            "id": "context", "number": "C", "title": "Context",
            "subsections": [{"id": "c.1", "title": "T", "questions": [
                {"id": "t1", "type": "table", "text": "Number of schools",
                 "table": {"cols": ["A", "Total"], "rows": ["R1", "R2"], "cells": [["1"]]}},
                {"id": "t2", "type": "table", "text": "Broken", "table": None},
                {"id": "g1", "type": "group", "text": "Checklist", "items": None},
                {"id": "r1", "type": "reflections", "text": "R", "reflections": None},
                {"id": "n1", "type": "note", "text": "just a note"},
            ]}],
        }]}
        result = cc.run_all_checks(cc.load_export(export))
        self.assertEqual(by_code(result, "CHECK_FAILED"), [])

    def test_note_questions_are_skipped(self) -> None:
        export = {"components": [{
            "id": "c1", "number": 1, "title": "X",
            "subsections": [{"id": "1.1", "title": "T", "questions": [
                {"type": "note", "text": "guidance only"},
            ]}],
        }]}
        result = cc.run_all_checks(cc.load_export(export))
        self.assertEqual(result["completeness"]["computed"]["totalFields"], 0)

    def test_load_export_accepts_wrapped_and_unwrapped(self) -> None:
        wrapped = clean_export()
        self.assertEqual(cc.load_export(wrapped), cc.load_export(wrapped["sehraExport"]))
        self.assertEqual(cc.load_export(json.dumps(wrapped))["version"], "1.0")


class TestCli(unittest.TestCase):

    def test_json_output_is_valid(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = cc.main([SAMPLE, "--json"])
        self.assertEqual(code, 0)
        payload = json.loads(buf.getvalue())
        self.assertIn("findings", payload)
        self.assertGreater(payload["summary"]["major"], 0)

    def test_text_output_mentions_the_planted_total(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            cc.main([SAMPLE])
        text = buf.getvalue()
        self.assertIn("700", text)
        self.assertIn("694", text)

    def test_severity_filter(self) -> None:
        buf = io.StringIO()
        with redirect_stdout(buf):
            cc.main([SAMPLE, "--severity", "major"])
        self.assertNotIn("[MINOR]", buf.getvalue())


class TestDigest(unittest.TestCase):

    @classmethod
    def setUpClass(cls) -> None:
        cls.export = cc.load_export(SAMPLE)
        cls.blocks = se.build_digest(cls.export)
        cls.text, _ = se.render_digest(cls.blocks)

    def test_blanks_are_explicit(self) -> None:
        self.assertIn(cc.BLANK_MARK, self.text)
        self.assertIn("Remarks: %s" % cc.BLANK_MARK, self.text)

    def test_every_component_appears(self) -> None:
        for heading in ("## Context", "## Component 1", "## Component 2",
                        "## Component 3", "## Component 4", "## Component 5"):
            self.assertIn(heading, self.text)

    def test_tables_and_reflections_are_flattened(self) -> None:
        self.assertIn("Public | Pre-Primary: 120", self.text)
        self.assertIn("Challenges:", self.text)
        self.assertIn("Supporting factors:", self.text)

    def test_summary_extras_are_included(self) -> None:
        self.assertIn("Evidence gaps / open questions", self.text)

    def test_readiness_rating_is_shown(self) -> None:
        self.assertIn("Assessor readiness rating: Good Possibilities (3 of 4)", self.text)

    def test_max_chars_is_respected_and_cuts_at_a_boundary(self) -> None:
        for budget in (800, 1500, 3000, 6000):
            text, omitted = se.render_digest(self.blocks, budget)
            self.assertLessEqual(len(text), budget, "budget %d overrun" % budget)
            self.assertTrue(omitted)
            self.assertIn("truncated", text)
            # The header survives, so the reader always knows whose data this is.
            self.assertIn("Organisation", text)

    def test_no_truncation_when_the_budget_is_generous(self) -> None:
        text, omitted = se.render_digest(self.blocks, 500000)
        self.assertEqual(omitted, [])
        self.assertNotIn("truncated", text)

    def test_skip_blanks_mode_omits_blank_markers(self) -> None:
        text, _ = se.render_digest(se.build_digest(self.export, skip_blanks=True))
        self.assertNotIn(cc.BLANK_MARK, text)
        self.assertIn("Total population", text)

    def test_digest_survives_a_malformed_export(self) -> None:
        text, _ = se.render_digest(se.build_digest({"components": "nope"}))
        self.assertIn("SEHRA Scoping Module", text)


if __name__ == "__main__":
    unittest.main(verbosity=2)
