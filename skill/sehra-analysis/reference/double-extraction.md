# Double extraction and reconciliation

The stage 2 synthesis is run **twice, independently and blind**, and the two runs are then
reconciled into one final report. This file is the protocol in full. `SKILL.md` states the rule;
the detail lives here.

It is written to be followed by anyone at Peek, not only by an engineer. The only technical step
is running one command, and the command is given in full below.

## Why this exists

In a review meeting, Mert demonstrated the method he had used on a 75-poster analysis project:
**blind double extraction followed by reconciliation**, borrowed from systematic reviews. Two
independent passes extract from the same source without sight of each other, and a separate
reconciliation step resolves the differences. He asked for the same rigour here, and the reason
is the audience.

A SEHRA synthesis is partner-facing. It carries RAG ratings that a partner and a funder will
read as a judgement about whether a programme can proceed, and it reads with the same confidence
whether the reasoning behind it was solid or merely plausible. A single pass gives no way to tell
those apart. Running the synthesis twice, blind, makes the variation visible: where the two passes
agree, the reading is stable and a reviewer can move on quickly; where they diverge, that is
exactly where a human should look.

Be clear about what this does and does not buy:

- It **does** expose instability in judgement, weighting and emphasis, and it catches material
  that one pass simply missed.
- It **does not** verify anything against the world. Two passes can be confidently wrong in the
  same way. Deterministic checks handle the numbers, and a human at Peek still reviews and
  approves everything.
- It **does not** replace stage 1. A poor-quality export produces two poor syntheses that agree.

## What runs twice, and what does not

| Step | How many times | Notes |
| --- | --- | --- |
| Stage 1, completeness review | Once | Unchanged. It happens before any synthesis. |
| The deterministic scripts | Once | The **same** output feeds both passes. |
| Stage 2, synthesis | **Twice, blind** | Pass A and pass B. |
| Stage 3, comparison | Once | Code, not the model. |
| Stage 4, reconciliation | Once | Produces the final report. |

Both passes must be given **the same export and the same script output**. If pass B were run on a
differently truncated digest, or after a correction to the export, the differences between the
passes would tell you nothing about the reasoning, only that the inputs differed. If the export is
corrected part way through, discard the passes already run and start stage 2 again.

## The four stages

### Stage 1: completeness review

Unchanged, and it runs once. Follow `reference/completeness-review.md`. Do not begin stage 2 until
the submitting team has corrected or explained the gaps it found.

### Stage 2: synthesis, run twice, blind

Run the deterministic scripts once and keep their output:

```bash
python3 scripts/consistency_checks.py path/to/export.json --json
python3 scripts/summarise_export.py   path/to/export.json --skip-blanks --max-chars 60000
```

**Pass A.** In a fresh conversation, run the synthesis normally, following
`reference/synthesis-and-rag.md` and `reference/output-schema.md`. Save the report JSON as
`run-A.json`.

**Pass B.** In a **new, separate conversation**, with no sight of pass A, run the synthesis again
from the same export and the same script output. Save the report JSON as `run-B.json`.

Blindness is the whole point. If pass B can see pass A it will anchor on it, the two runs will
agree because one copied the other, and the exercise is worthless. Worse than worthless, in fact,
because the agreement will be reported as corroboration. The next section sets out how to achieve
blindness in practice.

Saving the files, for a non-engineer: the synthesis returns a single JSON object with no
commentary around it. Copy it out of the chat, paste it into a plain text file, and save it as
`run-A.json` or `run-B.json` in the working folder for that assessment. Keep both files. They are
the evidence behind the reconciliation and should not be overwritten or tidied away once the
report is out. If the comparison script later refuses to read one of them, the usual cause is a
stray markdown fence that came along with the copy, or a copy that was cut short.

### Stage 3: deterministic comparison

```bash
python3 scripts/compare_runs.py run-A.json run-B.json
```

Run it from the folder holding the two files, or give the full path to each. As with the other
scripts, `--json` gives the machine-readable form.

**Code, not the model, computes where the two passes agree and disagree.** Do not ask the model to
eyeball the two files and describe the differences, and do not accept a description of the
differences that did not come from this command. The point of the deterministic step is that the
list of divergences is not itself a judgement.

### Stage 4: reconciliation

The model is given **both runs plus the comparison output** and produces the final report. This is
the only pass that may see both. Its output is the report JSON that goes to the website, and it
must validate against `ReportContentSchema` exactly as any single-pass synthesis would.

## How to be blind in Claude Enterprise

Peek runs this inside its Claude Enterprise seat, so blindness is a matter of discipline rather
than tooling. The rules are short:

1. **One fresh conversation per pass.** Start a new chat for pass B. Not a new message in the
   pass A chat, not a branch or an edited message in it.
2. **Never paste pass A into pass B.** Not the JSON, not the dashboard, not the RAG table, not a
   summary of it, not "last time it came out Amber, does that seem right". Also do not paste the
   comparison output into either pass; that belongs to stage 4 only.
3. **Give pass B the same inputs, and nothing else.** The export or digest, and the script output.
   Same files, same flags.
4. **Do not try to make one conversation forget.** Instructing the model to disregard what it has
   already seen does not work and must never be recorded as a blind pass.
5. **Different people may run the two passes**, and that is a good arrangement where the diaries
   allow it, but it is not required. Two fresh conversations run by the same person are blind.

**If the same chat has to be reused**, the run is not blind. There is no workaround. Your options,
in order of preference: run pass B in a new conversation later, or on another day; ask a colleague
to run pass B in their own conversation; or accept that this run is single-pass and follow the
single-pass fallback below, including its disclosure. Presenting a second pass run in the same
conversation as double extraction is the one failure mode that makes the whole protocol
misleading, because it produces the reassurance without the check.

## The reconciliation rules

These are the rules for stage 4, verbatim as agreed:

- Disagreements are **surfaced, never silently averaged or split**.
- **RAG**: if the two passes differ by one level, reconcile with a stated reason. If they differ by
  two or more levels, that is a red flag: do not pick one, escalate it for human adjudication and
  say so in the data-quality note.
- Content in **only one pass is not automatically wrong**; judge it against the evidence and keep
  it if supported. Content in **neither pass must never be invented**.
- **Theme wording differing between passes is expected and is not itself a disagreement**, because
  themes are derived from evidence. What matters is whether the same underlying evidence is
  captured.
- The final report's `dataQualityNote` must record that double extraction was used and note any
  unresolved divergence.

Two practical points that follow from them.

**Where the reason for a reconciliation is written.** For a one-level RAG difference, the reason
goes in the run record every time. It goes into the report itself only where a reader needs it to
read the rating correctly, which in practice means an unresolved divergence. A partner-facing
`ragSummary` should carry the substantive justification for the level that was chosen, not a
commentary on how the sausage was made. The fact that double extraction was used is recorded once,
in `dataQualityNote`.

**Content in one pass only.** Test it against the export, not against the other pass. A point that
one pass found and the other missed is common and is often the most useful thing the protocol
surfaces. Keep it if a field supports it, drop it if none does, and record the decision either way.
The temptation to keep only what both passes found produces a thinner, blander report than either
pass wrote, which is the opposite of the intent.

## When the two passes are two or more RAG levels apart

The five levels are ordered `Green`, `Amber/Green`, `Amber`, `Red/Amber`, `Red`. The distance is
how many steps apart they sit on that scale.

| Distance | Example | What to do |
| --- | --- | --- |
| 0 | `Amber` and `Amber` | Adopt it. Note it as agreed. |
| 1 | `Amber` and `Red/Amber` | Reconcile, with a stated reason. Record the reason in the run record. |
| 2 or more | `Amber` and `Red` | Red flag. Escalate for human adjudication. |

A two-level gap means the two readings of the same evidence reached materially different
conclusions about whether that part of the programme can proceed. That is a finding in itself, and
usually points at either genuinely contradictory evidence in the assessment or an ambiguity in the
underlying data. It is not something to settle by preference.

The report still has to carry one of the five strings, since the schema requires it and the website
coerces anything unrecognised to `Amber`. So:

- Enter the **more cautious of the two levels** as a holding value. This is not a decision. It is a
  value chosen to fail safe so that the object validates.
- Say plainly in the component's `ragSummary` that the two independent passes diverged by two
  levels and that the rating is provisional pending review at Peek.
- Record it in `dataQualityNote` as an unresolved divergence.
- Record it in the run record, and name who is adjudicating.
- **Do not send the report to a partner until a human at Peek has set that rating.** A holding
  value that reaches a partner unadjudicated is worse than a single-pass report, because it looks
  like a considered judgement.

The same applies to a two-level gap on the overall rating, and there it is more serious still,
because the overall rating is what most readers will take away.

## A worked reconciliation decision

Invented throughout, for illustration only. The site, the findings and the ratings are made up and
carry no prior for any real assessment.

**The case.** Example District, Example Country. Pass A and pass B have both produced a full report
JSON from the same export and the same script output. `compare_runs.py` reports four differences
worth looking at.

**1. Human Resources: `Amber` in pass A, `Red/Amber` in pass B.** One level apart, so reconcile
with a stated reason. Rereading the evidence, both passes cite the same fields: teachers present
across all public schools, refraction capacity limited to two staff at district level, no
supervision route covering school health. The passes did not disagree about the evidence, they
weighted it differently, pass A leading on workforce reach and pass B on the absence of any
supervision system. The reconciliation carries `Red/Amber`, on the ground that teacher availability
is potential rather than capacity until training and supervision exist, and that thin evidence is a
reason for caution rather than for a better rating. The `ragSummary` states that substantive
reason. The run record states that the passes differed by one level and why the more cautious
reading was carried.

**2. A barrier point present only in pass B.** Pass B recorded that no in-service training
curriculum on eye health exists for teachers or nurses; pass A did not mention it. Judged against
the export, the relevant question is answered "No", so the point is supported and is kept. It is
not a strike against pass A, and it is not accepted merely because pass B wrote it down. The run
record notes it as content carried from one pass on the evidence.

**3. Theme wording.** Pass A grouped these points under "Training and supervision", pass B under
"Workforce development". The comparison flags the theme names as different. This is expected and
is not a disagreement: the points beneath them cite the same fields. Choose whichever reads better
across the whole report and move on. It does not go in `dataQualityNote`.

**4. Supply Chain: `Amber` in pass A, `Red` in pass B.** Two levels apart, so this is a red flag.
Looking at the evidence, the assessment records private optical outlets in the district but no
public supply route and no financial protection for children, and the two passes have taken
opposite views of whether private supply counts as a route children can actually use. The
reconciliation does **not** pick one. `Red` is entered as the more cautious holding value, the
`ragSummary` says the two passes diverged by two levels and the rating is provisional, and
`dataQualityNote` records the unresolved divergence. The run record names Priya as the adjudicator.
The report does not go to the partner until that rating is settled.

**The resulting note.** `dataQualityNote` might then read, alongside the substantive data-quality
caveats: "This report was produced by double extraction: the synthesis was run twice independently
and reconciled. The two runs diverged by two rating levels on Supply Chain, and that rating is
provisional pending review at Peek."

## The run record

Every run is traceable. `SKILL.md` already asks you to state the provenance header in the chat
before the analysis. The run record is that header plus what double extraction adds, kept as a
short note in the working folder alongside `run-A.json` and `run-B.json`.

It must contain:

- The provenance already required: organisation, country, region and district; the export's
  `version` and `exportedAt`; the assessment `id` and `status`; which scripts were run and whether
  any reported an error.
- **Whether this run was double extraction or single pass.** Stated explicitly, either way.
- For each pass: the date, who ran it, and confirmation that it was a fresh conversation with no
  sight of the other pass.
- The two filenames, and where the files are kept.
- The comparison output from `compare_runs.py`, saved rather than summarised.
- Every divergence and how it was settled: agreed, reconciled with the reason, carried from one
  pass on the evidence, or escalated.
- Anything still unadjudicated when the report was handed over, and who owns it.

Do not put the run record inside the report JSON. Unknown keys are silently dropped by the import
box, and provenance belongs in the conversation and the working folder, not in the published
document. The only thing that crosses into the report is the sentence in `dataQualityNote`.

## Single-pass fallback

Running the synthesis once is permitted when time does not allow two passes. It is a deliberate
decision for whoever is leading the piece of work, not a default and not something to slide into
because the second conversation felt repetitive.

When it happens, it **must** be disclosed in all three places:

1. **In the report**, in `dataQualityNote`. For example: "This report was produced from a single
   synthesis pass. The double extraction protocol was not applied on this occasion, so the second
   independent reading that normally supports these ratings is absent." Keep it to a sentence, and
   keep it alongside the substantive caveats rather than in place of them.
2. **In the run record**, as above.
3. **In the chat handover**, so the reviewer knows before they start reading rather than after.

Treat as single-pass, and disclose as single-pass, any run where blindness was not achieved: a
second pass in the same conversation, a pass that saw the other's output, or a pass run on
different inputs. A run that is not blind is a single pass with extra steps.

**Never present single-pass work as double-extracted.** This is a hard rule in `SKILL.md` for a
reason. The value of the protocol to a reader is entirely in their being able to trust the label.

## Checklist before the final report leaves stage 4

- [ ] Stage 1 was completed and its findings addressed before stage 2 began.
- [ ] The scripts were run once and the same output was given to both passes.
- [ ] Pass A and pass B were run in separate, fresh conversations, with no sight of each other.
- [ ] `run-A.json` and `run-B.json` are both saved and kept.
- [ ] `compare_runs.py` was run on the two files, and its output, not the model's impression, is
      what the reconciliation worked from.
- [ ] Every divergence is surfaced somewhere: settled with a reason in the run record, or escalated.
- [ ] No RAG level was averaged or split.
- [ ] Any two-level divergence is escalated, named in `ragSummary` and `dataQualityNote`, and the
      report is held until a human sets the rating.
- [ ] Nothing appears in the final report that appears in neither pass and in no field of the
      export.
- [ ] `dataQualityNote` records that double extraction was used, or that this was a single pass.
- [ ] The final JSON still validates against `ReportContentSchema` and passes the checklist in
      `reference/output-schema.md`.
