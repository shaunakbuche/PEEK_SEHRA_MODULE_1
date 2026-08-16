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

Before reading the assessment for meaning, run the scripts in `scripts/`. They parse the export
and return facts as JSON: field and blank inventories, conditional-blank classification,
per-component completion, and every arithmetic reconciliation the module allows (age-group and
population totals, school counts against row and column totals, enrolment, attendance rates,
cadre and facility totals, spectacle costs against the stated minimum wage).

```bash
python3 scripts/validate_export.py     path/to/export.json   # shape and contract version
python3 scripts/completeness_checks.py path/to/export.json   # blanks, conditional blanks, coverage
python3 scripts/consistency_checks.py  path/to/export.json   # arithmetic and cross-section checks
```

List `scripts/` first and run whatever is there. If a filename differs from the above, the
contract still holds: **deterministic facts first, reasoning second.** If a script errors, say so
in the output rather than silently substituting your own arithmetic.

Treat script output as evidence, not as prose. You still decide which findings matter, how to
describe them and what to recommend. Where a script reports a mismatch, quote the actual figures.

### Stage 1: completeness review

Read `reference/completeness-review.md` in full, then produce the review it specifies:
overall finding, major items needing attention (location, issue, why it matters, suggested
action), numerical and internal consistency checks, per-component status, minor editorial
issues, and a bottom line with prioritised corrections.

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
   RAG with a one-line justification, overall RAG with its interpretation, the top 10 priority
   actions, and the five-level legend.

The dashboard is a human-readable rendering of what is already inside the JSON. The two must
agree exactly. Do not invent a RAG level in one and not the other.

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
3. **Blanks may be conditional, not missing.** Much of Module 1 uses Yes/No logic where a
   follow-up only applies if the answer was Yes, or vice versa. Judge each blank as either an
   appropriate conditional blank or a genuine gap. Never report a raw blank count as an
   incompleteness score.
4. **Do not do arithmetic in your head.** Totals, rates and reconciliations come from the
   scripts. If you need a calculation the scripts do not perform, say so explicitly rather than
   producing an unverified number.
5. **Rates are not counts.** Attendance and enrolment fields are a common source of confusion.
   Flag values that look like a rate entered in a count field, or the reverse, instead of
   silently reinterpreting them.
6. **British English, no em dashes.** Programme, organisation, prioritise, recognise. Plain
   professional public-health register.
7. **Stay in scope.** Stage 1 does not rate feasibility. Stage 2 does not become a completeness
   audit.
8. **This is partner-facing.** A human at Peek reviews, edits and approves everything before it
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
