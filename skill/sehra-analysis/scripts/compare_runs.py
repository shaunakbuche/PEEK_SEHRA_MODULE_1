#!/usr/bin/env python3
"""Compare two independent synthesis runs of the same SEHRA assessment.

Stage 3 of the blind double-extraction protocol (see
reference/double-extraction.md). The synthesis is run twice without either pass
seeing the other; this script then computes, deterministically, where the two
passes agree and where they do not. The model never performs this comparison
itself, so the agreement figures are reproducible and checkable.

Usage:
    python3 compare_runs.py run-A.json run-B.json
    python3 compare_runs.py run-A.json run-B.json --json

Both files are report JSON in the ReportContentSchema shape. A file that wraps
the report, for example {"content": {...}} or {"report": {"content": {...}}},
is unwrapped automatically.
"""

import argparse
import json
import re
import sys

# Ordered best to worst. Distance along this list is what "adjacent" and
# "divergent" mean, so the order matters and must match the RAG legend.
RAG_SCALE = ["Green", "Amber/Green", "Amber", "Red/Amber", "Red"]
RAG_INDEX = {level.lower(): i for i, level in enumerate(RAG_SCALE)}

# Two points count as the same finding when their token sets overlap by at
# least this much. Wording always differs between independent passes, so exact
# string matching would report near-total disagreement and be useless.
SIMILARITY_THRESHOLD = 0.5

_STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for",
    "from", "has", "have", "in", "is", "it", "its", "of", "on", "or", "that",
    "the", "there", "these", "this", "to", "was", "were", "which", "with",
    "no", "not", "any", "all", "some", "more", "most", "can", "may", "will",
}


# ----------------------------------------------------------------------------
# Loading
# ----------------------------------------------------------------------------

def unwrap(obj):
    """Return the report object, tolerating the usual wrappers."""
    seen = 0
    while isinstance(obj, dict) and seen < 5:
        if "components" in obj and "overall" in obj:
            return obj
        for key in ("content", "report", "data", "result"):
            if isinstance(obj.get(key), dict):
                obj = obj[key]
                break
        else:
            return obj
        seen += 1
    return obj if isinstance(obj, dict) else {}


def load_report(path):
    try:
        if path == "-":
            raw = json.load(sys.stdin)
        else:
            with open(path, "r", encoding="utf-8") as fh:
                raw = json.load(fh)
    except FileNotFoundError:
        raise SystemExit("Could not read %s: file not found." % path)
    except json.JSONDecodeError as exc:
        raise SystemExit("Could not read %s: it is not valid JSON (%s)." % (path, exc))
    return unwrap(raw)


# ----------------------------------------------------------------------------
# Text similarity
# ----------------------------------------------------------------------------

def tokens(text):
    text = re.sub(r"[^a-z0-9\s]", " ", str(text or "").lower())
    return {w for w in text.split() if w and w not in _STOPWORDS and len(w) > 2}


def similarity(a, b):
    """Jaccard overlap of the two token sets, 0.0 to 1.0."""
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / float(len(ta | tb))


def match_points(points_a, points_b, threshold=SIMILARITY_THRESHOLD):
    """Greedy best-match pairing between two lists of point strings."""
    unmatched_b = list(enumerate(points_b))
    matched, only_a = [], []
    for pa in points_a:
        best_i, best_score = None, 0.0
        for idx, (bi, pb) in enumerate(unmatched_b):
            score = similarity(pa, pb)
            if score > best_score:
                best_i, best_score = idx, score
        if best_i is not None and best_score >= threshold:
            _, pb = unmatched_b.pop(best_i)
            matched.append({"a": pa, "b": pb, "similarity": round(best_score, 2)})
        else:
            only_a.append(pa)
    return matched, only_a, [pb for _, pb in unmatched_b]


# ----------------------------------------------------------------------------
# Report access helpers
# ----------------------------------------------------------------------------

def components(report):
    comps = report.get("components")
    return comps if isinstance(comps, list) else []


def flatten_groups(groups):
    """Turn [{theme, points[]}] into a flat list of point strings."""
    out = []
    if isinstance(groups, list):
        for g in groups:
            if isinstance(g, dict):
                for p in g.get("points", []) or []:
                    if str(p).strip():
                        out.append(str(p))
    return out


def theme_names(groups):
    out = []
    if isinstance(groups, list):
        for g in groups:
            if isinstance(g, dict) and str(g.get("theme", "")).strip():
                out.append(str(g["theme"]))
    return out


def rag_of(value):
    """Normalise a RAG string to its scale index, or None if unrecognised."""
    return RAG_INDEX.get(str(value or "").strip().lower())


def classify(ia, ib):
    if ia is None or ib is None:
        return "unknown", None
    d = abs(ia - ib)
    return ("exact" if d == 0 else "adjacent" if d == 1 else "divergent"), d


# ----------------------------------------------------------------------------
# Comparison
# ----------------------------------------------------------------------------

def compare(a, b):
    comps_a, comps_b = components(a), components(b)
    n = max(len(comps_a), len(comps_b))

    rag_rows, coverage_rows, adjudicate = [], [], []

    for i in range(n):
        ca = comps_a[i] if i < len(comps_a) else {}
        cb = comps_b[i] if i < len(comps_b) else {}
        name = str(ca.get("name") or cb.get("name") or ("Component %d" % (i + 1)))

        ia, ib = rag_of(ca.get("rag")), rag_of(cb.get("rag"))
        verdict, distance = classify(ia, ib)
        row = {
            "component": name,
            "runA": RAG_SCALE[ia] if ia is not None else None,
            "runB": RAG_SCALE[ib] if ib is not None else None,
            "agreement": verdict,
            "distance": distance,
        }
        rag_rows.append(row)
        if verdict == "divergent":
            adjudicate.append(
                "RAG for %s: run A said %s, run B said %s, %d levels apart. "
                "Do not pick one; a human must decide." % (name, row["runA"], row["runB"], distance)
            )
        elif verdict == "unknown":
            adjudicate.append("RAG for %s could not be read from one or both runs." % name)

        for field, label in (("enablers", "Enablers"), ("barriers", "Barriers"), ("actionPoints", "Action points")):
            pa, pb = flatten_groups(ca.get(field)), flatten_groups(cb.get(field))
            matched, only_a, only_b = match_points(pa, pb)
            coverage_rows.append({
                "component": name,
                "field": label,
                "both": len(matched),
                "onlyA": len(only_a),
                "onlyB": len(only_b),
                "onlyAText": only_a,
                "onlyBText": only_b,
                # Themes are derived per run, so differing names are expected and
                # are reported for information only, never as disagreement.
                "themesA": theme_names(ca.get(field)),
                "themesB": theme_names(cb.get(field)),
            })
            for p in only_a + only_b:
                if len(tokens(p)) >= 6:  # substantive enough to be worth a decision
                    adjudicate.append(
                        "%s / %s appears in only one run: \"%s\"" % (name, label, p[:140])
                    )

    # Overall RAG
    oa, ob = a.get("overall") or {}, b.get("overall") or {}
    ioa, iob = rag_of(oa.get("rag")), rag_of(ob.get("rag"))
    overall_verdict, overall_distance = classify(ioa, iob)
    if overall_verdict == "divergent":
        adjudicate.append(
            "Overall RAG: run A said %s, run B said %s, %d levels apart."
            % (RAG_SCALE[ioa], RAG_SCALE[iob], overall_distance)
        )

    # Top actions
    ta = [str(x) for x in (a.get("topActions") or []) if str(x).strip()]
    tb = [str(x) for x in (b.get("topActions") or []) if str(x).strip()]
    ta_matched, ta_only_a, ta_only_b = match_points(ta, tb)
    top_first_agree = bool(ta and tb and similarity(ta[0], tb[0]) >= SIMILARITY_THRESHOLD)

    # Narrative fields
    narrative = []
    for path, label in (
        ("executiveSummary", "Executive summary"),
        ("contextSnapshot", "Context snapshot"),
        ("overall.feasibility", "Overall feasibility"),
        ("overall.strategyImplications", "Strategy implications"),
        ("overall.policyAdvocacy", "Policy advocacy"),
        ("overall.nextSteps", "Next steps"),
    ):
        if "." in path:
            k1, k2 = path.split(".")
            va, vb = (a.get(k1) or {}).get(k2, ""), (b.get(k1) or {}).get(k2, "")
        else:
            va, vb = a.get(path, ""), b.get(path, "")
        entry = {"field": label, "similarity": round(similarity(va, vb), 2),
                 "emptyInA": not str(va or "").strip(), "emptyInB": not str(vb or "").strip()}
        narrative.append(entry)
        if entry["emptyInA"] != entry["emptyInB"]:
            adjudicate.append("%s is present in one run and empty in the other." % label)

    # Verdict. Driven by RAG agreement, which is the decision-bearing output.
    scored = [r for r in rag_rows if r["agreement"] in ("exact", "adjacent", "divergent")]
    divergent = sum(1 for r in scored if r["agreement"] == "divergent")
    exact = sum(1 for r in scored if r["agreement"] == "exact")
    rate = (exact + sum(1 for r in scored if r["agreement"] == "adjacent")) / float(len(scored)) if scored else 0.0

    if divergent == 0 and rate >= 0.8:
        level, rule = "High", "no divergent component RAG and at least 80% exact or adjacent"
    elif divergent <= 1 and rate >= 0.6:
        level, rule = "Moderate", "at most one divergent component RAG and at least 60% exact or adjacent"
    else:
        level, rule = "Low", "more than one divergent component RAG, or agreement below 60%"

    return {
        "ragByComponent": rag_rows,
        "overallRag": {"runA": RAG_SCALE[ioa] if ioa is not None else None,
                       "runB": RAG_SCALE[iob] if iob is not None else None,
                       "agreement": overall_verdict, "distance": overall_distance},
        "coverage": coverage_rows,
        "topActions": {"both": len(ta_matched), "onlyA": ta_only_a, "onlyB": ta_only_b,
                       "highestPriorityAgrees": top_first_agree},
        "narrative": narrative,
        "verdict": {"agreement": level, "rule": rule,
                    "exactCount": exact, "divergentCount": divergent,
                    "componentsScored": len(scored)},
        "adjudicate": adjudicate,
        "similarityThreshold": SIMILARITY_THRESHOLD,
    }


# ----------------------------------------------------------------------------
# Rendering
# ----------------------------------------------------------------------------

def render(res):
    L = []
    add = L.append
    add("SEHRA Module 1 / comparison of two independent synthesis runs")
    add("=" * 62)
    add("")
    add("RAG AGREEMENT (the decision-bearing comparison)")
    add("-" * 62)
    for r in res["ragByComponent"]:
        flag = "  <-- MAJOR, needs human adjudication" if r["agreement"] == "divergent" else ""
        add("  %-46s %s" % (r["component"][:46], r["agreement"].upper() + flag))
        add("      run A: %-14s run B: %s" % (r["runA"], r["runB"]))
    o = res["overallRag"]
    add("")
    add("  OVERALL: %s   (run A: %s, run B: %s)" % (o["agreement"].upper(), o["runA"], o["runB"]))

    add("")
    add("COVERAGE OVERLAP")
    add("-" * 62)
    add("  Points are matched by token-set similarity at a threshold of %.2f," % res["similarityThreshold"])
    add("  because independent passes always word the same finding differently.")
    add("")
    for c in res["coverage"]:
        if c["both"] or c["onlyA"] or c["onlyB"]:
            add("  %-32s %-13s both %2d | only A %2d | only B %2d"
                % (c["component"][:32], c["field"], c["both"], c["onlyA"], c["onlyB"]))

    add("")
    add("  Theme names are reported for information only. Themes are derived per")
    add("  run, so different wording is expected and is NOT a disagreement.")

    add("")
    add("TOP PRIORITY ACTIONS")
    add("-" * 62)
    t = res["topActions"]
    add("  shared %d | only in A %d | only in B %d" % (t["both"], len(t["onlyA"]), len(t["onlyB"])))
    add("  highest-priority action agrees: %s" % ("yes" if t["highestPriorityAgrees"] else "no"))

    add("")
    add("NARRATIVE FIELDS")
    add("-" * 62)
    for n in res["narrative"]:
        note = ""
        if n["emptyInA"] != n["emptyInB"]:
            note = "   <-- present in one run, empty in the other"
        add("  %-26s similarity %.2f%s" % (n["field"], n["similarity"], note))

    v = res["verdict"]
    add("")
    add("VERDICT")
    add("-" * 62)
    add("  Agreement: %s" % v["agreement"].upper())
    add("  Rule applied: %s" % v["rule"])
    add("  %d of %d components exact, %d divergent"
        % (v["exactCount"], v["componentsScored"], v["divergentCount"]))

    add("")
    add("REQUIRES HUMAN ADJUDICATION (%d)" % len(res["adjudicate"]))
    add("-" * 62)
    if res["adjudicate"]:
        for i, item in enumerate(res["adjudicate"], 1):
            add("  %d. %s" % (i, item))
    else:
        add("  Nothing. The two runs agree within tolerance on every scored item.")

    add("")
    add("-" * 62)
    add("These figures were computed by script. Treat them as established fact and")
    add("do not recompute them by hand. Disagreements must be surfaced in the final")
    add("report, never averaged away.")
    return "\n".join(L)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Compare two independent SEHRA synthesis runs.")
    ap.add_argument("run_a", help="first run's report JSON, or - for stdin")
    ap.add_argument("run_b", help="second run's report JSON")
    ap.add_argument("--json", action="store_true", dest="as_json", help="machine-readable output")
    args = ap.parse_args(argv)

    res = compare(load_report(args.run_a), load_report(args.run_b))
    if args.as_json:
        print(json.dumps(res, indent=2))
    else:
        print(render(res))
    return 0


if __name__ == "__main__":
    sys.exit(main())
