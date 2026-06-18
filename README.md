# SEHRA Scoping Module — The Minto Method

An interactive web app that **replaces the printed SEHRA Scoping Module PDF** for Peek Vision. Users complete the School Eye Health Rapid Assessment online and, on submit, the full report is **emailed straight to the Peek SEHRA team** — automating the manual "fill PDF → send → analyse → return a form" loop.

Built with **React + TypeScript + Vite + Tailwind CSS**, using the **shadcn** project structure (`src/components/ui`).

## Features

- **Full content of the module** — Context plus all five components (Legislation & Policy, Service Delivery, Human Resources, Supply Chain, Barriers): every question, table, checklist, line of enquiry and reflection.
- **Fully interactive & autosaving** — every answer saves to the browser (`localStorage`) instantly; nothing is lost on refresh.
- **Indicator scale** with an animated pointer, per component, exactly as the printed module describes.
- **Self-generating Summary** — the 3 challenges / 3 supports you type at the end of each component flow into the summary tables and an indicator scorecard, with a live completion ring.
- **One-click submission** — compiles a complete report and emails it to the Peek team, with mailto and downloadable `.html` / `.json` fallbacks.
- **Showcase landing page** built from interactive components: a Spline 3D hero with spotlight + sparkles, a tubelight navbar, an animated hero on an aurora background, an interactive radial-orbital timeline of the module, a feature grid, and an animated background-paths call to action.

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
