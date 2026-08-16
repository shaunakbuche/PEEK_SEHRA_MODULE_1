# SEHRA analysis scripts

Deterministic Python for the SEHRA analysis skill. Following Mert's split: **numbers are
checked by code, the model only reasons over free text.** These scripts run *before* any LLM
step, and their output is handed to the model as established fact.

The model must never recompute a total, a percentage or a completion figure by hand. If a
number is not in this output, it was not checked.

- Python 3.9 or later
- Standard library only, no third-party dependencies, no network access
- Every script runs as `python3 <script>.py <export.json>` and also exposes importable functions
- Human-readable text by default, `--json` for machine-readable output
- Robust by design: a malformed or partial export produces findings, never a stack trace

## Files

| File | Purpose |
| --- | --- |
| `consistency_checks.py` | All deterministic checks: completeness, blank classification, arithmetic, units, truncation, Yes/No contradictions, cross-section figure comparison |
| `summarise_export.py` | Condenses a large export into a compact digest for the model, with a safe truncation budget |
| `sample_export.json` | A synthetic export with deliberately planted problems, used by the tests |
| `test_consistency_checks.py` | `python3 -m unittest` suite asserting every planted problem is caught and that clean input is silent |

### About the fixture

`sample_export.json` is **invented**, and must stay that way. It carries no real organisation,
place, partner or figure: the site is "Example County Eye Health Team" in "Example District,
Example Region, Example Country". Real assessments are confidential, so a fixture that borrowed
a partner's name would leak one every time this repository was shared or a test output pasted
into a ticket. The test suite enforces this, failing if a known real name reappears.

The fixture is also **deliberately trimmed**. It exercises all six component ids (`context`,
`c1`, `c2`, `c3`, `c4`, `c5`) so no check goes untested against a whole component, but it holds
only a few subsections of each rather than the full instrument. Every question in it is there to
exercise a specific rule, so keep it small: add to it only when a new rule needs a case, and add
the case where the real form would put it.

## Quick start

```bash
cd skill/sehra-analysis/scripts

# 1. Deterministic checks, human-readable
python3 consistency_checks.py sample_export.json

# 2. The same, as JSON for the skill to consume
python3 consistency_checks.py sample_export.json --json > checks.json

# 3. Major findings only
python3 consistency_checks.py sample_export.json --severity major

# 4. Compact digest of the answers
python3 summarise_export.py sample_export.json > digest.txt

# 5. Digest capped at 60k characters, cut at a section boundary
python3 summarise_export.py sample_export.json --max-chars 60000 > digest.txt

# Both scripts accept "-" to read the export from stdin.
python3 consistency_checks.py - --json < export.json
```

Run the tests:

```bash
cd skill/sehra-analysis/scripts
python3 -m unittest -v
```

## Input

Both scripts read the canonical export contract (v1), that is the JSON the website produces
under the top-level `sehraExport` key. A bare (unwrapped) export object is also accepted, as is
a JSON string or an already parsed dict when calling `load_export` directly.

Blank fields **must** be present in the export with `blank: true` and `answer: null`. The
completeness review depends on seeing what is missing, so an exporter that silently drops empty
questions would make these checks blind.

## `consistency_checks.py`

### What it produces

```jsonc
{
  "meta":         { "organisation": {...}, "assessment": {...}, ... },
  "completeness": { "declared": {...}, "computed": { "percent": 88, "byComponent": [...] } },
  "blanks":       { "genuineCount": 4, "conditionalCount": 10, "genuine": [...], "conditional": [...] },
  "findings":     [ { "code", "severity", "category", "location", "issue", "evidence", "rule" } ],
  "summary":      { "major": 9, "minor": 5, "total": 14, "byCategory": {...} }
}
```

Findings are sorted major first. `evidence` always carries the raw numbers behind the claim so
the model can quote them without recomputing anything, and `rule` states the exact rule that
fired so a reviewer can judge whether it applies.

### Checks and their rules

**Completion** is recomputed from the answers rather than trusted. The unit rule: a Yes/No
question counts as one unit (its answer), a text or single field as one, a checklist one per
item, a table one per cell, reflections as one. Remarks are tracked separately so a question is
never double counted. The recomputed figure is compared with the export's declared `completion`
block, and a gap above 10 percentage points is flagged as a minor metadata issue, since it
usually means the two are using different counting rules.

**Blank classification** splits every blank into a likely genuine gap or a likely conditional
blank. This is deliberately conservative: a blank is only called conditional when a stated rule
applies, and everything else counts as a genuine gap.

| Situation | Classification |
| --- | --- |
| Yes/No question itself unanswered | genuine gap (major) |
| Remarks blank, parent Yes/No unanswered | conditional, so the same gap is not counted twice |
| Remarks blank after No / "No policy exists" / "This does not exist" | conditional, unless the question explicitly asks for detail on No |
| Remarks blank after Yes | genuine gap (major when the question actually asks for the detail, otherwise minor) |
| Table with no cell filled | genuine gap (major) |
| Some table cells blank | genuine gap (minor) |
| Checklist items unticked | conditional, since checklists are ticked only where they apply |
| Optional notes, references, "please list" fields | conditional |
| Reflections with neither challenges nor supports | genuine gap (major) |
| Final summary field blank | genuine gap (major) |

**Arithmetic.** Any column or row literally named `Total` is checked against the sum of its
siblings, as is any grouped total of the form `<prefix> / Total` (for example `Public / Total`
against `Public / M` and `Public / F`). An exact `Total` never counts other totals among its
siblings, so grouped and overall totals are not double counted. A total is only checked when it
and all of its siblings parse as numbers; otherwise it is reported as unverifiable rather than
guessed at.

**Only counts are summed.** Rates and percentages across separate categories are never added
together: a total attendance rate is a weighted mean of the rates it combines, so "88 + 86 = 174,
therefore the declared 87 is wrong" is nonsense, not a finding. Whether a table holds counts or
rates is decided from the question text *and* both axis labels, not from the presence of a
percent sign, because an assessor filling a table already titled "rate" usually types bare
numbers. This matters more than it sounds: the model is told these figures are established fact
and must not recompute them, so a wrong arithmetic finding travels straight through to the
partner.

What is still checked on a rate table is the one thing that holds whatever the underlying
denominators are: a weighted mean lies between the smallest and the largest of its parts. A
declared total outside that range is reported, as minor, since the exact figure cannot be
recomputed from what the module collects. A rate table never produces a major arithmetic finding.

Labels that name both a count and a rate ("School enrolment ... or Net Enrolment Rate") are
settled by the figures: anything at or above 1,000 cannot be a percentage, so those are summed
normally. Below that either reading is possible, so a difference is raised as
`ARITH_TOTAL_UNRECONCILED` for a human to judge rather than asserted as an arithmetic error.

**Number parsing** tolerates thousands separators (`41,230`, `12 340`), percent signs, currency
and trailing prose (`15,201 KES per month`). It flags values that look truncated (a trailing
comma, slash, dash or dangling conjunction), values that are ranges, and placeholders such as
`TBC` or `N/A`.

**Units.** A label naming a rate, percentage, proportion, coverage or attendance whose value is
above 100 with no percent sign is read as a count entered in a rate field. A label naming a
number of things whose value carries a percent sign is read as the reverse. Labels that name
both (for example "enrolment ... or Net Enrolment Rate") are genuinely ambiguous, so those are
only queried, never called an error. A row carrying both a percentage and a value above 100
without a percent sign is flagged as mixing units. Findings are aggregated per question, so one
badly filled table produces one finding rather than forty.

**Logical consistency.** A Yes answer whose remarks contain absence language ("does not exist",
"there is no", "not available", "non-functional", "not in place") is a contradiction, as is a No
answer whose remarks describe presence ("exists", "is available", "is in place", "is
functional"). Two guards keep the false positive rate down: benign phrases such as "no major"
and "no cost" are removed before matching, and negated verb phrases are stripped before presence
matching so "not available" can never read as "available".

**Cross-section comparison.** Two tables in *different* components that, after label
normalisation, share at least two row labels and two column labels are treated as describing the
same grid, in either orientation. Matching cells should hold the same figure, so any difference
is reported with both numbers and both locations. This is what catches, for example, a school
count that differs between Context and Component 2 Infrastructure. Tables within the same
component are not compared, since repetition there is by design.

### Finding codes

| Code | Severity | Category |
| --- | --- | --- |
| `GAP_GENUINE` | major / minor | completeness |
| `ARITH_TOTAL_MISMATCH` | major | arithmetic |
| `ARITH_RATE_TOTAL_OUT_OF_RANGE` | minor | arithmetic |
| `ARITH_TOTAL_UNRECONCILED` | minor | arithmetic |
| `ARITH_UNVERIFIABLE_TOTAL` | minor | arithmetic |
| `UNIT_COUNT_IN_RATE_FIELD` | major | units |
| `UNIT_RATE_IN_COUNT_FIELD` | major | units |
| `UNIT_AMBIGUOUS` | minor | units |
| `UNIT_MIXED_ROW` | minor | units |
| `UNIT_MIXED_TOTAL` | minor | units |
| `LOGIC_YES_BUT_ABSENCE` | major / minor | logical consistency |
| `LOGIC_NO_BUT_PRESENCE` | major | logical consistency |
| `XREF_VALUE_MISMATCH` | major | cross-section consistency |
| `VALUE_TRUNCATED` | minor | value quality |
| `VALUE_PLACEHOLDER` | minor | value quality |
| `META_BLANK_FLAG_MISMATCH` | minor | export metadata |
| `META_COMPLETION_MISMATCH` | minor | export metadata |
| `CHECK_FAILED` | minor | tooling |

`CHECK_FAILED` means one check hit an unexpected input and was skipped. It is reported rather
than swallowed so a partial run is never mistaken for a clean one. It should never appear in
practice, and the test suite asserts it does not.

## `summarise_export.py`

Condenses the export into a readable digest: every question with its answer or an explicit
`[blank]` marker, tables flattened one line per row, checklists, reflections, readiness ratings
and the final summary items. Use it when the raw JSON is too unwieldy to attach.

| Flag | Effect |
| --- | --- |
| `--max-chars N` | Truncate to N characters. Whole sections are dropped from the end so a subsection is never cut in half, a component heading is never left dangling with no content, and the organisation header always survives. The output is guaranteed not to exceed N. |
| `--skip-blanks` | Omit blank fields. For synthesis only, **never** for the completeness review, which needs to see what is missing. |
| `--json` | Emit the digest plus `chars`, `truncated` and `omittedSections`. |

When truncation happens, the digest ends with an explicit note naming the omitted sections, so
the model knows not to draw conclusions about parts it was not shown.

`summarise_export.py` imports from `consistency_checks.py`. Running it as a script works from
any directory; importing it as a module requires this directory on `sys.path`.

## How this feeds the skill

**Step 1, completeness review** (`COMPLETENESS_SYSTEM` in `api/_lib/completenessSkill.ts`):

1. Run `consistency_checks.py <export.json> --json`.
2. Run `summarise_export.py <export.json>` with blanks **included**.
3. Give the model both. The checks output supplies `consistencyChecks`, the arithmetic content
   of `majorItems`, and the evidence behind `componentStatus`. The model's job is the wording,
   the judgement about what matters, and the prioritised bottom line, not the arithmetic.

**Step 2, synthesis and RAG** (`REPORT_SKILL_SYSTEM` in `api/_lib/reportSkill.ts`):

1. Run `summarise_export.py <export.json> --max-chars <budget>` for the evidence.
2. Pass the `summary` and major findings from the checks as well, so the synthesis can carry an
   honest `dataQualityNote` and so RAG ratings account for the quality of the underlying data.

Because the numbers come from code, the same export always produces the same figures. That is
what makes the validation exercise meaningful: re-running past assessments through the skill and
comparing against the original human-written reports isolates differences in the *reasoning*,
not noise in the arithmetic.

## Deliberate limitations

These checks are tuned to be conservative, because a partner-facing review loses credibility
faster from confident false positives than from a missed minor issue.

- Only tables are compared across sections. A figure repeated in free text is not detected.
- Ambiguous unit labels are queried, not judged.
- Rate and percentage totals are never verified by summation, only against the range of their
  parts, so a plausible but wrong combined rate passes.
- A total with any blank contributor is reported as unverifiable rather than estimated.
- Contradiction detection is phrase based. It catches the blunt cases Haroon flags by hand and
  will miss subtly hedged ones, so it supplements the reviewer rather than replacing them.

Every finding carries the `rule` that fired, so a human reviewer can always see why something
was raised and overrule it.
