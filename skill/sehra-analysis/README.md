# SEHRA analysis skill: install and use guide

This folder is a **Claude Skill**. It teaches Claude how to analyse a SEHRA Scoping Module
(Module 1) assessment exported from the Peek Vision SEHRA website, and produce the two outputs
Peek needs: an initial completeness review, and a themed synthesis report with a RAG feasibility
dashboard.

You do not need an API key, a developer, or anything installed on your computer. Peek's existing
Claude Enterprise seat is all that is required. This guide is written for a non-engineer.

## What is in this folder

| File | What it is |
| --- | --- |
| `SKILL.md` | The instructions Claude reads. Do not rename it |
| `reference/completeness-review.md` | Detailed instructions for the completeness review |
| `reference/synthesis-and-rag.md` | Detailed instructions for the synthesis and RAG dashboard |
| `reference/output-schema.md` | The exact format of the report JSON that goes back into the website |
| `scripts/` | Small Python programs that do the counting and arithmetic |
| `README.md` | This guide |

The split matters. The **scripts** do every calculation, so the numbers are the same every time
anyone runs the analysis. **Claude** does the reading and the writing. That is what makes the
output checkable rather than something you have to take on trust.

## Part 1: adding the skill in Claude Enterprise (once)

You only do this once. After that, everyone who needs it can use it.

1. Put the whole `sehra-analysis` folder into a single zip file. On a Mac, right-click the
   folder and choose **Compress**. The important thing is that `SKILL.md` sits at the top level
   inside the zip, not buried in extra folders.
2. Sign in to Claude at claude.ai with your Peek account.
3. Open **Settings**, then **Capabilities**, then **Skills**.
4. Choose **Upload skill** and select the zip file.
5. Confirm that a skill named **sehra-analysis** now appears in the list and is switched on.

The exact menu wording changes from time to time. If you cannot find it, search the settings for
"Skills". If your account does not offer the option, ask whoever administers Peek's Claude
Enterprise workspace: skills can be published for the whole organisation, which is the better
option here so that everyone works from the same version.

**Updating the skill later.** Zip the folder again and upload it as a new version of the same
skill. Do not create a second skill with a similar name; two versions in circulation is how two
people end up with different reports from the same assessment.

## Part 2: the end-to-end loop

This is the full journey, from a submitted assessment to a published report.

### Step 1: export the assessment from the website

Sign in to the SEHRA site as an admin, open the organisation's assessment, and use **Export
JSON**. You get a file named something like `sehra-export-<organisation>-<date>.json`. Save it
somewhere you can find it.

This file is the complete assessment: every question, every answer, and, importantly, every
field that was left blank. The blanks are deliberate. The completeness review depends on seeing
what is missing.

### Step 2: start a Claude chat with the skill switched on

Open a new chat in Claude. Make sure the **sehra-analysis** skill is enabled for the
conversation. Use one chat per assessment, so the conversation stays a clean record of what was
analysed.

### Step 3: run the completeness review

Upload the JSON file into the chat and ask for the completeness review. For example:

> Run the SEHRA completeness review on this export.

Claude will run the scripts, then produce a review with: an overall finding, the major items
needing attention, the numerical and consistency checks it reconciled and failed to reconcile,
a status line for each of the five components, minor editorial points, and a bottom line listing
the corrections to make first.

Send that review to the assessment team. Give them time to correct or explain what it found.
**Do not go straight to the synthesis.** The synthesis assumes the data has already been
cleaned, and a synthesis built on unreconciled figures is exactly the kind of output that
damages trust with a partner.

If you want the review stored on the website, ask Claude for it as JSON and paste it into the
completeness review box on the assessment's report tab.

### Step 4: re-export and run the synthesis

Once the team has updated the assessment, **export the JSON again** so you are working from the
corrected version. Start a fresh chat, upload the new export, and ask:

> Run the SEHRA synthesis and RAG dashboard on this export.

You get two things:

1. A **report JSON** object. This is the machine-readable report.
2. A **RAG feasibility dashboard** in the chat: each component's rating with a one-line reason,
   the overall rating, the top ten priority actions, and the legend explaining the five levels.

Read the dashboard first. It is the fastest way to see whether the analysis is sensible before
you go anywhere near the JSON.

### Step 5: put the report back into the website

Copy the report JSON object. In the SEHRA site, open the assessment, go to the **Report** tab,
and paste it into the **Import report JSON** box.

Copy the whole object, from the opening `{` to the closing `}`, and nothing else. If the site
says the content is invalid, the usual cause is that a stray line of Claude's commentary was
copied along with it. Ask Claude to "return only the JSON object, nothing else" and copy again.

### Step 6: review, edit, publish

The report opens in the editor. **A person at Peek reviews and edits every report before it goes
anywhere.** This output is partner-facing and it is not published on Claude's say-so.

Check, at minimum:

- Does every figure in the text match the assessment? Spot-check three or four.
- Do the RAG ratings match what the evidence actually shows?
- Are the action points things Peek would genuinely recommend here?
- Does anything read as generic, as though it could have been written about any country?

Edit freely in the editor. When you are satisfied, publish. The site generates the PDF and Word
document and releases them to the organisation.

## If the output looks wrong

Work down this list.

**Numbers do not match the assessment.** Ask Claude which script produced the figure and to show
the reconciliation. If it cannot, it calculated the number itself, which it should not do. Say
so and ask it to re-run the scripts. Never publish a figure you cannot trace back to a field in
the assessment.

**The report mentions a policy, institution or statistic you do not recognise.** Ask: "Which
question in the export supports that claim?" If there is no answer, it is invented. Remove it,
and tell Shaunak, because it means the grounding rules need tightening.

**A RAG rating looks too generous or too harsh.** Ask Claude to justify it against the balance of
enablers and barriers. If the justification is thin, change the rating yourself in the editor. A
common failure is rating a component well because little was written about it. Sparse evidence is
a reason for caution, not for a good rating.

**The website rejects the pasted JSON.** Almost always extra text copied with the object. Ask for
only the JSON object. If it still fails, ask Claude to check its output against
`reference/output-schema.md`, which lists every required field.

**The report reads as generic.** Ask for it again, with: "Ground each point in a specific answer
from the export and name the section it came from." Generic output usually means the assessment
itself was thin, which is a finding worth reporting in its own right.

**Claude skips the scripts and reasons straight from the JSON.** Tell it to run the scripts in
`scripts/` first and to re-do the analysis on their output. This is the single most important
behaviour to insist on, because it is what makes two runs of the same assessment agree.

**Two runs give different conclusions.** The numbers should not move; the wording will. If the
figures or the RAG ratings differ between runs on the same export, that is worth raising, so
keep both chats.

## Things to keep in mind

- **Nothing publishes itself.** A person at Peek reviews, edits and approves every report.
- **Keep the chat.** It is the record of what was analysed and how. If a partner queries a
  finding later, the conversation is the audit trail.
- **Export fresh.** After the team makes corrections, re-export. Analysing an outdated export is
  the easiest mistake to make in this whole loop.
- **The skill is not a substitute for a reviewer's judgement.** It is a fast, consistent first
  draft that makes the reviewer's job smaller.

## Who to ask

Questions about the SEHRA content and the analysis itself: Haroon, who wrote the original
instructions this skill is built from. Questions about the website, the export, or the skill
package: Shaunak.
