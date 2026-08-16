# Hosting: moving the platform off a personal account

**Document version:** 0.1 (draft for review)
**Date:** 16 August 2026
**Owner:** Shaunak Buche, Peek Vision
**For review by:** Mert (technical advisor), Priya
**Closes the meeting action:** "explore moving the website hosting from a personal Vercel account to
a Peek-related account"
**Companion documents:** `METHODOLOGY.md`, `VALIDATION-PROTOCOL.md`

This document records what was found when the action was investigated. It states the current
arrangement, one operational failure that has already occurred and will recur, the migration options
with their honest trade-offs, and what each step is blocked on.

---

## 1. Current state

| Item | Value |
|---|---|
| Vercel project | `peek-sehra-module-1` |
| Vercel scope | **`shaunakbuche-5632's projects`**, a personal Hobby account |
| Other scopes on the account | **None.** This is the only scope that exists today |
| Database | Supabase, **Free Plan**, resource name `supabase-copper-island` |
| Database resource id | `store_zdaPHtHzzXX1sEJn` |
| Database connected to | The project, for both **production** and **preview** environments |
| File storage | Vercel Blob store, referenced by `BLOB_READ_WRITE_TOKEN` |
| Serverless functions | Exactly 12, against a Hobby-plan cap of 12 |

Two facts follow directly from that table and set the shape of everything below.

**There is no Peek-owned Vercel team to move into.** The account carries a single personal scope, so
"transfer the project to Peek" is not currently an action anyone can take. **Creating a Vercel Team
under Peek is the prerequisite step**, and it is a Peek decision (billing, owner, who administers
it), not a technical one.

**The function count is at the Hobby ceiling.** Twelve serverless functions exist and Hobby allows
twelve, so no new file can be added under `api/` while the project stays on this plan. This is
already a live constraint on platform work, including the run-record persistence described in
`METHODOLOGY.md` section 5.2. Whether the plan chosen for a Peek team lifts it should be confirmed
against Vercel's current plan limits at the time of the move rather than assumed.

## 2. Operational risk: the free-tier database pauses, and it fails silently

**This has already happened once. It will happen again until the database is moved off the free
tier.** It is documented first, and at length, because the failure gives almost no outward signal.

### 2.1 What happens

Supabase free-tier projects auto-pause after roughly a week without activity. When
`supabase-copper-island` paused, two things broke at the same time:

| Surface | Behaviour when the database is paused |
|---|---|
| Deployments | Every deployment fails with **`Resource provisioning failed`** |
| Live site, front end | Keeps serving normally, **HTTP 200**. Pages render, the login form appears |
| Live site, any authenticated call | **HTTP 500** on every attempt, including every login |

The front end is static and is served from Vercel's edge, so it does not depend on the database and
does not go down with it. An uptime check that fetches the home page, or a person who simply opens
the site and sees it load, will conclude the platform is healthy while every partner-facing function
of it is broken. **The failure is silent from the outside.**

### 2.2 Why this profile fits this tool exactly

A partner-facing assessment tool is used in bursts: a partner completes a module over a few days,
then nothing happens for weeks while Peek reviews and the next partner is onboarded. That is the
inactivity pattern the auto-pause is designed to catch. The quiet periods between partners are
precisely when nobody is looking, and the first person to hit the paused database will be a partner
attempting to log in, or a Peek staff member attempting a deployment before a demonstration.

### 2.3 Recognising it quickly

The evidence pattern, in the order it usually appears:

1. A deployment that previously succeeded fails at the build or provisioning step with
   `Resource provisioning failed`, with no change to the code that would explain it.
2. The production URL returns HTTP 200 and renders correctly.
3. `POST /api/auth` returns HTTP 500 rather than a credential error, for every account.
4. The Supabase dashboard shows the project as paused rather than as errored.

Together those four mean the database, not the application, is the problem. A code change is not the
fix and looking for one wastes the hour.

### 2.4 The check to run

The useful signal is the **status code of a login attempt with well-formed but deliberately wrong
credentials**. `api/auth.ts` validates the body, queries the `users` table, and throws a 401 when no
user matches. Reaching that 401 proves the query ran, which proves the database is awake.

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -X POST https://<production-host>/api/auth \
  -H 'content-type: application/json' \
  -d '{"email":"healthcheck@peekvision.org","password":"deliberately-wrong"}'
```

| Result | Meaning |
|---|---|
| **401** | Database is alive. The query ran and found no matching user. This is the healthy result |
| **500** | Database is unreachable, almost certainly paused. This is the failure |
| **400** | The request body was malformed. Fix the request, the check has not run |
| **200** | Those credentials are real. Use an address that belongs to no account |

Use an address that is not a registered user, so the check never authenticates and never counts as a
real login. Do not put a real password in a command, a script, a log or a monitoring configuration.

Fetching the home page is **not** a health check for this platform. It returns 200 while the
database is down.

### 2.5 What actually fixes it

Resuming the project from the Supabase dashboard clears the immediate outage. It does not stop the
next one. Only moving the database onto a paid tier that does not auto-pause removes the failure
mode, and that decision belongs with the same conversation as the account move, because both are
about the platform sitting on personal free-tier infrastructure while being used with partners.

## 3. Migration options

### 3.1 Option A: transfer the existing project into a Peek Vercel Team

Once a Peek team exists, Vercel can transfer the project into it.

| | |
|---|---|
| **Keeps** | The production URL, the Supabase connection, the Blob store, and every environment variable already set |
| **Effort** | Low. The transfer is a dashboard operation, and the project keeps working through it |
| **Risk** | Low. Nothing has to be re-entered, so nothing can be re-entered wrongly |
| **Blocked on** | A Peek-owned Vercel Team existing, and on whoever will own it accepting the transfer |

This is the least disruptive route and is the recommended one.

### 3.2 Option B: create a fresh project under Peek and reattach the stores

If a transfer is not available or not wanted, the project can be recreated in the Peek team and
pointed at the same resources. This is materially more work and has more ways to go wrong:

- Reattach the same Supabase resource (`supabase-copper-island`, `store_zdaPHtHzzXX1sEJn`) and the
  same Blob store to the new project, for production and preview.
- **Re-enter every secret by hand.** `JWT_SECRET`, the admin bootstrap variables (`ADMIN_EMAIL`,
  `ADMIN_PASSWORD`, and `SETUP_KEY` if it is in use), and `ANTHROPIC_API_KEY` while the hosted path
  still exists. See the warning below.
- **Disable Vercel Authentication.** New projects enable it by default, which puts a Vercel login in
  front of every deployment. A partner without a Vercel account cannot get past it, and the symptom
  is a site that works for the person who built it and for nobody else.
- Move the domain across, which is the point at which the URL changes hands and any external link or
  bookmark is at risk.
- Re-check the function count against the new project's plan before the first deployment.

> **Secrets cannot be read back out of Vercel once stored.** The dashboard will not reveal an
> existing value. Whoever holds each secret has to re-enter it, and if nobody holds `JWT_SECRET`
> outside Vercel then it has to be regenerated, which invalidates every issued session and signs
> every current user out. Establish who holds what **before** starting option B, not during it.

### 3.3 Comparison

| | Option A, transfer | Option B, fresh project |
|---|---|---|
| Production URL | Unchanged | Must be moved |
| Environment variables | Carried over | Re-entered by hand |
| Supabase and Blob | Stay connected | Reattached |
| Vercel Authentication default | Not encountered | Must be turned off explicitly |
| Sessions | Unaffected | At risk if `JWT_SECRET` is regenerated |
| Main failure mode | Waiting for the team to exist | A secret re-entered wrongly, or an access setting missed |

## 4. Recommended sequence

| # | Step | Owner | Blocked on |
|---|---|---|---|
| 1 | Decide that Peek owns a Vercel Team for this platform, and who administers and pays for it | Priya, with Mert | A Peek decision. Nothing technical is blocking it |
| 2 | Create the Vercel Team under Peek | Whoever step 1 names | Step 1 |
| 3 | Transfer `peek-sehra-module-1` into it (option A) | Shaunak initiates, team owner accepts | Step 2 |
| 4 | Move the database off the Supabase free tier, or replace it with a Peek-owned Postgres that does not auto-pause | Team owner, with Shaunak | Step 2, and a budget decision |
| 5 | Confirm after the move: a deployment succeeds, the login check in section 2.4 returns 401, and the report import path still works end to end | Shaunak | Steps 3 and 4 |
| 6 | Add the monitoring in section 5 | Shaunak | Step 3 |
| 7 | Confirm the function-count headroom on the new plan, then close the `api/` freeze noted in section 1 | Shaunak | Step 3 |

Steps 1 and 2 are the whole critical path. Everything else is straightforward once a Peek team
exists, and nothing else can start until it does.

Step 4 is worth stating as its own decision rather than folding it into the move. Transferring the
project to a Peek team while leaving the database on the free tier changes who owns the account but
leaves the outage in place. **The account move and the database tier are separate problems and only
the second one stops the site breaking.**

## 5. Monitoring, so a paused database is noticed before a partner is

The requirement is modest: something must exercise the database on a schedule and tell a human when
it stops responding. Any of the following meets it, in rough order of effort:

- **An external uptime monitor** (Better Stack, Uptime Robot, Checkly or similar) configured to
  `POST /api/auth` with the deliberately wrong credentials from section 2.4, **alerting on anything
  other than 401**. The scheduled request also counts as database activity, which by itself makes the
  inactivity auto-pause much less likely to trigger.
- **A scheduled job in Peek's existing tooling** doing the same check and posting to a Peek channel
  on failure. Preferable if Peek already runs monitoring somewhere, so this platform does not become
  a separate thing to remember.
- **At minimum, a calendar reminder** for a named person to run the check before any partner-facing
  session or demonstration. Weak, but better than the current position, which is that the first
  person to discover the outage is the partner.

Whichever is chosen, the alert must go to a person and not only to a dashboard, and the monitored
endpoint must be one that touches the database. Monitoring the home page reproduces exactly the
blind spot described in section 2.1.

## 6. Status and open questions

| Item | Status |
|---|---|
| Investigation of current hosting | Done, recorded above |
| Peek-owned Vercel Team | **Does not exist.** Prerequisite for every migration option |
| Database off free tier | Not started. Outage will recur until this is done |
| Monitoring | Not started |
| Custody of `JWT_SECRET` and the admin bootstrap variables outside Vercel | **Unconfirmed.** Needs answering before option B could be attempted |
| Whether the chosen team plan lifts the 12-function cap | To be confirmed against Vercel's plan limits at the time of the move |

Two questions for the review meeting:

1. Who owns the Peek Vercel Team, and does Peek want the platform under an existing Peek
   organisation account or a new one created for it?
2. Is there a budget line for the database tier? The free tier is the cause of the outage, and no
   amount of care in how the account move is done will fix it.
