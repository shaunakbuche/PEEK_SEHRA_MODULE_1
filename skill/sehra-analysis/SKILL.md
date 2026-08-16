---
name: sehra-analysis
description: Analyse an exported SEHRA Scoping Module 1 assessment JSON for Peek Vision, producing either an initial completeness and consistency review, or a themed synthesis report plus a RAG feasibility dashboard ready to paste back into the SEHRA website.
---

# SEHRA Module 1 analysis

This skill turns an exported **SEHRA Scoping Module (Module 1)** assessment into the two
analysis outputs Peek Vision needs. The School Eye Health Rapid Assessment determines the
feasibility of a school eye health programme in an intervention area by reviewing the policy,
institutional and service-delivery, human-resources, supply-chain and barrier landscape. It
supports the WHO 2030 effective Refractive Error Coverage (eREC) target and aligns with the
Integrated People-Centred Eye Care (IPEC) and SPECS 2030 frameworks.

The work is split deliberately:

- **Deterministic scripts** do all counting, arithmetic and reconciliation. Numbers come from
  the scripts, never from your own mental arithmetic.
- **You** do the reading, judgement and free-text synthesis, grounded in the script output and
  the assessment JSON.

## Input

A single JSON file with a top-level `sehraExport` key (contract version 1.0), exported from the
SEHRA website. It contains the organisation and assessment metadata, completion counts, every
component with its subsections and questions, the summary extras, and a verbatim `rawAnswers`
map. **Blank fields are represented explicitly** (`"blank": true`, `"answer": null`) because the
completeness review depends on seeing what is missing.

If the uploaded file has no `sehraExport` key, stop and tell the user the file is not a
Module 1 export rather than guessing at its shape.

## The two stages

Run them as two separate pieces of work, in this order. Do not blend them.

| Stage | Output | When |
| --- | --- | --- |
| 1. Completeness review | Readable review for the submitting team | As soon as a module is submitted, before any synthesis |
| 2. Synthesis and RAG | Themed report JSON plus a RAG feasibility dashboard | Once the team has corrected or explained the gaps found in stage 1 |

**Stage 1 is completeness and consistency only.** It is not thematic analysis, not feasibility
assessment, not a RAG rating and not a programme synthesis. Do not analyse enablers, barriers or
recommendations there.

**Stage 2 assumes stage 1 has already happened.** Note residual data-quality problems as a brief
caveat only; do not let them become the main output unless they materially affect
interpretation.

If the user just uploads a file and says "analyse this", ask which stage they want, and say that
stage 1 normally comes first.

## Workflow

### Always: run the deterministic scripts first

Before reading the assessment for meaning, run the two scripts in `scripts/`, in the order
`scripts/README.md` prescribes.

```bash
# 1. Deterministic checks, as JSON. Run this at both stages.
python3 scripts/consistency_checks.py path/to/export.json --json

# 2. A compact digest of the answers.
#    Stage 1 needs blanks included, so pass no flags.
python3 scripts/summarise_export.py path/to/export.json

#    Stage 2 may drop blanks and cap the size.
python3 scripts/summarise_export.py path/to/export.json --skip-blanks --max-chars 60000
```

`scripts/` contains exactly two runnable scripts, `consistency_checks.py` and
`summarise_export.py`, alongside `sample_export.json`, `test_consistency_checks.py` and
`README.md`. There is no separate validation script and no separate completeness script.
`consistency_checks.py` computes the completeness figures itself, and warns on stderr if the
export has no components, but it does **not** enforce the contract: it accepts a bare unwrapped
export object, so checking for the `sehraExport` key and the version is your job, not the
script's. Notes on the flags:

- `--skip-blanks` is for **stage 2 only**. Never use it for the completeness review, which
  depends on seeing what is missing.
- `--max-chars N` drops whole sections from the end and names them in a closing note. If that
  note appears, do not draw conclusions about the parts you were not shown.
- `consistency_checks.py` also takes `--severity major|minor` for its human-readable output.
- Both scripts accept `-` in place of a path to read the export from stdin.

If a script errors, say so in the output rather than silently substituting your own arithmetic.

### What the scripts actually check

`consistency_checks.py` returns deterministic fact, and only this:

- **Recomputed completion**, overall and per component, compared against the completion figures
  the export declares.
- **A blank inventory**, with each blank conservatively classified as a genuine gap or a
  conditional blank.
- **Total checks.** Any row or column literally named `Total`, and any grouped total of the form
  `<prefix> / Total`, compared against the sum of its siblings. A total is only checked when it
  and every sibling parse as numbers; otherwise it is reported as unverifiable. Percentage totals
  are never summed.
- **Unit checks.** A value above 100 with no percent sign in a field labelled as a rate,
  percentage, proportion, coverage or attendance; a percent sign in a field labelled as a count;
  rows that mix the two. Genuinely ambiguous labels are queried, not judged.
- **Value quality.** Values that look truncated, values that are ranges, and placeholders such as
  `TBC` or `N/A`.
- **Yes/No against remarks.** A Yes whose remarks describe absence, or a No whose remarks
  describe presence. This is phrase based: it catches blunt contradictions and misses hedged ones.
- **Cross-section comparison.** Two tables in *different* components sharing at least two row
  labels and two column labels are treated as the same grid, and any differing cell is reported
  with both figures and both locations.

That is the whole of it. The scripts have no domain knowledge: they do not know what an age
group, a school, an enrolment figure, a cadre, a facility, a screening number or a minimum wage
is. They check generic totals, units, value quality and repeated grids. It follows that:

> **Any reconciliation that is not in the script output is your judgement, not deterministic
> fact.** Where you compare figures the scripts did not compare, say plainly that the observation
> is a reviewer's reading of the entered values, quote both figures, and invite the team to
> confirm. Never present it as a verified reconciliation.

Treat script output as evidence, not as prose. You still decide which findings matter, how to
describe them and what to recommend. Where a script reports a mismatch, quote the actual figures.

### Stage 1: completeness review

Read `reference/completeness-review.md` in full, then produce the review it specifies:
overall finding, major items needing attention (location, issue, why it matters, suggested
action), numerical and internal consistency checks, per-component status, minor editorial
issues, and a bottom line. The bottom line must state explicitly whether the module is **ready
for thematic analysis**, before the list of priority corrections.

Default output is a readable Markdown review for the submitting team. If the user asks for JSON
to paste back into the website, emit the `CompletenessSchema` object documented at the end of
that reference file.

### Stage 2: synthesis and RAG dashboard

Read `reference/synthesis-and-rag.md` for the analysis instructions and
`reference/output-schema.md` for the exact output contract.

Produce two things, in this order:

1. **The report JSON**, matching `ReportContentSchema` exactly, so the human can paste it into
   the website's "Import report JSON" box and publish it as PDF and Word.
2. **A concise RAG feasibility dashboard** in the chat, for quick human review: per-component
   RAG with a short feasibility summary, overall RAG with its interpretation for this site, the
   top 10 priority actions, and the five-level legend. Keep it concise, ideally no more than 2 to
   3 pages, per Haroon's constraint.

The dashboard is a human-readable rendering of what is already inside the JSON. The two must
agree exactly. Do not invent a RAG level in one and not the other.

## Known deviation from Haroon's prompt: one document, not two

**To confirm with Haroon before this skill is used on a live partner assessment.**

Haroon's synthesis prompt asks for the synthesis report and the RAG feasibility dashboard as
**two separate documents or files, not one combined report**. The SEHRA website does not work
that way. It accepts a single `ReportContentSchema` object and publishes a single PDF and Word
document, with the RAG dashboard rendered on its own page inside it.

This skill follows the website, because the website is what a partner receives. So:

- The RAG content still exists as a distinct, self-contained section that could be lifted out
  whole. Write it so that it reads correctly on its own.
- Do not attempt to work around this by emitting two JSON objects or by asking the user to run
  the import twice. The website's contract is one object per report.
- When you deliver stage 2, note in the chat that the dashboard has been published as a page
  within the synthesis document rather than as a separate file, so the reviewer knows this is a
  deliberate platform difference and not an oversight.

Nothing else in Haroon's structure is dropped. Every element he lists for Output 2, the
per-component RAG ratings and summaries, the top 10 priority actions, the legend and the overall
interpretation, is present.

## The five components

Analyse and report in this fixed order, using these names:

1. Sectoral Legislation, Policy and Strategy
2. Institutional and Service Delivery Environment
3. Human Resources
4. Supply Chain
5. Barriers

The Context section is background for the whole analysis. It is not a sixth component and gets
no RAG rating of its own.

## RAG levels

Exactly five, spelled exactly like this:

`Green` · `Amber/Green` · `Amber` · `Red/Amber` · `Red`

Any other string is silently coerced to `Amber` by the website, so a typo quietly downgrades a
component. Full definitions and the verbatim legend are in `reference/synthesis-and-rag.md`.

## Hard rules

These apply to both stages and override any conflicting instinct.

1. **Never invent figures, names, policies, institutions or citations.** Every number in your
   output must appear in the assessment JSON or in a script's reconciliation of it. If a figure
   is needed and absent, say it is absent.
2. **Ground every claim in the JSON.** If you cannot point to the question or field that
   supports a sentence, do not write the sentence. Where evidence is thin but the direction is
   clear, phrase the conclusion cautiously rather than dropping it or overstating it.
3. **Examples are structure only.** Haroon's requirement: "Use the sample report only to
   understand the expected structure, level of detail, tone and type of output. Do not copy the
   wording, analysis, themes, RAG ratings or action points from the sample report. The new
   analysis must be original, context-specific and based on the SEHRA under analysis." This binds
   the worked example in `reference/output-schema.md`, the illustrative JSON in
   `reference/completeness-review.md`, and any earlier SEHRA report shown to you. Take the shape.
   Take nothing else.
4. **Blanks may be conditional, not missing.** Much of Module 1 uses Yes/No logic where a
   follow-up only applies if the answer was Yes, or vice versa. Judge each blank as either an
   appropriate conditional blank or a genuine gap. Never report a raw blank count as an
   incompleteness score.
5. **Do not do arithmetic in your head.** Totals, rates and reconciliations come from the
   scripts. The scripts cover less ground than the review asks about, so where you need a
   comparison they do not perform, present it as your reading of the entered figures and label it
   as such, quoting both values. Never produce an unverified number, and never let a reviewer's
   observation be mistaken for a script's finding.
6. **Rates are not counts.** Attendance and enrolment fields are a common source of confusion.
   Flag values that look like a rate entered in a count field, or the reverse, instead of
   silently reinterpreting them.
7. **British English, no em dashes.** Programme, organisation, prioritise, recognise. Plain
   professional public-health register.
8. **Stay in scope.** Stage 1 does not rate feasibility. Stage 2 does not become a completeness
   audit.
9. **This is partner-facing.** A human at Peek reviews, edits and approves everything before it
   reaches a partner. Write so that a reviewer can trace each claim back to a field. Flag
   anything you are unsure about rather than smoothing it over.

## Reproducibility and oversight

Every run should be traceable. In the chat, before the analysis, state:

- the organisation, country, region and district from the export
- the export's `version` and `exportedAt`
- the assessment `id` and `status`
- which scripts you ran and whether any reported an error

This lets Peek re-run the same export later and compare, and it lets a reviewer see exactly what
the analysis was based on. Do not paste this header inside the report JSON; it belongs in the
conversation, not in the published report.

## Reference files

- `reference/completeness-review.md`: stage 1 instructions and required output structure
- `reference/synthesis-and-rag.md`: stage 2 analysis instructions, RAG levels and legend
- `reference/output-schema.md`: the exact report JSON contract, with a worked example
- `README.md`: plain-English install and use guide for non-engineers at Peek
