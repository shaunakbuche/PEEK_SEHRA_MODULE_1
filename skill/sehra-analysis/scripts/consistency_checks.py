#!/usr/bin/env python3
"""
Deterministic completeness and consistency checks over a SEHRA Module 1 export.

Every number in the completeness review is checked here, by code, before any
model reasoning happens. The model receives this output as established fact and
must not recompute arithmetic itself.

Usage:
    python3 consistency_checks.py <export.json>
    python3 consistency_checks.py <export.json> --json
    python3 consistency_checks.py <export.json> --severity major

Importable:
    from consistency_checks import load_export, run_all_checks, format_report

Standard library only. Targets Python 3.9+. Never raises on odd or missing
fields: anything unparseable is reported as a finding, not an exception.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from typing import Any, Dict, Iterator, List, Optional, Sequence, Tuple

SEVERITIES = ("major", "minor")

BLANK_MARK = "[blank]"


# ---------------------------------------------------------------- basics ----

def _s(v: Any) -> str:
    """Coerce anything to a plain string. None becomes ""."""
    if v is None:
        return ""
    if isinstance(v, str):
        return v
    return str(v)


def _txt(v: Any) -> str:
    """Trimmed string form of a value."""
    return _s(v).strip()


def _is_blank(v: Any) -> bool:
    return _txt(v) == ""


def _as_list(v: Any) -> List[Any]:
    return list(v) if isinstance(v, list) else []


def _as_dict(v: Any) -> Dict[str, Any]:
    return dict(v) if isinstance(v, dict) else {}


def finding(
    code: str,
    severity: str,
    category: str,
    location: str,
    issue: str,
    evidence: Optional[Dict[str, Any]] = None,
    rule: str = "",
) -> Dict[str, Any]:
    """One structured finding. `evidence` carries the numbers behind the claim."""
    return {
        "code": code,
        "severity": severity if severity in SEVERITIES else "minor",
        "category": category,
        "location": location,
        "issue": issue,
        "evidence": evidence or {},
        "rule": rule,
    }


# -------------------------------------------------------- number parsing ----

# Grouped form first ("12,340" / "12 340"), then plain, then bare decimal.
_NUM_RE = re.compile(
    r"[-+]?\d{1,3}(?:[, \s]\d{3})+(?:\.\d+)?"
    r"|[-+]?\d+(?:\.\d+)?"
    r"|[-+]?\.\d+"
)

_TRAILING_TRUNCATION = re.compile(r"(?:[,;:/+\-–—]|\b(?:and|or|the|of|to|in|with|for|by|is|are|was|were)\b)\s*$", re.I)

_PLACEHOLDER_PENDING = {
    "tbc", "tbd", "to be confirmed", "to be completed", "pending", "todo",
    "to do", "?", "??", "???", "xxx", "xx", "tba", "to be advised",
}
_PLACEHOLDER_NA = {
    "n/a", "na", "n.a.", "not applicable", "none", "nil", "-", "--", ".",
}


@dataclass
class ParsedNumber:
    """The outcome of reading a free-text cell as a number."""

    raw: str
    value: Optional[float] = None
    is_percent: bool = False
    has_extra_text: bool = False
    truncated: bool = False
    is_range: bool = False
    placeholder: str = ""  # "pending" | "na" | ""

    @property
    def ok(self) -> bool:
        return self.value is not None

    @property
    def display(self) -> str:
        if self.value is None:
            return self.raw
        v = self.value
        shown = str(int(v)) if abs(v - round(v)) < 1e-9 else ("%g" % v)
        return shown + ("%" if self.is_percent else "")


def parse_number(raw: Any) -> ParsedNumber:
    """
    Read a number out of a free-text answer, tolerating thousands separators,
    percent signs, currency symbols, spaces and trailing prose.

    Flags rather than fails: a value that cannot be read comes back with
    value=None and the reason recorded on the returned object.
    """
    text = _txt(raw)
    out = ParsedNumber(raw=text)
    if not text:
        return out

    low = text.lower()
    if low in _PLACEHOLDER_PENDING:
        out.placeholder = "pending"
        return out
    if low in _PLACEHOLDER_NA:
        out.placeholder = "na"
        return out

    out.truncated = bool(_TRAILING_TRUNCATION.search(text)) and len(text) > 1
    out.is_percent = "%" in text or "percent" in low or "per cent" in low

    matches = _NUM_RE.findall(text)
    if not matches:
        return out

    # "10-20" / "10 to 20" is a range, not a single figure.
    if len(matches) > 1 and re.search(r"\d\s*(?:-|–|to)\s*\d", text):
        out.is_range = True

    first = matches[0]
    cleaned = re.sub(r"[, \s]", "", first)
    try:
        out.value = float(cleaned)
    except ValueError:
        return out

    consumed = len(first)
    remainder = re.sub(r"[%\s,\.]", "", text.replace(first, "", 1))
    out.has_extra_text = bool(re.search(r"[a-z]", remainder, re.I)) or len(matches) > 1
    if consumed == 0:
        out.value = None
    return out


def _fmt(v: float) -> str:
    return str(int(v)) if abs(v - round(v)) < 1e-9 else ("%g" % v)


# ------------------------------------------------------------- traversal ----

@dataclass
class QCtx:
    """A question plus where it sits, so every finding can name its location."""

    component_id: str
    component_number: Any
    component_title: str
    subsection_id: str
    subsection_title: str
    question: Dict[str, Any]

    @property
    def qid(self) -> str:
        return _txt(self.question.get("id"))

    @property
    def qtype(self) -> str:
        return _txt(self.question.get("type")).lower()

    @property
    def qtext(self) -> str:
        return _txt(self.question.get("text"))

    @property
    def help(self) -> str:
        return _txt(self.question.get("help"))

    @property
    def component_label(self) -> str:
        if self.component_id == "context":
            return "Context"
        return "Component %s%s" % (
            self.component_number,
            " %s" % self.component_title if self.component_title else "",
        )

    @property
    def location(self) -> str:
        bits = [self.component_label]
        sub = " ".join(x for x in (self.subsection_id, self.subsection_title) if x)
        if sub:
            bits.append(sub)
        label = self.qtext or self.qid
        if len(label) > 90:
            label = label[:87] + "..."
        bits.append(label)
        return " > ".join(bits)

    @property
    def label_blob(self) -> str:
        """Question text plus help, for unit and topic heuristics."""
        return (self.qtext + " " + self.help).lower()


def load_export(path_or_obj: Any) -> Dict[str, Any]:
    """
    Load an export and return the inner `sehraExport` object.

    Accepts a file path, a file-like object, a JSON string, or an already
    parsed dict (wrapped or unwrapped).
    """
    data: Any
    if isinstance(path_or_obj, dict):
        data = path_or_obj
    elif hasattr(path_or_obj, "read"):
        data = json.load(path_or_obj)
    else:
        text = _s(path_or_obj)
        if text.lstrip().startswith("{"):
            data = json.loads(text)
        else:
            with open(text, "r", encoding="utf-8") as fh:
                data = json.load(fh)
    if not isinstance(data, dict):
        return {}
    inner = data.get("sehraExport")
    return _as_dict(inner) if isinstance(inner, dict) else data


def iter_questions(export: Dict[str, Any]) -> Iterator[QCtx]:
    """Walk every question in the export, skipping structural noise."""
    for comp in _as_list(export.get("components")):
        comp = _as_dict(comp)
        cid = _txt(comp.get("id"))
        cnum = comp.get("number")
        ctitle = _txt(comp.get("title"))
        for sub in _as_list(comp.get("subsections")):
            sub = _as_dict(sub)
            sid = _txt(sub.get("id"))
            stitle = _txt(sub.get("title"))
            for q in _as_list(sub.get("questions")):
                if not isinstance(q, dict):
                    continue
                if _txt(q.get("type")).lower() == "note":
                    continue
                yield QCtx(cid, cnum, ctitle, sid, stitle, q)


def table_of(q: Dict[str, Any]) -> Tuple[List[str], List[str], List[List[str]]]:
    """Normalise a question's table into (cols, rows, cells[row][col])."""
    tbl = _as_dict(q.get("table"))
    cols = [_txt(c) for c in _as_list(tbl.get("cols"))]
    rows = [_txt(r) for r in _as_list(tbl.get("rows"))]
    raw_cells = _as_list(tbl.get("cells"))
    cells: List[List[str]] = []
    for ri in range(len(rows)):
        row = _as_list(raw_cells[ri]) if ri < len(raw_cells) else []
        cells.append([_txt(row[ci]) if ci < len(row) else "" for ci in range(len(cols))])
    return cols, rows, cells


def group_items(q: Dict[str, Any]) -> List[Tuple[str, str]]:
    out: List[Tuple[str, str]] = []
    for it in _as_list(q.get("items")):
        it = _as_dict(it)
        out.append((_txt(it.get("label")), _txt(it.get("answer"))))
    return out


def reflections_of(q: Dict[str, Any]) -> Tuple[List[str], List[str]]:
    refl = _as_dict(q.get("reflections"))
    ch = [_txt(x) for x in _as_list(refl.get("challenges")) if _txt(x)]
    su = [_txt(x) for x in _as_list(refl.get("supports")) if _txt(x)]
    return ch, su


# --------------------------------------------------------- yes/no polarity ---

_NA_OPTION = re.compile(r"does not exist|no .* exists?|not applicable|no sector plan", re.I)


def yn_polarity(answer: Any) -> str:
    """
    Map a Yes/No answer onto "yes" | "no" | "na" | "other" | "" (unanswered).

    The form offers alternative negative labels ("No policy exists", "Does not
    exist", "This does not exist"), so anything that reads as a declared absence
    is treated as "na": a negative answer for which no detail is expected.
    """
    a = _txt(answer)
    if not a:
        return ""
    low = a.lower()
    if _NA_OPTION.search(low):
        return "na"
    if low.startswith("yes"):
        return "yes"
    if low.startswith("no"):
        return "no"
    return "other"


_ASKS_ON_YES = re.compile(r"if\s*['\"‘“]?yes", re.I)
_ASKS_ON_NO = re.compile(r"if\s*['\"‘“]?no", re.I)
# Help that poses its own questions ("Which ministry? What is the annual public
# expenditure?") asks for the same detail without saying "If yes". Help that only
# explains a term ("EMIS is the education sector's routine data system.") does
# not, so the presence of help alone is never treated as a prompt.
_HELP_PROMPTS = re.compile(r"\?")


# ----------------------------------------------------- blank classification --

CONDITIONAL_RULES = {
    "parent_unanswered": (
        "Remarks left blank while the parent Yes/No is itself unanswered. The "
        "unanswered Yes/No is reported instead, so the same gap is not counted twice."
    ),
    "negative_parent": (
        "Remarks left blank after a negative answer (No / does not exist) where "
        "the question only prompts for detail on Yes. Nothing further is expected."
    ),
    "na_value": "Answered explicitly as not applicable.",
    "optional_detail": (
        "Optional supporting detail (notes, references, further opportunities) "
        "left blank. Acceptable unless the reviewer wants the detail."
    ),
}

_OPTIONAL_TEXT = re.compile(
    r"additional notes|references|please list|if available|opportunit|"
    r"other care|maximum\)?$|any other",
    re.I,
)


def classify_blanks(export: Dict[str, Any]) -> Dict[str, Any]:
    """
    Split every blank into a likely-genuine gap or a likely-conditional blank.

    Conservative by design: a blank is only called conditional when a stated
    rule applies (see CONDITIONAL_RULES). Everything else is a genuine gap.
    """
    genuine: List[Dict[str, Any]] = []
    conditional: List[Dict[str, Any]] = []

    def add(target: List[Dict[str, Any]], ctx: QCtx, what: str, rule: str, severity: str = "major") -> None:
        target.append({
            "location": ctx.location,
            "questionId": ctx.qid,
            "component": ctx.component_id,
            "subsection": ctx.subsection_id,
            "what": what,
            "rule": rule,
            "severity": severity,
        })

    for ctx in iter_questions(export):
        q = ctx.question
        qt = ctx.qtype
        answer = q.get("answer")
        remarks = q.get("remarks")

        if qt == "yn":
            pol = yn_polarity(answer)
            if pol == "":
                add(genuine, ctx, "Yes/No answer", "A Yes/No question was left unanswered.", "major")
                if _is_blank(remarks):
                    add(conditional, ctx, "remarks", CONDITIONAL_RULES["parent_unanswered"], "minor")
                continue
            if _is_blank(remarks):
                asks_on_yes = bool(_ASKS_ON_YES.search(ctx.help))
                help_prompts = bool(_HELP_PROMPTS.search(ctx.help))
                prompts_on_no = bool(_ASKS_ON_NO.search(ctx.help))
                if pol == "yes":
                    if asks_on_yes:
                        add(genuine, ctx, "remarks after a Yes",
                            "Answered Yes, and the question explicitly asks for detail on Yes.",
                            "major")
                    elif help_prompts:
                        add(genuine, ctx, "remarks after a Yes",
                            "Answered Yes, and the guidance on this question poses follow-up "
                            "questions that nothing answers.", "major")
                    else:
                        add(genuine, ctx, "remarks after a Yes",
                            "Answered Yes with no supporting detail recorded.", "minor")
                elif pol in ("no", "na") and prompts_on_no:
                    add(genuine, ctx, "remarks after a No",
                        "Answered No and the question explicitly asks for detail on No.", "major")
                elif pol in ("no", "na"):
                    add(conditional, ctx, "remarks", CONDITIONAL_RULES["negative_parent"], "minor")
                else:
                    add(conditional, ctx, "remarks", CONDITIONAL_RULES["optional_detail"], "minor")
            continue

        if qt in ("text", "field"):
            if _is_blank(answer):
                optional = bool(_OPTIONAL_TEXT.search(ctx.qtext))
                if optional:
                    add(conditional, ctx, "free-text answer", CONDITIONAL_RULES["optional_detail"], "minor")
                else:
                    add(genuine, ctx, "answer",
                        "A required single-value or free-text question was left blank.",
                        "major" if qt == "field" else "minor")
            elif _txt(answer).lower() in _PLACEHOLDER_NA:
                add(conditional, ctx, "answer", CONDITIONAL_RULES["na_value"], "minor")
            continue

        if qt == "table":
            cols, rows, cells = table_of(q)
            total = len(rows) * len(cols)
            filled = sum(1 for r in cells for c in r if c)
            if total and filled == 0:
                add(genuine, ctx, "entire table", "No cell in the table carries a value.", "major")
            elif total and filled < total:
                add(genuine, ctx, "%d of %d table cells" % (total - filled, total),
                    "Individual table cells left blank in an otherwise completed table.", "minor")
            continue

        if qt == "group":
            items = group_items(q)
            blanks = [lbl for lbl, ans in items if not ans]
            if items and len(blanks) == len(items):
                add(genuine, ctx, "entire checklist",
                    "No checklist item was answered. Checklists may legitimately be "
                    "partly skipped, so this is minor unless the topic is core.", "minor")
            elif blanks:
                add(conditional, ctx, "%d of %d checklist items" % (len(blanks), len(items)),
                    "Checklist items are ticked where they apply, so unticked items are "
                    "not necessarily gaps.", "minor")
            continue

        if qt == "reflections":
            ch, su = reflections_of(q)
            if not ch and not su:
                add(genuine, ctx, "reflections", "Neither challenges nor supporting factors were recorded.", "major")
            elif not ch or not su:
                add(genuine, ctx, "reflections (%s missing)" % ("challenges" if not ch else "supporting factors"),
                    "Only one side of the reflections was completed.", "minor")
            continue

    extras = _as_dict(export.get("summaryExtras"))
    extra_labels = {
        "sum_gaps": "Evidence gaps / open questions",
        "sum_groups": "Parent-teacher and child/community groups",
        "sum_unserved": "Groups with no eye screening service",
    }
    for key, label in extra_labels.items():
        if key in extras and _is_blank(extras.get(key)):
            genuine.append({
                "location": "Final summary / additional items > %s" % label,
                "questionId": key,
                "component": "summary",
                "subsection": "",
                "what": "answer",
                "rule": "A final summary field was left blank.",
                "severity": "major",
            })

    return {"genuine": genuine, "conditional": conditional}


# -------------------------------------------------------- completeness ------

def completeness_stats(export: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recompute completion from the questions themselves.

    Unit rule: a Yes/No question counts as one unit (its answer); a text or
    single field counts as one; a checklist counts one per item; a table counts
    one per cell; reflections count as one. Remarks are tracked separately so a
    single question is never double counted.
    """
    by_component: List[Dict[str, Any]] = []
    totals = {"total": 0, "answered": 0}
    remarks = {"expected": 0, "given": 0}
    per_comp: Dict[str, Dict[str, Any]] = {}
    order: List[str] = []

    for ctx in iter_questions(export):
        q = ctx.question
        qt = ctx.qtype
        cid = ctx.component_id
        if cid not in per_comp:
            per_comp[cid] = {
                "id": cid,
                "title": ctx.component_title,
                "number": ctx.component_number,
                "total": 0,
                "answered": 0,
                "subsections": {},
                "subOrder": [],
            }
            order.append(cid)
        bucket = per_comp[cid]
        sub_key = (ctx.subsection_id + " " + ctx.subsection_title).strip()
        if sub_key not in bucket["subsections"]:
            bucket["subsections"][sub_key] = {"id": ctx.subsection_id, "title": ctx.subsection_title,
                                              "total": 0, "answered": 0}
            bucket["subOrder"].append(sub_key)
        sub = bucket["subsections"][sub_key]

        unit_total, unit_done = 0, 0
        if qt == "yn":
            unit_total, unit_done = 1, (0 if _is_blank(q.get("answer")) else 1)
            if yn_polarity(q.get("answer")) == "yes":
                remarks["expected"] += 1
                if not _is_blank(q.get("remarks")):
                    remarks["given"] += 1
        elif qt in ("text", "field"):
            unit_total, unit_done = 1, (0 if _is_blank(q.get("answer")) else 1)
        elif qt == "table":
            cols, rows, cells = table_of(q)
            unit_total = len(rows) * len(cols)
            unit_done = sum(1 for r in cells for c in r if c)
        elif qt == "group":
            items = group_items(q)
            unit_total = len(items)
            unit_done = sum(1 for _, a in items if a)
        elif qt == "reflections":
            ch, su = reflections_of(q)
            unit_total, unit_done = 1, (1 if (ch or su) else 0)

        for target in (totals, bucket, sub):
            target["total"] += unit_total
            target["answered"] += unit_done

    for cid in order:
        b = per_comp[cid]
        subs = [dict(b["subsections"][k], percent=_pct(b["subsections"][k])) for k in b["subOrder"]]
        by_component.append({
            "id": b["id"],
            "number": b["number"],
            "title": b["title"],
            "total": b["total"],
            "answered": b["answered"],
            "percent": _pct(b),
            "subsections": subs,
        })

    computed = {
        "totalFields": totals["total"],
        "answeredFields": totals["answered"],
        "percent": _pct(totals),
        "byComponent": by_component,
        "remarksExpectedAfterYes": remarks["expected"],
        "remarksGivenAfterYes": remarks["given"],
    }
    return {"declared": _as_dict(export.get("completion")), "computed": computed}


def _pct(bucket: Dict[str, Any]) -> int:
    total = bucket.get("total") or 0
    if not total:
        return 0
    return int(round(100.0 * (bucket.get("answered") or 0) / total))


# -------------------------------------------------- what a label asks for ---
# Shared by the arithmetic checks (which figures may be added at all) and the
# unit checks (which figures were entered in the wrong unit).

_RATE_TOKENS = ("rate", "percentage", "per cent", "percent", "proportion", "coverage",
                "attendance", "%")
_AMBIGUOUS_TOKENS = ("enrolment", "enrollment")
_COUNT_TOKENS = ("number of", "how many", "no. of", "count of", "total number", "number and type")


def _label_expects(blob: str) -> str:
    """Classify a label as expecting a "rate", a "count", "ambiguous" or ""."""
    low = blob.lower()
    has_rate = any(t in low for t in _RATE_TOKENS)
    has_count = any(t in low for t in _COUNT_TOKENS)
    has_amb = any(t in low for t in _AMBIGUOUS_TOKENS)
    if has_rate and (has_count or has_amb):
        return "ambiguous"
    if has_rate:
        return "rate"
    if has_count or has_amb:
        return "count"
    return ""


# ------------------------------------------------------------- arithmetic ---

# No percentage reaches this magnitude, not even a gross ratio above 100, so a
# value this large settles an otherwise ambiguous label in favour of counts.
_COUNT_MAGNITUDE = 1000.0

_TOTAL_EXACT = re.compile(r"^\s*(?:sub\s*-?\s*)?totals?\s*$", re.I)
# Greedy prefix so "NGO/Faith / Total" splits on the LAST separator, matching
# how _AXIS_SPLIT reads its siblings "NGO/Faith / M" and "NGO/Faith / F".
_TOTAL_GROUPED = re.compile(r"^(?P<prefix>.+)[/|–-]\s*(?:sub\s*-?\s*)?totals?\s*$", re.I)
_AXIS_SPLIT = re.compile(r"^(?P<prefix>.+)[/|–-]\s*(?P<rest>[^/|–-]+)$")


def _label_is_total(label: str) -> bool:
    return bool(_TOTAL_EXACT.match(_txt(label)))


def _total_targets(labels: Sequence[str]) -> List[Dict[str, Any]]:
    """
    Find axis positions that ought to equal the sum of their siblings.

    Two shapes are recognised:
      exact   - a label literally named "Total"; siblings are every other label
                on the axis that is not itself a total (so grouped totals never
                get double counted).
      grouped - a label of the form "<prefix> / Total"; siblings are the other
                labels sharing that prefix.
    """
    out: List[Dict[str, Any]] = []
    norm = [_txt(l) for l in labels]

    for idx, lbl in enumerate(norm):
        if _label_is_total(lbl):
            siblings = [i for i, other in enumerate(norm)
                        if i != idx and other and not _label_is_total(other)
                        and not _TOTAL_GROUPED.match(other)]
            if len(siblings) >= 2:
                out.append({"kind": "exact", "index": idx, "label": lbl, "siblings": siblings})
            continue
        m = _TOTAL_GROUPED.match(lbl)
        if m:
            prefix = _txt(m.group("prefix")).lower()
            siblings = []
            for i, other in enumerate(norm):
                if i == idx or not other:
                    continue
                om = _AXIS_SPLIT.match(other)
                if not om:
                    continue
                if _txt(om.group("prefix")).lower() != prefix:
                    continue
                if _label_is_total(_txt(om.group("rest"))):
                    continue
                siblings.append(i)
            if len(siblings) >= 2:
                out.append({"kind": "grouped", "index": idx, "label": lbl, "siblings": siblings})
    return out


def check_table_totals(export: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Verify every column or row named Total against the sum of its siblings.

    Only tables of counts are summed. A rate or percentage table is checked
    against the range of its parts instead, because a total rate is a weighted
    mean and adding rates across disjoint categories is meaningless.
    """
    out: List[Dict[str, Any]] = []

    for ctx in iter_questions(export):
        if ctx.qtype != "table":
            continue
        cols, rows, cells = table_of(ctx.question)
        if not cols or not rows:
            continue

        def cell(ri: int, ci: int) -> str:
            return cells[ri][ci] if ri < len(cells) and ci < len(cells[ri]) else ""

        # A "Total" column: for each row, total column == sum of sibling columns.
        for target in _total_targets(cols):
            for ri, rlabel in enumerate(rows):
                out.extend(_compare_total(
                    ctx, "column", target, rlabel,
                    [(cols[ci], cell(ri, ci)) for ci in target["siblings"]],
                    cell(ri, target["index"]),
                ))

        # A "Total" row: for each column, total row == sum of sibling rows.
        for target in _total_targets(rows):
            for ci, clabel in enumerate(cols):
                out.extend(_compare_total(
                    ctx, "row", target, clabel,
                    [(rows[ri], cell(ri, ci)) for ri in target["siblings"]],
                    cell(target["index"], ci),
                ))
    return out


def _compare_total(
    ctx: QCtx,
    axis: str,
    target: Dict[str, Any],
    cross_label: str,
    siblings: List[Tuple[str, str]],
    total_raw: str,
) -> List[Dict[str, Any]]:
    """Compare one declared total against its siblings, or explain why it cannot be."""
    where = "%s (%s %s, %s)" % (ctx.location, axis, target["label"], cross_label)
    parsed_total = parse_number(total_raw)
    parsed_sibs = [(lbl, parse_number(raw)) for lbl, raw in siblings]
    usable = [(lbl, p) for lbl, p in parsed_sibs if p.ok]
    missing = [lbl for lbl, p in parsed_sibs if not p.ok]

    if not parsed_total.ok:
        if usable and _txt(total_raw):
            return [finding(
                "ARITH_UNVERIFIABLE_TOTAL", "minor", "arithmetic", where,
                "The declared total could not be read as a number, so it cannot be checked.",
                {"declaredTotalRaw": total_raw, "siblingValues": [[l, p.display] for l, p in usable]},
                "A total is only checked when both it and all of its siblings parse as numbers.",
            )]
        return []

    if missing:
        return [finding(
            "ARITH_UNVERIFIABLE_TOTAL", "minor", "arithmetic", where,
            "A total is present but %d contributing value(s) are blank or unreadable, "
            "so the sum cannot be verified." % len(missing),
            {"declaredTotal": parsed_total.display, "missingContributors": missing,
             "readableContributors": [[l, p.display] for l, p in usable]},
            "A total is only checked when both it and all of its siblings parse as numbers.",
        )]

    if len(usable) < 2:
        return []

    pct_flags = {p.is_percent for _, p in usable} | {parsed_total.is_percent}
    if len(pct_flags) > 1:
        return [finding(
            "UNIT_MIXED_TOTAL", "minor", "units", where,
            "The total and its contributing values do not agree on units: some carry a "
            "percent sign and some do not.",
            {"declaredTotal": parsed_total.display,
             "contributors": [[l, p.display] for l, p in usable]},
            "Percent and count values are never summed together.",
        )]

    # Whether these figures may be added at all. A percent sign settles it, but a
    # table headed "rate" is very often filled with bare numbers, so the question
    # text and both axis labels decide as well. Getting this wrong is expensive:
    # summing rates across disjoint categories manufactures an arithmetic error
    # that the assessor never made.
    expects = _label_expects(" ".join(
        [ctx.label_blob, _txt(target["label"]), _txt(cross_label)]
        + [_txt(lbl) for lbl, _ in siblings]
    ))
    values = [p.value or 0.0 for _, p in usable]
    total_value = parsed_total.value or 0.0

    if parsed_total.is_percent or expects == "rate":
        return _check_rate_total(ctx, where, axis, target, cross_label, parsed_total, usable)

    total_sum = sum(values)
    diff = total_value - total_sum
    if abs(diff) <= 1e-6:
        return []

    # "Enrolment ... or Net Enrolment Rate" style labels genuinely allow either
    # unit. Figures too large to be a percentage settle it as counts; anything
    # smaller could be either, so the difference is raised for a human to judge
    # rather than asserted as an arithmetic error.
    if expects == "ambiguous" and max(values + [abs(total_value)]) < _COUNT_MAGNITUDE:
        return [finding(
            "ARITH_TOTAL_UNRECONCILED", "minor", "arithmetic", where,
            "The declared total of %s does not equal the sum of its parts, %s, but this label "
            "allows either counts or rates, so the two cannot be reconciled by script." % (
                parsed_total.display, _fmt(total_sum)),
            {
                "declaredTotal": total_value,
                "computedSum": total_sum,
                "difference": diff,
                "contributors": [[l, p.value] for l, p in usable],
                "table": ctx.qtext,
                "axis": axis,
                "totalLabel": target["label"],
                "crossLabel": cross_label,
            },
            "A label naming both a count and a rate is only summed when a value is too large "
            "to be a percentage. Otherwise the mismatch is reported for a human to judge, "
            "never stated as an arithmetic error.",
        )]

    return [finding(
        "ARITH_TOTAL_MISMATCH", "major", "arithmetic", where,
        "The declared total of %s does not equal the sum of its parts, %s "
        "(difference %s%s)." % (
            parsed_total.display, _fmt(total_sum), _fmt(abs(diff)),
            " too high" if diff > 0 else " too low",
        ),
        {
            "declaredTotal": total_value,
            "computedSum": total_sum,
            "difference": diff,
            "contributors": [[l, p.value] for l, p in usable],
            "table": ctx.qtext,
            "axis": axis,
            "totalLabel": target["label"],
            "crossLabel": cross_label,
        },
        "A column or row named Total (or '<group> / Total') in a table of counts must equal "
        "the sum of its siblings.",
    )]


def _check_rate_total(
    ctx: QCtx,
    where: str,
    axis: str,
    target: Dict[str, Any],
    cross_label: str,
    parsed_total: ParsedNumber,
    usable: List[Tuple[str, ParsedNumber]],
) -> List[Dict[str, Any]]:
    """
    Check a total in a rate table the only way its semantics allow.

    A combined rate is a weighted mean of its parts, never their sum, so adding
    88 and 86 to test a total of 87 would invent an error. The weights (the
    denominators behind each rate) are not collected by this module, so the
    figure cannot be recomputed. What does hold whatever the weights are is that
    a weighted mean lies between the smallest and the largest of its parts, so
    only that is checked, and only ever as minor.
    """
    values = [p.value or 0.0 for _, p in usable]
    low, high = min(values), max(values)
    total_value = parsed_total.value or 0.0
    if low - 1e-6 <= total_value <= high + 1e-6:
        return []

    return [finding(
        "ARITH_RATE_TOTAL_OUT_OF_RANGE", "minor", "arithmetic", where,
        "The combined rate of %s falls outside the range of the rates it combines (%s to %s), "
        "which a weighted average cannot do." % (parsed_total.display, _fmt(low), _fmt(high)),
        {
            "declaredTotal": total_value,
            "contributorRange": [low, high],
            "contributors": [[l, p.value] for l, p in usable],
            "table": ctx.qtext,
            "axis": axis,
            "totalLabel": target["label"],
            "crossLabel": cross_label,
        },
        "Percentages and rates across separate categories are never added together. A total "
        "rate is a weighted mean of its parts, so it is only checked against their range; the "
        "denominators needed to recompute it are not collected by this module.",
    )]


# ------------------------------------------------------- units and values ---

def check_units(export: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Flag counts entered where a rate belongs and rates entered where a count
    belongs, plus rows that mix the two. Findings are aggregated per question so
    one mis-filled table produces one finding, not forty.
    """
    out: List[Dict[str, Any]] = []

    for ctx in iter_questions(export):
        q = ctx.question
        qt = ctx.qtype

        if qt in ("text", "field"):
            expects = _label_expects(ctx.label_blob)
            p = parse_number(q.get("answer"))
            if expects and p.ok:
                hit = _unit_mismatch(expects, p)
                if hit:
                    out.append(_unit_finding(ctx, ctx.location, hit, [[ctx.qtext, p.display]]))
            continue

        if qt != "table":
            continue

        cols, rows, cells = table_of(q)
        base = _label_expects(ctx.label_blob)
        offenders: Dict[str, List[List[str]]] = {}

        for ri, rlabel in enumerate(rows):
            row_values: List[Tuple[str, ParsedNumber]] = []
            for ci, clabel in enumerate(cols):
                raw = cells[ri][ci] if ri < len(cells) and ci < len(cells[ri]) else ""
                if not raw:
                    continue
                p = parse_number(raw)
                if not p.ok:
                    continue
                row_values.append((clabel, p))
                expects = _label_expects(" ".join([ctx.label_blob, rlabel, clabel])) or base
                if not expects or _label_is_total(clabel):
                    continue
                hit = _unit_mismatch(expects, p)
                if hit:
                    offenders.setdefault(hit, []).append(["%s / %s" % (rlabel, clabel), p.display])

            counts = [(l, p) for l, p in row_values if not p.is_percent and (p.value or 0) > 100]
            pcts = [(l, p) for l, p in row_values if p.is_percent]
            if counts and pcts:
                out.append(finding(
                    "UNIT_MIXED_ROW", "minor", "units",
                    "%s (row %s)" % (ctx.location, rlabel),
                    "This row mixes percentages and large counts, so the unit of the row is unclear.",
                    {"percentValues": [[l, p.display] for l, p in pcts],
                     "countValues": [[l, p.display] for l, p in counts]},
                    "Within one row, a value carrying % alongside a value above 100 without % "
                    "indicates two different units.",
                ))

        for hit, examples in offenders.items():
            out.append(_unit_finding(ctx, ctx.location, hit, examples))

    return out


def _unit_mismatch(expects: str, p: ParsedNumber) -> str:
    """Return a mismatch code, or "" when the value suits the label."""
    v = p.value or 0.0
    if expects == "rate" and not p.is_percent and v > 100:
        return "UNIT_COUNT_IN_RATE_FIELD"
    if expects == "count" and p.is_percent:
        return "UNIT_RATE_IN_COUNT_FIELD"
    if expects == "ambiguous" and not p.is_percent and v > 100:
        return "UNIT_AMBIGUOUS"
    return ""


_UNIT_TEXT = {
    "UNIT_COUNT_IN_RATE_FIELD": (
        "major",
        "The label asks for a rate or percentage but the value is a large whole number "
        "with no percent sign, so a count appears to have been entered instead of a rate.",
        "A label containing rate/percentage/proportion/coverage/attendance with a value "
        "above 100 and no % sign is read as a count in a rate field.",
    ),
    "UNIT_RATE_IN_COUNT_FIELD": (
        "major",
        "The label asks for a number of things but the value carries a percent sign, so a "
        "rate appears to have been entered instead of a count.",
        "A label containing 'number of'/'how many' with a value carrying % is read as a "
        "rate in a count field.",
    ),
    "UNIT_AMBIGUOUS": (
        "minor",
        "The label allows either a count or a rate and the value is a large whole number. "
        "Confirm which unit was intended so it is not read as a percentage.",
        "A label naming both enrolment and a rate is ambiguous, so large values are only "
        "queried, not called an error.",
    ),
}


def _unit_finding(ctx: QCtx, where: str, code: str, examples: List[List[str]]) -> Dict[str, Any]:
    severity, issue, rule = _UNIT_TEXT[code]
    return finding(code, severity, "units", where, issue,
                   {"values": examples[:8], "valueCount": len(examples), "question": ctx.qtext},
                   rule)


def check_values(export: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Flag truncated and placeholder values wherever text was entered."""
    out: List[Dict[str, Any]] = []

    def inspect(where: str, raw: str) -> None:
        text = _txt(raw)
        if not text:
            return
        p = parse_number(text)
        if p.placeholder == "pending":
            out.append(finding(
                "VALUE_PLACEHOLDER", "minor", "value quality", where,
                "The field holds a placeholder rather than an answer.",
                {"value": text},
                "Values such as TBC, TBD, pending or ? are placeholders awaiting completion.",
            ))
            return
        if p.truncated and len(text) > 1:
            out.append(finding(
                "VALUE_TRUNCATED", "minor", "value quality", where,
                "The value appears to have been cut off mid-entry.",
                {"value": text, "endsWith": text[-12:]},
                "A value ending in a comma, slash, dash or a dangling conjunction is treated "
                "as truncated.",
            ))

    for ctx in iter_questions(export):
        q = ctx.question
        qt = ctx.qtype
        if qt in ("text", "field"):
            inspect(ctx.location, _txt(q.get("answer")))
        if qt in ("yn", "group"):
            rem = _txt(q.get("remarks"))
            if rem:
                inspect("%s (remarks)" % ctx.location, rem)
        if qt == "group":
            for lbl, ans in group_items(q):
                inspect("%s > %s" % (ctx.location, lbl), ans)
        if qt == "table":
            cols, rows, cells = table_of(q)
            for ri, rlabel in enumerate(rows):
                for ci, clabel in enumerate(cols):
                    raw = cells[ri][ci] if ri < len(cells) and ci < len(cells[ri]) else ""
                    inspect("%s (%s / %s)" % (ctx.location, rlabel, clabel), raw)

    extras = _as_dict(export.get("summaryExtras"))
    for key, val in extras.items():
        inspect("Final summary / additional items > %s" % key, _txt(val))

    return out


# ------------------------------------------------------- logic consistency --

_BENIGN = [
    r"\bno major\b", r"\bno significant\b", r"\bno additional\b", r"\bno cost\b",
    r"\bno charge\b", r"\bfree of charge\b", r"\bat no cost\b", r"\bno fee\b",
    r"\bno longer needed\b", r"\bno objection\b",
]

_ABSENCE_MAJOR = [
    r"\bdoes not exist\b", r"\bdo not exist\b", r"\bdid not exist\b",
    r"\bthere is no\b", r"\bthere are no\b", r"\bthere was no\b",
    r"\bnot available\b", r"\bis unavailable\b", r"\bare unavailable\b",
    r"\bnon-?\s?functional\b", r"\bnot functional\b", r"\bnot operational\b",
    r"\bnot in place\b", r"\bno such\b", r"\bnone exist\b", r"\bnone are\b",
    r"\bnone of (?:these|them|the)\b", r"\bnot been established\b",
]

_ABSENCE_MINOR = [
    r"\babsent\b", r"\bis lacking\b", r"\bare lacking\b", r"\black of\b",
    r"\bno evidence\b", r"\bnot present\b", r"\bnil\b", r"\bnever\b",
    r"\bnot yet\b", r"\bno formal\b", r"\bno dedicated\b", r"\bno specific\b",
    r"\bdefunct\b", r"\bdormant\b", r"\bhas not met\b", r"\bhave not met\b",
    r"\bno budget\b", r"\bnot implemented\b",
]

_PRESENCE = [
    r"\bexists?\b", r"\bis available\b", r"\bare available\b", r"\bis in place\b",
    r"\bare in place\b", r"\bis functional\b", r"\bis operational\b",
    r"\bhas been established\b", r"\bhave been established\b",
    r"\bis provided\b", r"\bare provided\b", r"\bis ongoing\b", r"\bis active\b",
]


def _strip_benign(text: str) -> str:
    out = text
    for pat in _BENIGN:
        out = re.sub(pat, " ", out, flags=re.I)
    return out


def _strip_negations(text: str) -> str:
    """Remove negated verb phrases so "not available" never reads as presence."""
    out = re.sub(r"\b(?:not|no longer|never|rarely|barely)\s+\w+(?:\s+\w+)?", " ", text, flags=re.I)
    out = re.sub(r"\bno\s+\w+", " ", out, flags=re.I)
    out = re.sub(r"\b(?:does|do|did|is|are|was|were|has|have|had|can|could|will|would)\s*n[o']t\b", " ", out, flags=re.I)
    return out


def _matches(patterns: Sequence[str], text: str) -> List[str]:
    hits: List[str] = []
    for pat in patterns:
        m = re.search(pat, text, re.I)
        if m:
            hits.append(m.group(0).strip())
    return hits


def check_yesno_logic(export: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Detect Yes/No answers contradicted by their own remarks.

    Yes plus absence language, and No plus presence language. Benign phrases
    ("no major challenges") are removed first, and presence matching only runs
    after negated verb phrases are stripped, so "not available" cannot be read
    as "available".
    """
    out: List[Dict[str, Any]] = []

    for ctx in iter_questions(export):
        if ctx.qtype not in ("yn", "group"):
            continue
        remarks = _txt(ctx.question.get("remarks"))
        if not remarks:
            continue
        pol = yn_polarity(ctx.question.get("answer"))
        cleaned = _strip_benign(remarks)

        if pol == "yes":
            major_hits = _matches(_ABSENCE_MAJOR, cleaned)
            minor_hits = _matches(_ABSENCE_MINOR, cleaned)
            if major_hits or minor_hits:
                out.append(finding(
                    "LOGIC_YES_BUT_ABSENCE",
                    "major" if major_hits else "minor",
                    "logical consistency", ctx.location,
                    "Answered Yes, but the remarks describe absence or non-functionality.",
                    {"answer": _txt(ctx.question.get("answer")), "remarks": remarks,
                     "absencePhrases": major_hits + minor_hits},
                    "A Yes answer whose remarks contain absence language (does not exist, "
                    "there is no, not available, non-functional, not in place) is a contradiction. "
                    "Benign phrases such as 'no major' are excluded.",
                ))
            continue

        if pol in ("no", "na"):
            presence_hits = _matches(_PRESENCE, _strip_negations(cleaned))
            if presence_hits:
                out.append(finding(
                    "LOGIC_NO_BUT_PRESENCE", "major", "logical consistency", ctx.location,
                    "Answered No, but the remarks describe something that exists or is available.",
                    {"answer": _txt(ctx.question.get("answer")), "remarks": remarks,
                     "presencePhrases": presence_hits},
                    "A No answer whose remarks contain presence language (exists, is available, "
                    "is in place, is functional) is a contradiction. Negated verb phrases are "
                    "stripped first so 'not available' is never counted.",
                ))

    return out


# ------------------------------------------------- cross-section duplicates --

_LABEL_NOISE = re.compile(r"\b(?:sector|sectors|level|levels|number|no|facilities|facility|of|the)\b", re.I)

_LABEL_ALIASES = {
    "ngo or faith-based": "ngo/faith-based",
    "ngo / faith-based": "ngo/faith-based",
    "ngo/fbo/other": "ngo/faith-based",
    "ngo / fbo / other": "ngo/faith-based",
    "faith based": "faith-based",
    "pre primary": "pre-primary",
    "middle sec": "middle secondary",
    "govt": "public",
    "government": "public",
}


def norm_label(s: Any) -> str:
    """Reduce an axis label to a comparable concept key."""
    t = _txt(s).lower()
    t = t.replace("&", " and ")
    t = re.sub(r"[^a-z0-9/\-\s]", " ", t)
    t = _LABEL_NOISE.sub(" ", t)
    t = re.sub(r"\s*/\s*", "/", t)
    t = re.sub(r"\s+", " ", t).strip()
    return _LABEL_ALIASES.get(t, t)


def check_cross_section_duplicates(export: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Compare tables in different components that describe the same grid.

    Two tables are treated as covering the same concept when, after label
    normalisation, they share at least two row labels and two column labels
    (in either orientation). Cells at a shared (row, column) pair should hold
    the same figure, so any difference is reported with both numbers.
    """
    out: List[Dict[str, Any]] = []
    tables: List[Tuple[QCtx, List[str], List[str], List[List[str]]]] = []
    for ctx in iter_questions(export):
        if ctx.qtype != "table":
            continue
        cols, rows, cells = table_of(ctx.question)
        if cols and rows:
            tables.append((ctx, cols, rows, cells))

    for i in range(len(tables)):
        for j in range(i + 1, len(tables)):
            a_ctx, a_cols, a_rows, a_cells = tables[i]
            b_ctx, b_cols, b_rows, b_cells = tables[j]
            if a_ctx.component_id == b_ctx.component_id:
                continue  # same component: repetition there is by design

            for transposed in (False, True):
                b_r = b_cols if transposed else b_rows
                b_c = b_rows if transposed else b_cols

                a_rmap = _index_map(a_rows)
                a_cmap = _index_map(a_cols)
                b_rmap = _index_map(b_r)
                b_cmap = _index_map(b_c)
                shared_rows = sorted(set(a_rmap) & set(b_rmap))
                shared_cols = sorted(set(a_cmap) & set(b_cmap))
                if len(shared_rows) < 2 or len(shared_cols) < 2:
                    continue

                mismatches: List[Dict[str, Any]] = []
                compared = 0
                for rk in shared_rows:
                    for ck in shared_cols:
                        ari, aci = a_rmap[rk], a_cmap[ck]
                        if transposed:
                            bri, bci = b_cmap[ck], b_rmap[rk]
                        else:
                            bri, bci = b_rmap[rk], b_cmap[ck]
                        av = parse_number(_cell(a_cells, ari, aci))
                        bv = parse_number(_cell(b_cells, bri, bci))
                        if not av.ok or not bv.ok:
                            continue
                        if av.is_percent != bv.is_percent:
                            continue
                        compared += 1
                        if abs((av.value or 0) - (bv.value or 0)) > 1e-6:
                            mismatches.append({
                                "concept": "%s / %s" % (rk, ck),
                                "firstLocation": "%s (%s / %s)" % (a_ctx.location, a_rows[ari], a_cols[aci]),
                                "firstValue": av.value,
                                "secondLocation": "%s (%s / %s)" % (
                                    b_ctx.location,
                                    b_rows[bri] if bri < len(b_rows) else "",
                                    b_cols[bci] if bci < len(b_cols) else "",
                                ),
                                "secondValue": bv.value,
                                "difference": (av.value or 0) - (bv.value or 0),
                            })

                if compared and mismatches:
                    out.append(finding(
                        "XREF_VALUE_MISMATCH", "major", "cross-section consistency",
                        "%s vs %s" % (a_ctx.location, b_ctx.location),
                        "The same figures are reported differently in two sections: %d of %d "
                        "shared values disagree." % (len(mismatches), compared),
                        {"comparedValues": compared, "mismatches": mismatches[:10],
                         "firstTable": a_ctx.qtext, "secondTable": b_ctx.qtext},
                        "Two tables in different components that share at least two row labels "
                        "and two column labels are treated as describing the same grid, so "
                        "matching cells should carry the same figure.",
                    ))
                break  # one orientation is enough

    return out


def _index_map(labels: Sequence[str]) -> Dict[str, int]:
    """Normalised label -> index, dropping totals, blanks and duplicates."""
    out: Dict[str, int] = {}
    for i, lbl in enumerate(labels):
        key = norm_label(lbl)
        if not key or _label_is_total(lbl) or "total" in key or "note" in key:
            continue
        if key in out:
            continue
        out[key] = i
    return out


def _cell(cells: List[List[str]], ri: int, ci: int) -> str:
    if ri < 0 or ri >= len(cells):
        return ""
    row = cells[ri]
    return row[ci] if 0 <= ci < len(row) else ""


# ------------------------------------------------------------ export meta ---

def check_export_metadata(export: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Cross-check the export's own blank flags and completion block."""
    out: List[Dict[str, Any]] = []

    for ctx in iter_questions(export):
        declared = ctx.question.get("blank")
        if not isinstance(declared, bool):
            continue
        computed = _computed_blank(ctx)
        if declared != computed:
            out.append(finding(
                "META_BLANK_FLAG_MISMATCH", "minor", "export metadata", ctx.location,
                "The export marks this question blank=%s but its content says otherwise."
                % str(declared).lower(),
                {"declaredBlank": declared, "computedBlank": computed, "type": ctx.qtype},
                "blank must be true only when the question carries no content at all.",
            ))

    stats = completeness_stats(export)
    declared = stats["declared"]
    computed = stats["computed"]
    if isinstance(declared.get("percent"), (int, float)):
        gap = abs(float(declared["percent"]) - computed["percent"])
        if gap > 10:
            out.append(finding(
                "META_COMPLETION_MISMATCH", "minor", "export metadata", "Export completion block",
                "The export declares %s%% complete but recomputing from the answers gives %d%%."
                % (declared["percent"], computed["percent"]),
                {"declaredPercent": declared.get("percent"),
                 "computedPercent": computed["percent"],
                 "declaredTotalFields": declared.get("totalFields"),
                 "computedTotalFields": computed["totalFields"]},
                "Recomputed completion is compared with the declared figure; a gap above 10 "
                "percentage points suggests the two use different counting rules.",
            ))
    return out


def _computed_blank(ctx: QCtx) -> bool:
    q = ctx.question
    qt = ctx.qtype
    if qt == "yn":
        return _is_blank(q.get("answer")) and _is_blank(q.get("remarks"))
    if qt in ("text", "field"):
        return _is_blank(q.get("answer"))
    if qt == "table":
        _, _, cells = table_of(q)
        return not any(c for r in cells for c in r)
    if qt == "group":
        items = group_items(q)
        return not any(a for _, a in items) and _is_blank(q.get("remarks"))
    if qt == "reflections":
        ch, su = reflections_of(q)
        return not ch and not su
    return _is_blank(q.get("answer"))


# ------------------------------------------------------------------ run -----

def run_all_checks(export: Dict[str, Any]) -> Dict[str, Any]:
    """Run every deterministic check and return the full structured result."""
    export = _as_dict(export)
    blanks = classify_blanks(export)
    stats = completeness_stats(export)

    findings: List[Dict[str, Any]] = []
    for gap in blanks["genuine"]:
        findings.append(finding(
            "GAP_GENUINE", gap["severity"], "completeness", gap["location"],
            "Genuine gap: %s left blank." % gap["what"],
            {"questionId": gap["questionId"], "what": gap["what"]},
            gap["rule"],
        ))

    for check in (
        check_table_totals,
        check_units,
        check_values,
        check_yesno_logic,
        check_cross_section_duplicates,
        check_export_metadata,
    ):
        try:
            findings.extend(check(export))
        except Exception as exc:  # a broken section must not lose the other checks
            findings.append(finding(
                "CHECK_FAILED", "minor", "tooling", check.__name__,
                "This check could not complete: %s: %s" % (type(exc).__name__, exc),
                {}, "Reported so a silent failure is never mistaken for a clean result.",
            ))

    order = {"major": 0, "minor": 1}
    findings.sort(key=lambda f: (order.get(f["severity"], 9), f["category"], f["location"]))

    by_category: Dict[str, int] = {}
    for f in findings:
        by_category[f["category"]] = by_category.get(f["category"], 0) + 1

    org = _as_dict(export.get("organisation"))
    assessment = _as_dict(export.get("assessment"))

    return {
        "meta": {
            "version": _txt(export.get("version")),
            "exportedAt": _txt(export.get("exportedAt")),
            "tool": _txt(export.get("tool")),
            "organisation": org,
            "assessment": assessment,
        },
        "completeness": stats,
        "blanks": {
            "genuineCount": len(blanks["genuine"]),
            "conditionalCount": len(blanks["conditional"]),
            "genuine": blanks["genuine"],
            "conditional": blanks["conditional"],
        },
        "findings": findings,
        "summary": {
            "major": sum(1 for f in findings if f["severity"] == "major"),
            "minor": sum(1 for f in findings if f["severity"] == "minor"),
            "total": len(findings),
            "byCategory": by_category,
        },
    }


# --------------------------------------------------------------- output -----

def format_report(result: Dict[str, Any], severity: str = "all") -> str:
    """Human-readable rendering of run_all_checks output."""
    lines: List[str] = []
    meta = _as_dict(result.get("meta"))
    org = _as_dict(meta.get("organisation"))
    comp = _as_dict(result.get("completeness"))
    computed = _as_dict(comp.get("computed"))
    declared = _as_dict(comp.get("declared"))
    summary = _as_dict(result.get("summary"))
    blanks = _as_dict(result.get("blanks"))

    lines.append("SEHRA Module 1 / deterministic consistency checks")
    lines.append("=" * 62)
    lines.append("Organisation : %s" % (_txt(org.get("name")) or "unknown"))
    lines.append("Area         : %s" % ", ".join(
        x for x in (_txt(org.get("district")), _txt(org.get("region")), _txt(org.get("country"))) if x
    ) or "unknown")
    lines.append("Assessment   : %s (%s)" % (
        _txt(_as_dict(meta.get("assessment")).get("id")) or "unknown",
        _txt(_as_dict(meta.get("assessment")).get("status")) or "unknown",
    ))
    lines.append("Exported     : %s" % (_txt(meta.get("exportedAt")) or "unknown"))
    lines.append("")

    lines.append("COMPLETION (recomputed from the answers)")
    lines.append("-" * 62)
    lines.append("Overall: %d of %d fields answered (%d%%)" % (
        computed.get("answeredFields", 0), computed.get("totalFields", 0), computed.get("percent", 0)))
    if isinstance(declared.get("percent"), (int, float)):
        lines.append("Export declares: %s%% of %s fields" % (
            declared.get("percent"), declared.get("totalFields")))
    lines.append("Remarks expected after a Yes: %d, given: %d" % (
        computed.get("remarksExpectedAfterYes", 0), computed.get("remarksGivenAfterYes", 0)))
    lines.append("")
    for c in _as_list(computed.get("byComponent")):
        c = _as_dict(c)
        label = "Context" if c.get("id") == "context" else "Component %s %s" % (c.get("number"), _txt(c.get("title")))
        lines.append("  %-52s %3d%%  (%d/%d)" % (
            label[:52], c.get("percent", 0), c.get("answered", 0), c.get("total", 0)))
        for s in _as_list(c.get("subsections")):
            s = _as_dict(s)
            lines.append("      %-46s %3d%%  (%d/%d)" % (
                ("%s %s" % (_txt(s.get("id")), _txt(s.get("title"))))[:46],
                s.get("percent", 0), s.get("answered", 0), s.get("total", 0)))
    lines.append("")

    lines.append("BLANKS")
    lines.append("-" * 62)
    lines.append("Likely genuine gaps    : %d" % blanks.get("genuineCount", 0))
    lines.append("Likely conditional     : %d  (Yes/No logic makes the follow-up not applicable)" %
                 blanks.get("conditionalCount", 0))
    lines.append("")

    lines.append("FINDINGS: %d major, %d minor" % (summary.get("major", 0), summary.get("minor", 0)))
    lines.append("-" * 62)
    findings = _as_list(result.get("findings"))
    shown = [f for f in findings
             if severity == "all" or _as_dict(f).get("severity") == severity]
    if not shown:
        lines.append("No findings at this severity.")
    for n, f in enumerate(shown, 1):
        f = _as_dict(f)
        lines.append("")
        lines.append("%d. [%s] %s" % (n, _txt(f.get("severity")).upper(), _txt(f.get("code"))))
        lines.append("   Location : %s" % _txt(f.get("location")))
        lines.append("   Issue    : %s" % _txt(f.get("issue")))
        ev = _as_dict(f.get("evidence"))
        if ev:
            lines.append("   Evidence : %s" % _compact(ev))
        if _txt(f.get("rule")):
            lines.append("   Rule     : %s" % _txt(f.get("rule")))

    lines.append("")
    lines.append("-" * 62)
    lines.append("These figures were computed by script. Treat them as established fact "
                 "and do not recompute them by hand.")
    return "\n".join(lines)


def _compact(obj: Any, limit: int = 400) -> str:
    try:
        text = json.dumps(obj, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        text = _s(obj)
    return text if len(text) <= limit else text[: limit - 3] + "..."


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Deterministic completeness and consistency checks for a SEHRA Module 1 export.",
    )
    parser.add_argument("export", help="Path to the exported assessment JSON, or - for stdin.")
    parser.add_argument("--json", action="store_true", dest="as_json",
                        help="Emit machine-readable JSON instead of text.")
    parser.add_argument("--severity", choices=("all", "major", "minor"), default="all",
                        help="Only show findings at this severity in text output.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        source: Any = sys.stdin if args.export == "-" else args.export
        export = load_export(source)
    except (OSError, ValueError) as exc:
        sys.stderr.write("Could not read the export: %s\n" % exc)
        return 2

    if not export.get("components"):
        sys.stderr.write("Warning: the export has no components; checks will be empty.\n")

    result = run_all_checks(export)
    if args.as_json:
        json.dump(result, sys.stdout, indent=2, ensure_ascii=False, default=str)
        sys.stdout.write("\n")
    else:
        sys.stdout.write(format_report(result, args.severity) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
