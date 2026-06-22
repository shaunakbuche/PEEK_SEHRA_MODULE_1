# SEHRA Scoping Module

An interactive web app that replaces the printed SEHRA Scoping Module PDF for Peek Vision. Users complete the School Eye Health Rapid Assessment online and, on submit, the completed assessment is emailed straight to the Peek SEHRA team. This removes the manual loop of printing a PDF, filling it in, sending it for analysis, and waiting for a form back.

Built with React, TypeScript, Vite and Tailwind CSS, using the shadcn project structure (`src/components/ui`).

## What it does

- **All of the module content.** Context plus the five components (Legislation and policy, Service delivery, People and skills, Supply chain, Barriers): every question, table, checklist, line of enquiry and reflection.
- **Saves as you type.** Every answer is stored in the browser (`localStorage`), so nothing is lost on refresh.
- **An indicator scale** for each area, matching the printed module.
- **A summary that writes itself.** The points you note at the end of each area flow into the summary tables and a readiness scorecard, with a live progress bar.
- **Submit in one step.** The assessment is compiled and emailed to the Peek team, with email-app and downloadable `.html` / `.json` fallbacks.
- **A clean, light interface.** A single continuous page with an animated iris on the hero, a plain overview of what the assessment covers, and the form itself, all in one place.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Project structure

```
src/
  components/ui/        # shadcn-style + showcase components (button, card, badge,
                        # splite, spotlight, sparkles, aurora-background, animated-hero,
                        # tubelight-navbar, background-paths, shader-background,
                        # radial-orbital-timeline, features-8, liquid-glass-button,
                        # hand-writing-text)
  components/assessment # the form renderer (fields, subsections, component view)
  components/           # Landing, SummaryView, EmailModal
  data/sehra.ts         # the entire Scoping Module content model
  lib/store.ts          # localStorage-backed reactive store
  lib/report.ts         # report compilation + email/submit logic
```

## Email delivery (important)

Submission uses [FormSubmit](https://formsubmit.co) so the static site can send email with **no backend**. The first time a report is sent to a given address, FormSubmit emails that address a **one-time activation link** that must be clicked before delivery begins. Default recipients are `priya@peekvision.org` and `sehra@peekvision.org` (configurable in the submit dialog). The dialog also offers **Open in my email app** and **Download report** so submission always works even before activation.

To swap in a different provider (e.g. EmailJS or your own endpoint), edit `src/lib/report.ts`.

---

Built for [Peek Vision](https://www.peekvision.org). Module 1 of the School Eye Health Rapid Assessment (SEHRA).
