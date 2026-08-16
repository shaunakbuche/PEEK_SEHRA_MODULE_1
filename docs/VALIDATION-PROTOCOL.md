# SEHRA Module 1 AI analysis: validation protocol

**Document version:** 0.1 (draft for review)
**Date:** 16 August 2026
**Owner:** Shaunak Buche, Peek Vision
**Companion document:** `METHODOLOGY.md`
**Status:** thresholds in section 7 must be agreed **before** any results are seen. Once agreed, do
not renegotiate them after looking at the data.

---

## 1. Purpose

To decide, on evidence, whether the AI-assisted analysis of SEHRA Module 1 is good enough to use on
live partner assessments, and if not, what specifically has to improve.

The comparator is the existing practice: Haroon reads the submitted module and writes the
completeness review and the synthesis report by hand. The question is not "is the AI good". It is
"is an AI draft, after Peek's normal review and editing, at least as good as what Peek sends today,
and produced in materially less expert time".

Two things are being validated separately, because they can fail separately:

- **Stage 1**, the completeness and consistency review. Largely objective. Measured by whether it
  finds what a human found, and whether it raises things that are not true.
- **Stage 2**, the synthesis and RAG report. Largely judgement. Measured by a rubric and by a
  blinded preference study.

## 2. Roles and materials

| Role | Person | Responsibility |
|---|---|---|
| Data owner | Priya | Supplies the past assessments and the final reports Peek sent, and confirms they may be used for validation |
| Preparer and operator | Shaunak | Reconstructs the export JSON, runs both stages, records everything, prepares blinded packets |
| Domain scorer | Haroon | Scores Part A and Part B against the rubric |
| Blinded reviewer | Haroon, plus at least one colleague who did not write the original reports | Part C |
| Method reviewer | Mert | Reviews this protocol before it runs, and the results after |

**Materials needed per past assessment:**

1. The completed Module 1 as submitted (Word, PDF or Excel, whatever exists).
2. The final report Peek sent to the partner.
3. The hand-written completeness review, if one exists for that assessment.
4. Any record of the RAG ratings given, if not in the report itself.

Expected set: six or seven assessments. Items 3 and 4 will not exist for all of them. Record what
exists for each.

## 3. Preparation: reconstructing an export per assessment

The pipeline consumes `sehraExport` v1.0 JSON. Past assessments exist as documents, so each has to
be reconstructed.

### 3.1 Procedure

1. Create an organisation and assessment in a **validation environment**, not the live production
   data, named `VAL-01` ... `VAL-07`.
2. Transcribe the submitted module into the platform, field by field. The document import feature
   (`api/_lib/extractSkill.ts`) may be used for a first pass, but **every field it fills must be
   checked by eye against the source document**. Import is a typing aid, not a data source.
3. Leave a field blank if the source document leaves it blank. Do not tidy, complete or infer.
   Blanks are the primary signal for stage 1, and filling one in destroys the test.
4. Reproduce malformed entries exactly as written, including truncated numbers, stray characters
   and inconsistent separators. These are precisely what the checks are meant to catch.
5. Export the JSON, record its SHA-256, and store it read-only. This is the frozen input.

### 3.2 The contamination rule

**Reconstruct from the submitted module only. Never from the final report.**

If the preparer has already read the final report, they will unconsciously repair the input. Where
possible, transcription is done before reading the report for that assessment. Where that is not
possible, it is recorded in the fidelity log, and that assessment is marked as potentially
contaminated when results are reported.

The same rule applies to the hand-written completeness review: it is not opened until after the AI
run for that assessment is complete and saved.

### 3.3 Fidelity log

One row per assessment, filled during preparation.

| Field | Value |
|---|---|
| Validation id | VAL-0n |
| Source documents held | module / final report / completeness review / RAG record |
| Source format and quality | e.g. scanned PDF, tables partly illegible |
| Transcribed by, date | |
| Fields not recoverable | list, with reason (illegible, absent from the source, question added to the module since) |
| Questions that did not exist when this assessment was done | list |
| Ambiguities resolved by judgement | list each, with the decision taken |
| Preparer had read the final report first | yes / no |
| Export SHA-256 | |
| **Fidelity grade** | **A** faithful, everything recoverable · **B** minor gaps, unlikely to change the analysis · **C** material gaps, results indicative only |

Grade C assessments are still run and still reported, but are excluded from the acceptance
thresholds in section 7 and labelled as such.

**Expect the module to have changed.** Questions have been reworded and added since the older
assessments were done. Where a question did not exist, its field stays blank and it is listed in the
fidelity log, so that a "genuine gap" finding against it can be discounted at scoring.

## 4. Run procedure

For each validation assessment, in order:

1. Confirm the export SHA-256 matches the frozen record.
2. Open a **fresh session** in Peek's Claude Enterprise account. Do not reuse a session across
   assessments: earlier assessments in the same conversation contaminate the next one.
3. Upload the export. Run stage 1 (completeness review). Save the full output.
4. Run stage 2 (synthesis and RAG) in a separate fresh session, on the **same, uncorrected** export.
   In live use stage 2 runs after corrections; for validation it must run on the same input the
   human analyst had, or the comparison is not like for like. Record this as a deliberate deviation.
5. Save the report JSON, confirm it validates against `ReportContentSchema`, and import it into the
   validation environment so it renders as it would in production.
6. **Do not edit the output before scoring.** Editing effort is itself a measure (section 6.4).

### 4.1 What to capture per run

Everything listed in `METHODOLOGY.md` section 5.1, plus:

| Item | Note |
|---|---|
| Wall-clock time from upload to usable draft | Includes script runs and any retries |
| Number of retries or reformulations needed | A run that needed three attempts is not a one-attempt run |
| Any script error | Verbatim |
| Any schema validation failure and what fixed it | |
| Whether the run header (organisation, export version, assessment id, scripts run) was produced | Required by `SKILL.md` |

### 4.2 Stability check

For **two** of the assessments, run stage 2 three times on identical input, in three fresh sessions.
Compare:

- deterministic findings: must be **identical**. Any difference is a bug, not variance.
- RAG ratings per component: record how many of the 5 components, times 3 runs, agree.
- themes chosen: record overlap.
- substantive conclusions: same, materially same, or different.

This measures the reproducibility claim in `METHODOLOGY.md` section 6. Report it as observed
behaviour, not as a pass or fail.

## 5. Part A: scoring the completeness review

Applies only to assessments where a hand-written completeness review exists.

### 5.1 Method

1. Read the human review. Break it into **discrete findings**: one distinct issue per line. A
   review that says "reconcile the public total and the NGO total" is two findings.
2. Classify each human finding as **arithmetic/structural** (a sum that does not add up, a blank
   field, a rate in a count field, a Yes with no remarks) or **judgement** (wording needs
   harmonising, a distinction needs clarifying).
3. Read the AI review and match its findings to the human list. Mark each human finding as found,
   partially found or missed.
4. List every AI finding with no human counterpart and classify it as **correct and useful**,
   **correct but trivial**, or **incorrect** (the AI is wrong about the data).

### 5.2 Measures

| Measure | Definition | Why it matters |
|---|---|---|
| Arithmetic recall | arithmetic/structural human findings found by the AI, over all such findings | These come from deterministic scripts. Anything less than near-total recall means a check is missing |
| Judgement recall | judgement human findings found, over all such findings | Expected to be lower. This is genuinely hard |
| False assertions | count of AI findings classified as incorrect | The critical failure. An AI review that sends a partner chasing a non-existent error destroys trust |
| Additional correct findings | count of AI findings that are correct, useful, and absent from the human review | The upside case. Machines are better than people at exhaustively checking every cell |
| Noise ratio | correct-but-trivial findings, over all AI findings | A review of forty trivia is not usable even if every item is true |

## 6. Part B: scoring the synthesis report

Scored against the human report for the same assessment, with the export open for reference.

### 6.1 Pre-registering the key findings

**Before reading the AI report**, the scorer extracts from the human report a checklist of the key
findings it contains: the substantive conclusions a reader must take away, typically eight to
fifteen items. This list is written down and fixed. Coverage is then scored against it. Extracting
the checklist after reading the AI report allows the list to bend towards what the AI happened to
say.

### 6.2 Rubric

Each dimension scored 0 to 4. Score against the anchors, not against an impression.

**V1. Factual accuracy** (is what it says about this assessment true)

| Score | Anchor |
|---|---|
| 4 | Every factual statement is supported by the export. Figures quoted correctly and in context |
| 3 | One or two minor imprecisions (a rounding, a slightly loose paraphrase). Nothing that changes a conclusion |
| 2 | Several imprecisions, or one error that a partner would notice but that does not change the conclusions |
| 1 | An error that changes a conclusion, or repeated misreading of the data |
| 0 | Substantially unreliable |

**V2. Coverage of key findings** (against the pre-registered checklist)

| Score | Anchor |
|---|---|
| 4 | Covers 90% or more of the checklist, with comparable depth |
| 3 | Covers 75 to 89%, and everything missed is secondary |
| 2 | Covers 50 to 74%, or misses one item the human treated as central |
| 1 | Covers 25 to 49%, or misses several central items |
| 0 | Covers under 25% |

**V3. RAG agreement** (scored separately, see 6.3)

**V4. Quality and actionability of recommendations**

| Score | Anchor |
|---|---|
| 4 | Specific to this context, traceable to an identified barrier, sensibly prioritised, and something a partner could act on next quarter. Names the actor where the evidence supports it |
| 3 | Mostly specific and traceable. One or two generic items |
| 2 | Half generic. Would need real rewriting before sending |
| 1 | Mostly generic eye-health advice that could apply to any country |
| 0 | Not actionable |

**V5. Tone and house style**

| Score | Anchor |
|---|---|
| 4 | British English, no em dashes, plain professional public-health register, cautious where evidence is thin, no marketing language. Reads as a Peek document |
| 3 | Minor slips, fixable with a quick pass |
| 2 | Noticeable register problems: over-claiming, padding, or inconsistent spelling conventions |
| 1 | Would need rewriting for tone alone |
| 0 | Unusable register |

Do not penalise the AI for referring to fields by component and subsection where the human report
referred to page numbers. That is a difference in convention, not in quality. Record it separately
if the scorer finds one materially more usable than the other.

**V6. Fabrication** (a gate, not a score)

Count every instance of a statistic, policy name, institution, study, citation or person that does
not appear in the export. **Any count above zero fails Gate A in section 7**, regardless of every
other score. Record each instance verbatim.

### 6.3 RAG agreement

For each of the five components, and for the overall rating, compare the AI rating with the human
rating on the five-level scale (`Green`, `Amber/Green`, `Amber`, `Red/Amber`, `Red`).

| Result | Meaning |
|---|---|
| Exact | Same level |
| Adjacent | One level apart. Treated as agreement, because two competent human reviewers routinely differ by one level |
| 2+ apart | Disagreement. Record and investigate |

Where the human report gave no explicit per-component rating, ask Haroon to assign one from the
report text before seeing the AI rating, and mark it as retrospectively assigned.

### 6.4 Operational measures

| Measure | How |
|---|---|
| Time to publishable | Haroon edits the AI draft in the platform until he would sign it, timed. Compared with his estimate of time to write the same report from scratch |
| Proportion of text changed | From the report edit snapshots: how much of the published text is the AI's and how much is the reviewer's |
| Length | Word count against the human report |

### 6.5 Scoring procedure

- Two scorers score independently where capacity allows, then reconcile by discussion. Where only
  Haroon can score, record that scoring is single-rater.
- Score V1, V2, V4, V5 and V6 with the export open. V3 needs the human report's ratings.
- Record a one-line justification for every score below 4. A score without a reason cannot be acted
  on in iteration.

## 7. Part C: the blinded comparison

### 7.1 Design

Paired, within-assessment, blinded to authorship, order randomised. For each assessment there is one
human report and one AI report. The reviewer sees both and states a preference on each of five
questions.

### 7.2 Preparing the packets

Prepared by Shaunak, not by any reviewer.

1. **Normalise formatting.** Render both reports into one identical skeleton: same headings, same
   order, same font, same numbering. Formatting is the strongest authorship tell and is not what is
   being judged.
2. **Strip identifiers.** Author names, dates, filenames, document properties, logos, headers,
   footers, tracked changes, comments.
3. **Neutralise structural tells.** The AI output carries a RAG dashboard and explicit theme
   headings that older human reports may not. **Remove the RAG dashboard from the blinded packet
   entirely.** RAG agreement is scored un-blinded in Part B, where it belongs. Where the human
   report has no theme headings, remove the AI's theme headings and present the points as lists.
4. **Randomise.** For each pair, a coin flip decides which report is labelled A and which is B. The
   flips are recorded in a file the reviewer does not see. Shuffle the order in which pairs are
   presented.
5. **Wash out.** Run Part C at least two weeks after the same person has done Part B scoring.

### 7.3 The honest limitation

Haroon wrote the human reports. He cannot be reliably blind to his own writing. This is stated up
front rather than papered over.

Mitigations:

- Recruit **at least one additional reviewer** with relevant eye-health or public-health experience
  who did not write the original reports. Their results are the primary blinded result. Haroon's
  results are reported separately as an expert but non-blind assessment.
- Measure blinding integrity: after each pair, ask "do you believe you wrote one of these? If so,
  which?" Report the proportion identified correctly. If the reviewer identifies authorship in most
  pairs, report the preference result as **unblinded** and say so plainly.

### 7.4 What the reviewer is asked

For each pair, five questions. Each answer is **A**, **B**, or **no meaningful difference**.

1. Which report is more **accurate** about this assessment?
2. Which report is more **complete** in covering what matters?
3. Which report gives more **useful, actionable** recommendations?
4. Which report would need **less editing** before you would send it?
5. Which report would you **send to a partner**? (plus confidence: low / medium / high)

Free-text per pair:

- What is the single biggest weakness of the weaker report?
- Is there anything in either report that is factually wrong or invented? Quote it.

Ties are allowed on all five questions. "No meaningful difference" is a real and useful result: it
means the AI draft reached the standard. Do not force a choice; a forced choice at the margin
manufactures a difference that is not there. Confidence on question 5 carries the weight instead.

### 7.5 Tallying

Six or seven pairs is a small sample. **Report counts, not statistics.** No significance testing, no
p-values, no percentages presented as if precise. The output is a table of counts per question plus
the free-text, and a short narrative of what the reviewers said.

## 8. Acceptance thresholds

Agreed before results are seen. Applied to fidelity grade A and B assessments only.

| Gate | Threshold |
|---|---|
| **A. Fabrication** | Zero fabricated statistics, names, policies, institutions or citations across all reports scored |
| **B. Arithmetic** | Arithmetic recall of 90% or better against the hand-written reviews, **and zero incorrect arithmetic assertions** |
| **C. Factual accuracy** | Mean V1 of 3.0 or better, and no single report below 2 |
| **D. RAG agreement** | 70% or more of component ratings exact or adjacent, and the overall rating within one level on all but one assessment |
| **E. Coverage** | Mean V2 of 2.5 or better, and no report below 2 |
| **F. Recommendations and style** | Mean V4 of 2.5 or better and mean V5 of 3.0 or better |
| **G. Blinded preference** | On question 5, the AI report preferred or tied in at least half of pairs, **and** the human report clearly preferred on accuracy (question 1) in fewer than five of seven pairs |
| **H. Time saved** | Median time to publishable no more than half the estimated time to write from scratch |

### 8.1 Decision rules

| Outcome | Condition | Action |
|---|---|---|
| **Ship to supervised pilot** | All gates pass | Use on live assessments with full human review as described in `METHODOLOGY.md` section 7. Track the same measures on the first five live reports |
| **Ship with conditions** | A and B pass, and exactly one of C to H misses narrowly (mean within 0.3 of threshold, or one report short) | Ship, with a named extra review step targeting the weak dimension, and re-check after three live reports |
| **Iterate** | A and B pass, but two or more of C to H miss, or any one misses widely | Revise the skill, scripts or prompts. Re-run and re-score the iteration set. Maximum three iterations before the holdout run |
| **Stop and redesign** | Gate A fails after two attempts to fix it, **or** Gate B fails, **or** the human report is clearly preferred on accuracy in five or more of seven pairs | The split between deterministic and model work is not holding. Return to design; do not tune prompts against it |

### 8.2 Guarding against overfitting

With six or seven reports, iterating against all of them will tune the skill to those reports rather
than to SEHRA assessments in general.

- **Hold out two assessments.** They are prepared and frozen at the start but never run during
  iteration, and no one reads their outputs while iterating.
- Iterate only on the remaining four or five.
- When the iteration set passes, run the holdout **once**. The holdout result is the reported
  result. If the holdout fails after the iteration set passed, that is evidence of overfitting, and
  the honest conclusion is that the method is not yet ready, not that the holdout was unlucky.
- Record every change made between iterations, with the reason. An undocumented tweak makes the
  final result uninterpretable.

## 9. Results templates

### 9.1 Preparation summary

| Val id | Country / area | Year | Source docs held | Fidelity grade | Not recoverable | Export SHA-256 (first 8) | Holdout |
|---|---|---|---|---|---|---|---|
| VAL-01 | | | | | | | no |
| VAL-02 | | | | | | | no |
| VAL-03 | | | | | | | no |
| VAL-04 | | | | | | | no |
| VAL-05 | | | | | | | no |
| VAL-06 | | | | | | | yes |
| VAL-07 | | | | | | | yes |

### 9.2 Part A, completeness review

| Val id | Human findings (arith) | Recall (arith) | Human findings (judgement) | Recall (judgement) | False assertions | Additional correct | Noise ratio |
|---|---|---|---|---|---|---|---|
| VAL-01 | | | | | | | |
| ... | | | | | | | |
| **Overall** | | | | | | | |

### 9.3 Part B, synthesis rubric

| Val id | V1 accuracy | V2 coverage | V4 recommendations | V5 style | V6 fabrications | Time to publishable | Words (AI / human) |
|---|---|---|---|---|---|---|---|
| VAL-01 | /4 | /4 | /4 | /4 | count | min | / |
| ... | | | | | | | |
| **Mean** | | | | | **total** | **median** | |

### 9.4 Part B, RAG agreement

| Val id | C1 | C2 | C3 | C4 | C5 | Overall |
|---|---|---|---|---|---|---|
| VAL-01 | AI / human / exact-adjacent-apart | | | | | |
| ... | | | | | | |
| **Exact** | | | | | | |
| **Adjacent** | | | | | | |
| **2+ apart** | | | | | | |

### 9.5 Part C, blinded comparison

Reviewer: ................  Blind to authorship: yes / partially / no  Authorship correctly identified in ... of ... pairs

| Question | AI preferred | Human preferred | No meaningful difference |
|---|---|---|---|
| 1. More accurate | | | |
| 2. More complete | | | |
| 3. More actionable recommendations | | | |
| 4. Less editing needed | | | |
| 5. Would send to a partner | | | |

Confidence on question 5: high ..., medium ..., low ...

### 9.6 Stability check

| Val id | Runs | Deterministic findings identical | Component RAG agreements (of 15) | Theme overlap | Conclusions |
|---|---|---|---|---|---|
| VAL-0n | 3 | yes / no | /15 | | same / materially same / different |

### 9.7 Gate summary

| Gate | Threshold | Result | Pass |
|---|---|---|---|
| A Fabrication | zero | | |
| B Arithmetic | recall ≥90%, zero incorrect | | |
| C Factual accuracy | mean ≥3.0, none <2 | | |
| D RAG agreement | ≥70% exact or adjacent | | |
| E Coverage | mean ≥2.5, none <2 | | |
| F Recommendations and style | V4 ≥2.5, V5 ≥3.0 | | |
| G Blinded preference | AI preferred or tied in ≥half | | |
| H Time saved | ≤half of from-scratch | | |
| **Decision** | | | |

## 10. Reporting and records

Everything is kept together, per validation assessment: the source documents, the export JSON and
its hash, the fidelity log, both raw AI outputs, the deterministic script output, the completed
scoring sheets, the blinded packets, the randomisation file, and the change log between iterations.

The written result records the decision, the gate table, the free-text from the blinded reviewers,
and, in plain terms, what the method was found to be bad at. A validation that reports only what
went well is not a validation.

## 11. Re-validation

A shortened version of this protocol (Parts A and B on the two holdout assessments, no blinded
study) is re-run when any of the following happens:

- a minor or major version change to the skill bundle;
- a change of model;
- a change to the export contract;
- a change to the Module 1 question set.

A full re-validation, including Part C, is run on a major version change or on a change of model
family.
