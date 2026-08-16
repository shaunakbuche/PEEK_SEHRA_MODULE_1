# How AI is used in SEHRA Module 1 analysis

**Document version:** 0.1 (draft for review)
**Date:** 16 August 2026
**Owner:** Shaunak Buche, Peek Vision
**For review by:** Mert (technical advisor), Priya, Haroon
**Scope:** the SEHRA Scoping Module (Module 1) only. It does not cover Modules 2 and 3, Peek's
screening software, or any other Peek product.

---

## 1. Purpose

Peek asks partner organisations to complete the SEHRA Scoping Module: a long structured
questionnaire covering context plus five components (legislation and policy, institutional and
service delivery environment, human resources, supply chain, barriers). Peek then returns two
things to the partner:

1. a **completeness and consistency review**, so the partner can correct the module before it is
   analysed, and
2. a **synthesis and feasibility report** with a RAG dashboard, which the partner uses for
   planning and advocacy.

Both are currently written by hand by Haroon, Peek's SEHRA consultant. Each takes considerable
expert time, and that time is the constraint on how many partners Peek can support.

The purpose of this work is to produce a **first draft** of each output, faster and more
consistently, so that expert time is spent on judgement and correction rather than on transcription
and arithmetic. The output is partner-facing, so the method has to be auditable and every report has
to pass through a named human reviewer before it leaves Peek.

## 2. What the AI does and does not do

**The AI does:**

- Read the complete set of submitted answers, remarks, tables, reflections and summary items for
  one assessment.
- Draft a completeness and consistency review that distinguishes genuine gaps from blanks that are
  correct because of Yes/No logic.
- Draft a themed synthesis: enablers, barriers, cross-cutting summary and action points per
  component, grouped under themes derived from the evidence in that assessment.
- Propose a RAG feasibility rating per component and overall, with a written justification.
- Propose up to ten prioritised actions across the whole assessment.
- Produce that synthesis **twice, independently and blind**, then reconcile the two passes into one
  report that surfaces where they disagreed (section 6, blind double extraction and reconciliation).

**The AI does not:**

- Publish anything. Every output is a draft in Peek's review interface until a named Peek reviewer
  approves it.
- Perform arithmetic, or judge whether a number is right. All numeric checking is done by
  deterministic Python (section 4).
- Score the module or gate a partner. The RAG rating is an analytical judgement offered to the
  reviewer, not an automated decision about the partner.
- Contact the partner, request information, or take any action outside producing text.
- Use information from outside the submitted assessment. It has no browsing, no retrieval over
  other partners' data and no access to Peek's wider files. Where it needs framing (WHO eREC, IPEC,
  SPECS 2030) that framing is fixed in the prompt, not looked up.
- Replace the site visit, the desk review, or the assessor's own judgement recorded in the module.

## 3. The pipeline

The analysis is deliberately split into stages that run at different times, on different views of
the same data, with different output contracts. Stages 1 and 2 are the two analytical stages: an
audit, then an interpretation. Stages 3 and 4 exist because stage 2 is run twice and the two passes
have to be compared and reconciled; they are described in full in section 6.

```
  Partner completes Module 1 in the web platform
                  |
                  v
  [ EXPORT ]  canonical export JSON (sehraExport v1.0), SHA-256 recorded
                  |
                  +--------------------------------------------------+
                  |                                                  |
                  v                                                  |
  STAGE 1  Completeness and consistency review (runs once)           |
    a. Python scripts: blanks, arithmetic, rate-vs-count,            |
       cross-section reconciliation, structural Yes/No checks        |
    b. Claude: interprets the script findings, judges conditional    |
       vs genuine blanks, writes the review                          |
                  |                                                  |
                  v                                                  |
  Peek reviews and edits -> partner corrects the module -------------+
                  |                                       (re-export)
                  v
  STAGE 2  Synthesis and RAG (only on a corrected module)
           RUN TWICE, BLIND, from the same export and the same
           deterministic findings
    a. Same Python findings, carried forward as a data-quality caveat
    b. Claude: themed synthesis, cross-cutting summaries, RAG,
       strategy and policy implications, top ten actions
                  |
          pass A -+- pass B     two fresh conversations, neither
                  |             able to see the other's output
                  v
  STAGE 3  Deterministic comparison (code, not the model)
    python3 scripts/compare_runs.py run-A.json run-B.json
                  |
                  v
  STAGE 4  Reconciliation: Claude is given both runs plus the
           comparison output and writes the FINAL report.
           Divergences are surfaced, never averaged. A RAG gap of
           two or more levels escalates to human adjudication.
                  |
                  v
  Peek reviews and edits in the platform -> approve -> PDF and DOCX to partner
```

### Why stages 1 and 2 are separate

- **They answer different questions.** Stage 1 asks "is this module complete and internally
  consistent". Stage 2 asks "what does this evidence mean for feasibility". Mixing them produces a
  report that is part audit and part analysis and is weak at both.
- **They need different views of the data.** Stage 1 must see every blank field explicitly,
  because absence is the finding. Stage 2 works better on the answered content, with blanks reduced
  to a caveat. The two digests in the codebase reflect exactly this: `buildCompletenessDigest`
  includes `[blank]` markers and every table cell, `buildAssessmentDigest` omits empty answers.
- **Corrections must happen upstream of interpretation.** A synthesis built on an unreconciled
  school total or an enrolment figure that is actually a rate will carry that error into the
  narrative and into the RAG rating, where it is much harder to spot. Stage 1 exists to stop that.
- **The cost of an error differs.** A missed blank in stage 1 costs a follow-up email. A wrong
  feasibility judgement in stage 2 reaches a ministry. The stages therefore get different amounts
  of review attention.
- **Different audiences.** Stage 1 output is working correspondence with the assessor. Stage 2
  output is a published document.

Both stages run from one skill bundle, `skill/sehra-analysis/`, which is uploaded to Peek's Claude
Enterprise account. `SKILL.md` holds the workflow and the hard rules; `reference/` holds the
per-stage instructions and the output contracts; `scripts/` holds the deterministic Python checks.

The instructions and schemas are held in the repository and are the source of truth for wording and
intent:

| Stage | Instructions | Server-side prompt | Output schema |
|---|---|---|---|
| 1. Completeness review | `skill/sehra-analysis/reference/completeness-review.md` | `api/_lib/completenessSkill.ts` (`COMPLETENESS_SYSTEM`) | `src/lib/completenessTypes.ts` (`CompletenessSchema`) |
| 2. Synthesis and RAG | `skill/sehra-analysis/reference/synthesis-and-rag.md` | `api/_lib/reportSkill.ts` (`REPORT_SKILL_SYSTEM`) | `src/lib/reportTypes.ts` (`ReportContentSchema`) |

Both were written from Haroon's original instructions and keep his wording. The skill and the
server-side prompt must say the same thing; they exist in parallel only while the hosted path is
retired. The RAG legend is fixed verbatim in `RAG_LEGEND` in `src/lib/reportTypes.ts` and is never
paraphrased by the model. Any string outside the five permitted RAG levels is coerced to `Amber` by
the website, so a typo silently downgrades a component; this is called out in `SKILL.md` and is
checked at review.

## 4. The deterministic and LLM split

This is the core design decision. **Numbers are never judged by the model.**

Everything that can be decided by arithmetic or by a structural rule is decided by Python scripts
that run before the model is called. Their output is a findings file. The model receives that file
as fixed input, is told to treat it as authoritative, and is instructed not to compute, restate or
contradict any arithmetic conclusion of its own.

### 4.1 What the deterministic scripts decide

| # | Check | What it does | Example fields |
|---|---|---|---|
| D1 | Blank census | Enumerates every answer key in the module, marks each answered, blank-conditional or blank-gap. Conditional rule: a Yes/No question answered "No" whose follow-up prompts only apply to "Yes" is expected to have empty remarks; a question answered "Yes" that carries follow-up prompts and has empty remarks is a genuine gap. | all keys |
| D2 | Row and column arithmetic | Recomputes every stated total from its parts and reports the difference. | `ctx_schools` (five level columns must sum to the Total column, per row), `ctx_enrol` (M + F must equal Total, per sector) |
| D3 | Cross-section reconciliation | Compares the same quantity where the module asks for it twice, and reports both figures plus the mapping assumption used. | `ctx_schools` against `c2_inf_edu`; `ctx_children` age bands against `ctx_pop` |
| D4 | Rate versus count | Tests whether a triple behaves like counts (M + F = Total) or like rates (Total lies between M and F), and compares that to the type the field asks for. Also flags values above 100 in a percentage field and suspiciously small values in a count field. | `ctx_enrol` (labelled "or Net Enrolment Rate"), `ctx_attend` |
| D5 | Bounds and internal ordering | Percentages within 0 to 100; a combined-sex prevalence figure that falls outside the male and female range. | `ctx_prev` |
| D6 | Malformed numerics | Trailing or mixed thousands separators, truncated entries, stray characters inside a numeric cell, non-numeric text where a number is expected. | any numeric cell |
| D7 | Structural Yes/No checks | "Yes" with empty remarks where remarks are expected; negation vocabulary in remarks attached to a "Yes", and affirmation vocabulary attached to a "No". | all `yn` questions |
| D8 | Completion statistics | Answered and total field counts overall and per component. Feeds the `completion` block of the export. | all keys |
| D9 | Affordability ratios | Divides each spectacle price by the stated minimum wage and reports the ratio. It does not say whether that is affordable. | `c4_costing` against `c4_minwage` |
| D10 | Export integrity | Confirms the export declares `version: "1.0"`, carries every required block, and records the SHA-256 of the canonical JSON. | whole export |

Two of these are explicitly heuristic and are reported as **candidates for review**, never as
findings:

- **D7 negation scan.** A remark attached to "Yes" that contains "not", "none", "absent" or
  "non-functional" is very often a real contradiction, and is sometimes correct English ("Yes, but
  it does not cover spectacles"). The script surfaces the pair; the model or the reviewer decides.
- **D3 cross-section reconciliation.** The two school tables do not use the same taxonomy.
  `ctx_schools` has a combined "NGO or Faith-based" row and a "Higher Secondary" column;
  `c2_inf_edu` splits NGO, Charity and Faith-based and has no Higher Secondary column. The script
  therefore reports both figures and states the mapping it assumed, rather than asserting an error.
  This mirrors how the check is done by hand today: the reviewer asks which figure is intended
  rather than declaring one wrong.

### 4.2 What the model decides

- Whether a blank is an acceptable omission in context or something the assessor must go back for.
- What a set of answers means: which enablers and barriers are material, how they interact, what
  follows for programme design, sequencing and policy advocacy.
- Which themes the evidence in this particular assessment actually supports. The nine recurring
  SEHRA themes are passed only as hints, and the prompt explicitly requires context-appropriate
  themes derived from the evidence rather than mechanical application of the list.
- The RAG rating per component and overall, justified by the balance of enablers and barriers.
- Priority and sequencing of the recommended actions.
- At stage 4, which of two divergent readings the evidence better supports, and what to say about a
  divergence that cannot be resolved. **Whether** the two passes diverged is not a model judgement;
  that is computed by script at stage 3.
- The wording of everything.

### 4.3 How the boundary is enforced

The scripts live in `skill/sehra-analysis/scripts/` and are run before any reading for meaning:

```bash
python3 scripts/validate_export.py     export.json   # shape and contract version
python3 scripts/completeness_checks.py export.json   # blanks, conditional blanks, coverage
python3 scripts/consistency_checks.py  export.json   # arithmetic and cross-section checks
```

One further script runs **after** the model rather than before it, and is deterministic for the same
reason:

```bash
python3 scripts/compare_runs.py run-A.json run-B.json  # stage 3: where the two passes agree
```

It takes the two blind synthesis passes and computes where they agree and where they differ. The
model is not asked whether its two runs agreed, because a model asked to assess its own output will
tend to reconcile it. Agreement is a mechanical property of two JSON documents, so it is measured
mechanically, and the model sees the answer as fixed input at stage 4.

- The scripts run first. Their JSON output is part of the model's input, not something the model
  can regenerate.
- `SKILL.md` states the rule directly: do not do arithmetic in your head, totals and
  reconciliations come from the scripts, and if a calculation is needed that the scripts do not
  perform, say so rather than producing an unverified number.
- The model quotes figures only as they appear in the export or in the script output, and makes no
  arithmetic claim that is not already there.
- If a script errors, the run says so. It does not fall back to the model doing the sums.
- Any arithmetic statement in a draft that cannot be traced to script output is treated as a
  defect, both in review and in validation scoring.
- Script output is retained in the run record, so a reader of the final report can trace any
  numeric statement back to the check that produced it.

### 4.4 Worked example

The following pattern is taken from a real hand-written review (structure preserved, figures
changed):

A partner enters school counts by level for the public sector, and separately enters a total. The
row sums to 2,428 and the total field says 2,495. The NGO and faith-based row is all zeros but its
total field says 2,860, which looks like a grand total entered in the wrong cell. A later
infrastructure table gives a different secondary-school figure for the same sector.

- **D2** reports: public row sum 2,428, stated total 2,495, difference 67.
- **D2** reports: NGO/faith row sum 0, stated total 2,860, difference 2,860.
- **D3** reports: `ctx_schools` public secondary 329 against `c2_inf_edu` public secondary 396,
  mapping assumption stated.
- **The model** writes: these three figures need reconciling before the module can be analysed;
  the 2,860 looks like an intended grand total sitting in the wrong field; please confirm which
  secondary figure is correct.

No number in that output was produced by the model. Every arithmetic claim came from a script, and
the model supplied only the interpretation and the wording.

## 5. Observability

### 5.1 The run record

Every run of either stage produces a run record. Nothing is published without one.

| Field | Content |
|---|---|
| `runId` | Unique id for the run |
| `runAt` | UTC timestamp |
| `operator` | The Peek staff member who ran it |
| `stage` | `completeness` or `synthesis` |
| `assessmentId`, `organisation` | What was analysed |
| `exportVersion` | `sehraExport` contract version, currently `1.0` |
| `exportSha256` | Hash of the canonical export JSON, so the exact input is identifiable |
| `exportLocation` | Where the export file is stored |
| `skillVersion` | Version of the skill bundle, for example `sehra-synthesis/1.0.0` |
| `scriptVersion` | Version of the deterministic script set |
| `model` | Model identifier used for the run |
| `deterministicFindings` | The scripts' JSON output, verbatim |
| `extraction` | `double` or `single`. `single` must carry the reason, and must also appear in the report's `dataQualityNote` |
| `runA`, `runB` | Both blind synthesis passes as returned, `run-A.json` and `run-B.json`, unedited. Retained even where they were superseded at reconciliation |
| `blindnessConfirmed` | Whether pass B was produced in a fresh conversation with no sight of pass A. If this cannot be affirmed, the run is not double extraction and is recorded as `single` |
| `comparisonOutput` | The verbatim JSON output of `compare_runs.py`, the stage 3 record of where the passes agreed |
| `reconciliationDecisions` | For each divergence the comparison found: what each pass said, what the final report says, and why. Including any divergence escalated for human adjudication and how it was settled |
| `modelOutputRaw` | The model's JSON output as returned, before any human edit. Under double extraction this is the stage 4 reconciled report |
| `schemaValidation` | Pass or fail against `ReportContentSchema` / `CompletenessSchema`, with errors if any |
| `humanEdits` | Every save between generation and publication: editor, timestamp, full content snapshot |
| `publication` | Approver, approval timestamp, PDF and DOCX URLs |

### 5.2 Where it lives

Runs happen inside Peek's Claude Enterprise account, so the conversation itself is retained under
Peek's Enterprise retention settings and is visible to Peek administrators. `SKILL.md` requires the
run to open with a header stating the organisation, country, region and district, the export's
`version` and `exportedAt`, the assessment id and status, and which scripts were run and whether any
errored. That header makes the transcript readable as a record. It is deliberately kept out of the
report JSON, so it cannot leak into a published document.

The transcript is useful for debugging but is not the durable record. The durable record is stored
with the report in the platform. A report brought back in through the website's import path is
tagged `ai_model = "skill:sehra-analysis"`, which distinguishes a skill run from a hosted API run
and from a no-model template report.

**Recorded by the platform today:**

- `reports.content`: the current report content.
- `reports.ai_model`: the model identifier.
- `report_edits`: one row per save, with `editor_id`, `created_at`, and a **full content snapshot**
  (the column is named `diff` but stores a snapshot, so any diff can be reconstructed).
- `reports.approved_by`, `reports.approved_at`: who published and when.
- `assessments.answers`: the live answer set.

**Known gaps, to be closed by the platform work stream:**

1. **The AI's original draft is not retained.** Generation writes the draft into `reports.content`;
   the first human edit overwrites it, and the `report_edits` snapshot is taken after the edit. The
   pre-edit baseline is therefore lost, which makes "what did the human change" unanswerable. Fix:
   write a baseline snapshot at generation time.
2. **No export hash, skill version or script version is stored.** Without these a run cannot be
   reproduced or attributed to a specific skill revision.
3. **The completeness review is not persisted at all.** It is generated and returned to the
   browser. Fix: store it as a run artefact against the assessment.
4. **`assessments.answers` is mutable.** The partner can keep editing, so the answers row is not a
   record of what was analysed. The export JSON plus its hash is the input record; the answers table
   is not.

These gaps are stated here because this document goes out for review and should describe the
system as it is, not as intended.

## 6. Reproducibility

**The claim.** The same export JSON, run through the same skill version with the same script
version, should produce a materially equivalent analysis: the same deterministic findings exactly,
and a synthesis that reaches the same RAG ratings and the same substantive conclusions.

**The claim we do not make.** Output will not be bit-identical. Language models are not
deterministic, and repeated runs will differ in wording, ordering within a list, and occasionally in
which of several valid themes is chosen.

**What makes reproduction possible:**

- **Immutable input.** The export JSON is the analysed artefact, hashed and stored. The live answers
  table can change afterwards without affecting what was analysed.
- **Fixed contract.** The export follows `sehraExport` v1.0, and blanks are represented explicitly
  with `blank: true` and `answer: null`, so absence survives the round trip.
- **Versioned skill.** The skill bundle `skill/sehra-analysis/` (its instructions, its Python
  scripts and its reference files) is version-controlled in this repository and versioned
  semantically:
  - patch, wording clarification with no expected change to output;
  - minor, new checks or new sections;
  - major, a change to the output contract.
- **Deterministic pre-checks.** Every numeric finding is reproducible exactly, because it comes from
  code. This is the part of the analysis that most needs to be stable, and it is fully stable.
- **Structured output.** Both stages return JSON validated against a Zod schema, so the shape of the
  analysis cannot drift even when wording does.
- **Recorded model identity.** The run record names the model, so a change of model is visible as a
  change of conditions rather than an unexplained change in output.
- **Human review.** The final published text is the reviewed text, and the review is recorded, so
  the published artefact is stable regardless of run-to-run variation in the draft.

**Re-running.** To reproduce a past run: take the export file named in the run record, verify its
SHA-256, check out the skill version named in the run record, run both stages, and compare against
`deterministicFindings` (must match exactly) and `modelOutputRaw` (compare substantively, using the
rubric in `VALIDATION-PROTOCOL.md`). A stability check of this kind is part of the validation
protocol.

### Blind double extraction and reconciliation

**What it is.** The synthesis is produced **twice, independently, without either pass seeing the
other**, and a separate reconciliation step resolves the differences into the report that is
actually issued. The method is borrowed from systematic reviews, where two reviewers extract data
from the same paper independently and a defined step settles their disagreements. Mert demonstrated
it on a 75-poster analysis project and asked for the same rigour here, because this output is
partner-facing. Until now the synthesis ran once; this closes that gap.

**Why it is worth the extra run.** A single pass produces one answer and no way to tell a confident
right answer from a confident wrong one. Fluent output looks the same either way. A second
independent pass gives something to compare against: where the two agree, the reading is at least
stable; where they diverge, the divergence is itself a finding, and it points at the parts of the
assessment where the evidence is thin, ambiguous or genuinely open to two readings. Those are
precisely the passages a reviewer should spend time on, and a single run gives no way of locating
them.

**The four stages:**

| Stage | What happens | Who or what does it |
|---|---|---|
| 1 | Completeness and consistency review. **Unchanged, runs once.** Double extraction applies to the synthesis, not to the audit | Scripts, then the model |
| 2 | Synthesis run **twice**. Pass A runs normally from the export and is saved as `run-A.json`. Pass B runs again in a **fresh conversation** with no sight of pass A, from the same export and the same deterministic script output, and is saved as `run-B.json` | The model, twice, blind |
| 3 | `python3 scripts/compare_runs.py run-A.json run-B.json` computes where the two passes agree and where they disagree | **Code, not the model** |
| 4 | The model is given **both** runs plus the comparison output and produces the final report, under the rules below | The model, reasoning under stated rules |

**Blindness is the whole exercise.** If pass B can see pass A it will anchor on it, agreement
becomes an artefact of the second pass having read the first, and the comparison measures nothing.
Pass B therefore runs in a fresh conversation. **If a fresh conversation is not possible, the run is
not blind, and it must be recorded as single-pass** rather than presented as double extraction.

**The rules stage 4 works under:**

- **Disagreements are surfaced, never silently averaged or split.** Splitting the difference between
  two readings produces a third reading that neither pass supported and that no evidence backs.
- **RAG divergence of one level** is reconciled in the report, with the reason stated.
- **RAG divergence of two or more levels is a red flag.** Do not pick one. Escalate it for human
  adjudication, say so in the report's `dataQualityNote`, and record it in the run record. Two
  passes over the same evidence landing two levels apart means the evidence does not support a
  confident rating, and that is the finding.
- **Content appearing in only one pass is not automatically wrong.** One pass noticing something the
  other missed is a normal and useful result. It is judged against the evidence and kept if
  supported.
- **Content in neither pass is never invented at reconciliation.** Stage 4 resolves what the two
  passes produced; it is not a third opportunity to write new analysis.
- **Different theme wording between passes is expected and is not itself a disagreement.** Themes
  are derived from the evidence rather than chosen from a fixed list, so two passes will name them
  differently. What matters is whether the same underlying evidence was captured, not whether the
  label matched.
- **The `dataQualityNote` in the final report must record that double extraction was used**, and
  must note any divergence left unresolved. `ReportContentSchema` has no dedicated field for this,
  so `dataQualityNote` is where it goes, and the report contract is unchanged.

**What is added to the run record.** Both pass files, the comparison output verbatim, and the
reconciliation decisions, so a reader can see not only what the report concluded but what the two
passes disagreed about on the way there. The fields are listed in section 5.1.

**Single-pass fallback.** Running the synthesis once is permitted where time does not allow two
passes. It must then be **recorded explicitly, in the run record and in the report's
`dataQualityNote`**. Single-pass work must never be presented as double-extracted. The disclosure is
the point: a reader is entitled to know which assurance the report carries, and a fallback that is
invisible in the output is worse than no fallback, because it makes every report's provenance
uncertain.

**What this does not fix.** Double extraction reduces the risk of a confident wrong answer. It does
not eliminate it. **Both passes use the same model and the same prompt, so they can fail the same
way**, and two passes that share a misreading of the evidence will agree with each other
confidently. Agreement between the passes is therefore evidence of stability, not evidence of
correctness. It does not replace the reviewer's check against the export, and no gate in
`VALIDATION-PROTOCOL.md` is relaxed because a report was double-extracted.

## 7. Human in the loop

**Nothing reaches a partner unreviewed.** The workflow enforces this: generation creates a draft
with status `generated`, editing moves it to `edited`, and only an explicit approve action renders
the PDF and DOCX and releases them to the partner's workspace.

**Roles:**

- **Operator** (Peek staff) runs the export and the stages, keeps the two synthesis passes blind of
  each other, runs the comparison script, and checks that the run completed and validated.
- **Reviewer** (Haroon, or a Peek analyst with his sign-off) reads the draft against the export,
  edits it in the platform, and approves it. **The reviewer is accountable for the final text.**
  Once approved, the report is Peek's report, not the model's.
- **Adjudicator** settles any divergence stage 4 escalated, in practice the reviewer. A RAG gap of
  two or more levels between the passes is decided by a person, with the decision and the reason
  written into the run record. It is not left to the model and not left unstated in the report.
- **Approver** is recorded in `reports.approved_by`. If reviewer and approver differ, both are on
  the record.

**What the reviewer must check before approving**, at minimum:

1. Every figure quoted in the narrative appears in the export or the deterministic findings file.
2. No named policy, institution, study or person appears that is not in the submitted module.
3. The RAG rating for each component is supported by the enablers and barriers listed beneath it.
4. Themes reflect this assessment rather than a generic list.
5. Action points are specific to this context and traceable to a barrier identified in the module.
6. The data-quality caveat matches what the completeness review actually found.
7. The data-quality caveat states whether the report was double-extracted or single-pass, and any
   divergence escalated for adjudication is recorded there and has actually been adjudicated.
8. Where the two passes diverged, the reconciliation decision is one the reviewer would defend, and
   nothing has been averaged into a middle position that neither pass supported.
9. House style: British English, no em dashes, no over-claiming where evidence is thin.

**Escalation.** If the reviewer judges the draft to be materially wrong rather than in need of
editing, the correct action is to discard it, record why in the run record, and write by hand. A
draft that takes longer to fix than to replace is a validation signal, and should be reported as
one rather than absorbed silently.

## 8. Limitations and failure modes

| Failure mode | Why it happens | Mitigation | Residual risk |
|---|---|---|---|
| **Hallucinated specifics**: a policy name, a study, a figure, an institution that is not in the module | Models fill gaps with plausible domain content | Prompt forbids inventing statistics, names and policies; numbers come only from scripts; reviewer check 1 and 2; validation gates fabrication as a hard fail | Low but never zero. This is the single most damaging failure for a partner-facing document, so it is checked explicitly, every time |
| **Over-confident synthesis from thin evidence**: a firm conclusion drawn from one sparse answer | Sparse input still produces fluent output | Prompt requires cautious phrasing where evidence is thin; stage 1 runs first so thin sections are known; the data-quality caveat is a required field; two blind passes tend to diverge exactly where evidence is thin, which makes those passages visible at stage 4 | Moderate. Fluency reads as confidence, so the reviewer must weigh evidence, not prose |
| **Missed cross-references**: a contradiction between two components goes unnoticed (for example insurance covers eye care in one place, spectacles excluded in another) | Long input, and cross-component reasoning is harder than local reasoning | D3 and D7 make the mechanical cases explicit; the completeness prompt names insurance and benefit-package harmonisation and standalone-versus-integrated programme distinctions as required checks | Moderate for the non-mechanical cases. The model can only be prompted to look; it cannot be guaranteed to find |
| **Theme drift**: themes become generic, or differ arbitrarily between two similar assessments | Theme derivation is open by design | Recurring themes supplied as hints; validation scores whether themes fit the evidence; reviewer check 4 | Moderate, and partly acceptable. Themes should differ between contexts. They should not be vacuous |
| **RAG rating misjudged** | Ratings compress a lot of evidence into one label | Legend fixed verbatim; rating must be justified by the listed enablers and barriers; validation measures agreement with the human rating per component | Moderate. Adjacent-level disagreement between two competent human reviewers is normal, and the acceptance threshold reflects that |
| **Restatement instead of synthesis**: a question-by-question paraphrase | The path of least resistance for a long questionnaire | Prompt requires analysis rather than restatement; validation scores coverage and actionability separately from accuracy | Low |
| **Silent input truncation**: a long assessment overruns and the model sees only part of it | Context limits | Run record captures the input; schema validation catches missing components; a component with no findings is a signal, not an output | Low, but must not be assumed away. Check that all five components are present |
| **Automation bias in review**: a plausible draft is approved with insufficient scrutiny | The draft looks finished | The checklist above is explicit; the run record makes review effort visible; validation records editing effort per report | This is the most likely long-run failure and the hardest to engineer away. It is a management issue as much as a technical one |
| **Schema drift**: prompt and Zod schema diverge | Two files, edited separately | Schema and prompt live in the same repository and are covered by tests; schema validation is part of the run record | Low |

## 9. Data handling and confidentiality

- Assessment content belongs to the partner organisation and is confidential. It contains
  organisational detail, staffing numbers, financing arrangements and candid assessor commentary
  about government systems.
- **Runs are executed inside Peek's Claude Enterprise account.** Enterprise usage is governed by
  Peek's own agreement and administrative controls, and customer inputs and outputs are not used to
  train models. This replaces the previous design, which called a third-party API key from the
  server.
- The dependency on `ANTHROPIC_API_KEY` in the deployed platform is being retired as part of this
  change. Until it is, the key remains a server-side environment variable that is never exposed to
  the browser.
- Exports contain no individual personal data. They are organisational assessments. If an assessor
  types a named individual into a free-text field, that field is partner data and is treated as
  confidential like the rest.
- Export files, run records and drafts are stored in Peek's own infrastructure (Vercel Postgres and
  Blob for the platform, the Enterprise workspace for run transcripts). They are not shared with
  other partners, and no partner's data is used as an example in another partner's analysis.
- Reports are released to the partner that submitted the assessment. Any wider publication is a
  separate decision for Peek and the partner, not a function of this pipeline.
- Validation work uses past assessments supplied by Peek and is subject to the same handling.
  Extracts used in documentation are anonymised or have figures changed, as in section 4.4.

## 10. Change control

- This document is versioned with the repository. Material changes to the pipeline require a
  matching update here in the same change.
- A change to either system prompt or to the deterministic scripts is a skill version change and is
  recorded in every subsequent run record.
- Re-validation is triggered by: a major or minor skill version change, a model change, a change to
  the export contract, or a change to the Module 1 question set. See `VALIDATION-PROTOCOL.md`.

## 11. Status at the time of writing

| Component | Status |
|---|---|
| Web platform: assessment, submission, admin review, edit, approve, PDF and DOCX publishing | Built and live |
| Completeness review prompt and output schema | Built (`completenessSkill.ts`, `completenessTypes.ts`) |
| Synthesis and RAG prompt and output schema | Built (`reportSkill.ts`, `reportTypes.ts`) |
| Canonical export JSON (`sehraExport` v1.0), `src/lib/sehraExport.ts` | In progress |
| Report import into the website (`mode: "import"` on report generation) | In progress |
| Claude skill bundle `skill/sehra-analysis/` (SKILL.md and reference files) | In progress |
| Deterministic Python check scripts in `skill/sehra-analysis/scripts/` | In progress |
| Run record persistence and the four gaps in section 5.2 | Not started |
| Retiring `ANTHROPIC_API_KEY` from the deployed platform | Not started |
| Validation against past reports | Not started, blocked on Priya's files |

The hosted API path (**Generate report with AI** in the admin interface) still exists and still uses
`ANTHROPIC_API_KEY`. It is kept only so the platform keeps working while the skill path is
validated. Once validation passes, the skill path becomes the only route and the key is removed.
