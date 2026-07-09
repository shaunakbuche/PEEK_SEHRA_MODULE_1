# SEHRA Scoping Platform

The School Eye Health Rapid Assessment (SEHRA) Scoping Module (Module 1, the Minto Method) as a
multi-tenant web platform for Peek Vision.

Every organization gets its own private login. They complete the assessment online, submit it to
Peek, and Peek reviews an AI-drafted report, edits it, approves it, and publishes it back to the
organization as a polished PDF and Word document.

Built with React 18 + TypeScript + Vite + Tailwind on the front, Vercel Serverless Functions +
Vercel Postgres + Vercel Blob on the back. Everything runs inside a single Vercel project with no
other services.

## How the flow works

1. **Peek admin** signs in at `/admin`, creates an organization and its school login, and shares it.
2. **The organization** signs in at `/login`, lands in `/app`, and works through Context plus the
   five components. Every answer autosaves to the server. When done, they submit.
3. **Peek** opens the submission, clicks **Generate report with AI** (Claude drafts a structured
   report from the answers, organised around the nine SEHRA analysis themes), edits any field with
   a live preview, then **Approve & publish**.
4. Publishing renders the report as PDF and DOCX, stores them in Vercel Blob, and unlocks the
   report in the organization's workspace with download buttons. Peek can also **Return to school**
   with a note to request changes.

## One-time setup (all inside the Vercel dashboard)

1. **Create the stores.** In your Vercel project: Storage → Create Database → **Postgres**
   (sets `POSTGRES_URL` automatically) and Storage → **Blob** (sets `BLOB_READ_WRITE_TOKEN`).
2. **Set environment variables** (Settings → Environment Variables): `JWT_SECRET` (any long random
   string), `ANTHROPIC_API_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optionally `SETUP_KEY`.
   See `.env.example` for the full list.
3. **Deploy**, then visit `https://<your-deployment>/api/setup` once. This applies the database
   schema and creates the first Peek admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. It is idempotent
   and refuses to create a second admin.
4. Sign in at `/login` with the admin credentials and create your first organization.

## Development

```bash
npm install
vercel dev       # full stack: frontend + /api functions (needs `vercel link` + `vercel env pull`)
npm run dev      # frontend only (API calls will fail without the functions)
npm run build    # typecheck (app + api) and production build
```

## Project structure

```
api/                      # Vercel Serverless Functions
  _lib/                   # db, auth (JWT cookie + bcrypt), report skill, PDF/DOCX renderers
  auth/  assessment/  admin/
  setup.ts                # one-time bootstrap: schema + first admin
db/schema.sql             # reference copy of the schema
src/
  data/sehra.ts           # the entire Module 1 content model, theme-tagged per subsection
  lib/                    # api client, auth context, server-synced answer store, report types
  pages/                  # Landing, Login, School workspace, Admin dashboard
  components/             # Hero, IrisOrb, assessment form, ReportView, brand kit
```

## The AI report

`api/_lib/reportSkill.ts` holds the report-writer system prompt: it encodes the nine SEHRA
analysis themes (health literacy, accessibility and disability, funding, supply chain, human
resources, data limitations, policy and integration, cost and affordability, social and cultural
factors), the WHO eREC / IPEC framing, and a strict JSON output contract. Answers are aggregated
by theme using the tags in `src/data/sehra.ts` and sent to Claude (`claude-sonnet-4-6`) server-side.
The model's draft is never published directly: a Peek admin always reviews, edits and approves it.

---

Built for [Peek Vision](https://www.peekvision.org). Module 1 of the School Eye Health Rapid
Assessment (SEHRA).
