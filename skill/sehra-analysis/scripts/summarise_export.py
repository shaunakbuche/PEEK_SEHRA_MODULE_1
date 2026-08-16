#!/usr/bin/env python3
"""
Condense a SEHRA Module 1 export into a compact digest for the model.

Every question appears with either its answer or an explicit [blank] marker, so
the completeness review can see what is missing. Tables are flattened into
readable rows, and reflections and the final summary are kept.

Usage:
    python3 summarise_export.py <export.json>
    python3 summarise_export.py <export.json> --max-chars 60000
    python3 summarise_export.py <export.json> --json
    python3 summarise_export.py <export.json> --skip-blanks   # synthesis mode

Importable:
    from summarise_export import build_digest, render_digest

Standard library only. Targets Python 3.9+.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict, List, Optional, Sequence, Tuple

from consistency_checks import (
    BLANK_MARK,
    QCtx,
    _as_dict,
    _as_list,
    _txt,
    group_items,
    iter_questions,
    load_export,
    reflections_of,
    table_of,
)

# A block is one atomic chunk of the digest. Truncation only ever drops whole
# blocks, so a section is never cut in half.
Block = Dict[str, Any]


def _block(kind: str, text: str, keep: bool = False, label: str = "") -> Block:
    return {"kind": kind, "text": text, "keep": keep, "label": label}


# ------------------------------------------------------------ rendering ----

def _table_lines(ctx: QCtx, skip_blanks: bool) -> List[str]:
    """
    Flatten a table so a reader can follow it without the original grid.

    One line per row, cells as "column: value", blanks made explicit.
    """
    cols, rows, cells = table_of(ctx.question)
    out: List[str] = []
    if not cols or not rows:
        return out
    for ri, rlabel in enumerate(rows):
        parts: List[str] = []
        for ci, clabel in enumerate(cols):
            raw = cells[ri][ci] if ri < len(cells) and ci < len(cells[ri]) else ""
            if not raw and skip_blanks:
                continue
            parts.append("%s: %s" % (clabel, raw or BLANK_MARK))
        if parts:
            out.append("    %s | %s" % (rlabel, "; ".join(parts)))
        elif not skip_blanks:
            out.append("    %s | %s" % (rlabel, BLANK_MARK))
    return out


def _question_lines(ctx: QCtx, skip_blanks: bool) -> List[str]:
    """Render one question as it should appear in the digest."""
    q = ctx.question
    qt = ctx.qtype
    text = ctx.qtext or ctx.qid
    out: List[str] = []

    if qt == "yn":
        answer = _txt(q.get("answer"))
        remarks = _txt(q.get("remarks"))
        if skip_blanks and not answer and not remarks:
            return out
        out.append("  Q: %s" % text)
        out.append("     Answer: %s" % (answer or BLANK_MARK))
        if remarks or not skip_blanks:
            out.append("     Remarks: %s" % (remarks or BLANK_MARK))
        return out

    if qt in ("text", "field"):
        answer = _txt(q.get("answer"))
        if skip_blanks and not answer:
            return out
        out.append("  Q: %s" % text)
        out.append("     Answer: %s" % (answer or BLANK_MARK))
        return out

    if qt == "group":
        items = group_items(q)
        remarks = _txt(q.get("remarks"))
        shown = [(l, a) for l, a in items if a or not skip_blanks]
        if skip_blanks and not shown and not remarks:
            return out
        out.append("  Checklist: %s" % text)
        for label, ans in shown:
            out.append("    - %s: %s" % (label, ans or BLANK_MARK))
        if remarks or not skip_blanks:
            out.append("     Remarks: %s" % (remarks or BLANK_MARK))
        return out

    if qt == "table":
        lines = _table_lines(ctx, skip_blanks)
        if skip_blanks and not lines:
            return out
        out.append("  Table: %s" % text)
        out.extend(lines)
        return out

    if qt == "reflections":
        ch, su = reflections_of(q)
        if skip_blanks and not ch and not su:
            return out
        out.append("  Reflections and implications")
        out.append("     Challenges: %s" % ("; ".join(ch) if ch else BLANK_MARK))
        out.append("     Supporting factors: %s" % ("; ".join(su) if su else BLANK_MARK))
        return out

    answer = _txt(q.get("answer"))
    if answer or not skip_blanks:
        out.append("  Q: %s" % text)
        out.append("     Answer: %s" % (answer or BLANK_MARK))
    return out


# --------------------------------------------------------------- build -----

def build_digest(export: Dict[str, Any], skip_blanks: bool = False) -> List[Block]:
    """
    Turn an export into an ordered list of blocks.

    Header blocks are marked keep=True so they survive truncation.
    """
    export = _as_dict(export)
    blocks: List[Block] = []

    org = _as_dict(export.get("organisation"))
    assessment = _as_dict(export.get("assessment"))
    completion = _as_dict(export.get("completion"))

    header = [
        "# SEHRA Scoping Module (Module 1) / submitted answers",
        "",
        "Organisation      : %s" % (_txt(org.get("name")) or BLANK_MARK),
        "Country           : %s" % (_txt(org.get("country")) or BLANK_MARK),
        "Province / region : %s" % (_txt(org.get("region")) or BLANK_MARK),
        "District          : %s" % (_txt(org.get("district")) or BLANK_MARK),
        "Assessment date   : %s" % (_txt(org.get("assessmentDate")) or BLANK_MARK),
        "Assessment id     : %s (%s)" % (
            _txt(assessment.get("id")) or BLANK_MARK,
            _txt(assessment.get("status")) or "unknown status",
        ),
        "Exported at       : %s" % (_txt(export.get("exportedAt")) or BLANK_MARK),
    ]
    if completion:
        header.append("Reported completion: %s%% (%s of %s fields)" % (
            completion.get("percent"), completion.get("answeredFields"), completion.get("totalFields")))
    if skip_blanks:
        header.append("")
        header.append("Note: blank fields are omitted from this digest.")
    else:
        header.append("")
        header.append("Note: blank fields are shown as %s. Some blanks are intentional because "
                      "of Yes/No logic." % BLANK_MARK)
    blocks.append(_block("header", "\n".join(header), keep=True, label="header"))

    # Group questions by component then subsection, preserving export order.
    current_comp: Optional[str] = None
    current_sub: Optional[str] = None
    buf: List[str] = []
    sub_label = ""

    def flush() -> None:
        nonlocal buf, sub_label
        if buf:
            blocks.append(_block("subsection", "\n".join(buf), label=sub_label))
        buf = []

    for ctx in iter_questions(export):
        if ctx.component_id != current_comp:
            flush()
            current_comp = ctx.component_id
            current_sub = None
            comp_lines = ["", "## %s" % ctx.component_label]
            purpose = _purpose_for(export, ctx.component_id)
            if purpose:
                comp_lines.append("Purpose: %s" % purpose)
            rating = _rating_for(export, ctx.component_id)
            if rating:
                comp_lines.append("Assessor readiness rating: %s" % rating)
            blocks.append(_block("component", "\n".join(comp_lines), label=ctx.component_label))

        if ctx.subsection_id != current_sub:
            flush()
            current_sub = ctx.subsection_id
            sub_label = "%s %s %s" % (ctx.component_label, ctx.subsection_id, ctx.subsection_title)
            buf.append("")
            buf.append("### %s %s" % (ctx.subsection_id, ctx.subsection_title))

        buf.extend(_question_lines(ctx, skip_blanks))

    flush()

    extras = _as_dict(export.get("summaryExtras"))
    extra_labels = [
        ("sum_gaps", "Evidence gaps / open questions"),
        ("sum_groups", "Parent-teacher and child/community groups"),
        ("sum_unserved", "Groups with no eye screening service"),
    ]
    lines = ["", "## Final summary / additional items"]
    for key, label in extra_labels:
        val = _txt(extras.get(key))
        if skip_blanks and not val:
            continue
        lines.append("  %s: %s" % (label, val or BLANK_MARK))
    if len(lines) > 2:
        blocks.append(_block("summary", "\n".join(lines), label="final summary"))

    return blocks


def _purpose_for(export: Dict[str, Any], component_id: str) -> str:
    for comp in _as_list(export.get("components")):
        comp = _as_dict(comp)
        if _txt(comp.get("id")) == component_id:
            return _txt(comp.get("purpose"))
    return ""


def _rating_for(export: Dict[str, Any], component_id: str) -> str:
    for comp in _as_list(export.get("components")):
        comp = _as_dict(comp)
        if _txt(comp.get("id")) != component_id:
            continue
        rating = _as_dict(comp.get("readinessRating"))
        label = _txt(rating.get("label"))
        value = rating.get("value")
        if label and value is not None:
            return "%s (%s of 4)" % (label, value)
        if label:
            return label
        if value is not None:
            return "%s of 4" % value
        if component_id != "context":
            return BLANK_MARK
    return ""


# ------------------------------------------------------------ truncate -----

# Enough room for the truncation notice below, whose length is bounded.
_NOTICE_RESERVE = 400


def render_digest(blocks: Sequence[Block], max_chars: Optional[int] = None) -> Tuple[str, List[str]]:
    """
    Join blocks into the digest text, dropping whole blocks from the end when a
    character budget is set. Returns (text, omitted block labels).

    Truncation is strictly sequential, so what remains always reads in document
    order, and a component heading is never left dangling with no content under
    it. The result is guaranteed not to exceed max_chars.
    """
    parts = [_txt(b.get("text")) for b in blocks]
    full = "\n".join(parts)
    if not max_chars or len(full) <= max_chars:
        return full, []

    budget = max(0, max_chars - _NOTICE_RESERVE)
    kept_idx: List[int] = []
    used = 0
    for i, text in enumerate(parts):
        cost = len(text) + 1
        if i == 0 or used + cost <= budget:  # the header always stays
            kept_idx.append(i)
            used += cost
        else:
            break

    while len(kept_idx) > 1 and _txt(blocks[kept_idx[-1]].get("kind")) == "component":
        kept_idx.pop()

    keep_set = set(kept_idx)
    omitted = [
        _txt(blocks[i].get("label")) or _txt(blocks[i].get("kind"))
        for i in range(len(blocks)) if i not in keep_set
    ]

    listed = ", ".join(omitted)
    if len(listed) > 180:
        listed = listed[:177] + "..."
    notice = [
        "",
        "---",
        "NOTE: this digest was truncated to fit a %d character budget." % max_chars,
        "%d section(s) were omitted in full: %s" % (len(omitted), listed),
        "Request the omitted sections separately before drawing conclusions about them.",
    ]
    text = "\n".join([parts[i] for i in kept_idx] + notice)
    return text[:max_chars], omitted


# ---------------------------------------------------------------- main -----

def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Condense a SEHRA Module 1 export into a compact digest for the model.",
    )
    parser.add_argument("export", help="Path to the exported assessment JSON, or - for stdin.")
    parser.add_argument("--max-chars", type=int, default=None,
                        help="Truncate the digest to this many characters, dropping whole "
                             "sections from the end.")
    parser.add_argument("--skip-blanks", action="store_true",
                        help="Omit blank fields. Use for synthesis, never for the "
                             "completeness review.")
    parser.add_argument("--json", action="store_true", dest="as_json",
                        help="Emit JSON with the digest and truncation metadata.")
    args = parser.parse_args(list(argv) if argv is not None else None)

    try:
        source: Any = sys.stdin if args.export == "-" else args.export
        export = load_export(source)
    except (OSError, ValueError) as exc:
        sys.stderr.write("Could not read the export: %s\n" % exc)
        return 2

    blocks = build_digest(export, skip_blanks=args.skip_blanks)
    text, omitted = render_digest(blocks, args.max_chars)

    if args.as_json:
        json.dump({
            "digest": text,
            "chars": len(text),
            "truncated": bool(omitted),
            "omittedSections": omitted,
            "skipBlanks": args.skip_blanks,
        }, sys.stdout, indent=2, ensure_ascii=False)
        sys.stdout.write("\n")
    else:
        sys.stdout.write(text + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
