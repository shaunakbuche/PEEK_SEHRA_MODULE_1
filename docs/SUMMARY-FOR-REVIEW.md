# SEHRA Module 1 AI analysis: summary for review

**For:** Mert, Priya **From:** Shaunak **Date:** 16 August 2026

Peek asks partners to complete the SEHRA Scoping Module, then returns a completeness review and a
feasibility report. Both are written by hand by Haroon, and his time is what limits how many
partners we can support. This work produces a first draft of each, so expert time goes on judgement
rather than transcription and arithmetic. Every report still goes out under a named Peek reviewer.

## What changed after the meeting with Mert

- **No external API key.** Analysis moves into a Claude skill run inside Peek's own Claude
  Enterprise account, rather than the website calling a third-party API. Partner data stays inside
  Peek's account. The old key-based path still exists so nothing breaks, and will be removed once
  validation passes.
- **The analysis is split.** All counting, arithmetic and reconciliation is done by Python scripts.
  The model does interpretation, themes, narrative and the RAG judgement. **Numbers are never judged
  by the model**, and it is instructed not to do arithmetic in its head at all.
- **Two stages, kept apart.** First a completeness and consistency review so the partner can fix the
  module. Only then the synthesis and RAG report. They answer different questions and need different
  views of the data, so blending them weakens both.
- **Every run is traceable.** The exact input is exported as JSON and hashed, and the run records
  the skill version, the model, who ran it, what the scripts found, the model's untouched output,
  and every human edit before publication.
- **Validation is planned properly**, against past assessments, with thresholds agreed before we see
  any results.

## What is built

| | |
|---|---|
| Website: assessment, submission, Peek review, editing, approval, PDF and Word publishing | live |
| Both sets of analysis instructions, written from Haroon's originals, with fixed output formats | done |
| Export of an assessment as JSON, including every blank field | in progress |
| The skill bundle (`skill/sehra-analysis/`) and its Python check scripts | in progress |
| Pasting the skill's report JSON back into the website to publish | in progress |
| Storing the full run record against each report | not started |
| Validation against past reports | waiting on Priya's files |

## How to try it

1. Open an assessment in the Peek admin view and download the export JSON.
2. In Claude Enterprise, start a new conversation with the SEHRA analysis skill and upload the file.
3. Ask for the completeness review. It runs the scripts first, then writes the review.
4. In a new conversation, upload the same file and ask for the synthesis and RAG report. It returns
   a JSON block plus a readable RAG dashboard.
5. Paste the JSON into **Import report JSON** in the admin view, edit anything you disagree with,
   then approve to publish as PDF and Word.

The most useful thing to do while trying it is to look for anything it states that you cannot find
in the assessment itself. That is the failure that matters most, and the one we most want reported.

## Still open

- **Where the run record lives.** Today the website does not keep the AI's original draft (the first
  human edit overwrites it), does not store the export hash or skill version, and does not save the
  completeness review at all. All three need fixing before live use. Detail in `METHODOLOGY.md`
  section 5.2.
- **Who reviews what.** Haroon reviews everything today. If that stays true, the time saving is
  capped by his availability. Worth deciding whether a Peek analyst can review with his sign-off.
- **How the skill is distributed** inside Claude Enterprise, and who is allowed to run it.
- **Retiring the old API path** and removing the key, once validation passes.

## What we need

**From Priya:** the six or seven past assessments, as submitted, plus the final report Peek sent for
each, plus any hand-written completeness review. Confirmation that they can be used for internal
validation. Older and messier ones are more useful than clean recent ones.

**From Mert:** a read of `METHODOLOGY.md`, particularly section 4 (the deterministic and model
split) and section 5 (what gets recorded), and a view on whether the observability gaps are the
right ones to fix first. Also guidance on how the skill should be deployed and access-controlled in
Enterprise.

**From Haroon:** roughly a day of scoring across the validation set, and a shorter blinded session
later. He wrote the original reports, so he cannot be truly blind to his own writing. We would like
one more reviewer with eye-health experience who did not write them.

## The two documents

- `docs/METHODOLOGY.md` : what the AI does and does not do, the two stages, the deterministic and
  model split, observability, reproducibility, human review, limitations, data handling.
- `docs/VALIDATION-PROTOCOL.md` : how the past reports are prepared and run, the scoring rubric,
  the blinded study design, the pass and fail thresholds agreed in advance, and the results tables.
