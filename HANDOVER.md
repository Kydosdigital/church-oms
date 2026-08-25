# Church OMS — Handover to Claude Code

Written 25 Aug 2026, handing this project from a Cowork session to Claude
Code (the CLI, running on your own machine, presumably with the repo cloned
locally). Everything below is the current, accurate state of the project —
not aspirational.

## 1. What this is

Church OMS (Church Operations Management System) is a Next.js 16 +
Supabase web app for one church client. It records every service's
attendance, outcomes (first-timers, converts, new births, weddings), and
offerings/giving, with a mandatory two-person submit → verify → lock
workflow before any record is treated as final. It has role-based
dashboards, exports, and full admin CRUD.

Read these two files first — they're the real product/architecture
reference, not this handover:

- `docs/PRODUCT.md` — what the product is, who it's for, the core workflow,
  the explicit finance-visibility permission model.
- `docs/ARCHITECTURE.md` — stack, routing/session handling, the
  RLS-as-authorization-boundary pattern, and the full migration history.

## 2. Where everything lives

| What | Where |
|---|---|
| Code repo | `github.com/Kydosdigital/church-oms`, branch `main` |
| Hosting | Vercel — project `church-oms` (team `kydosdigitals-projects`), live at `https://church-oms.vercel.app` |
| Database | Supabase project `church-oms`, ref `comxrhbasewjxraejjyl`, region `eu-west-3` |
| Local clone (this session) | `/home/claude/church-oms` — this was a cloud sandbox; on your machine it'll be wherever you clone it |

Latest commit on `main` as of this handover: `6d92ae8` ("Wire up Church OMS
brand assets from public/brand/"). Working tree was clean, nothing
uncommitted, at handover time.

## 3. Current status: MVP is built, deployed, and login works

Everything below has been built, tested, committed, and pushed. The app is
live on Vercel and reachable.

### Built features
- Auth (email/password), church onboarding (`/onboarding` provisions a new
  church + first administrator), password reset flow.
- Attendance capture: phone-first wizard (service details → attendance
  counts → outcomes → notes → review/sign), with capacity-exceeded and
  outcome-exceeds-total warnings requiring an explanatory note.
- SRV-08 duplicate-service detection (warns + requires an override reason,
  doesn't hard-block).
- Revenue entry with configurable offering categories and
  physical/online giving totals; fundraising project progress tracking.
- Dashboards: attendance/revenue trends, pending approvals, project
  progress, giving-channel breakdown, configurable date range.
- Full admin CRUD: branches, venues, service types, offering categories,
  user roles (incl. inviting a new user by email), church-wide settings.
- Audit log viewer, CSV + Excel export, print-ready programme report,
  per-role help guides, privacy/terms pages.
- Optional Sentry error monitoring (inert unless a DSN is configured).
- Real brand assets wired in (logo in nav/auth/landing pages, favicon/app
  icon) — see section 6.

### Test/build state (last verified at handover)
All green: `npx next typegen`, `npx tsc --noEmit` (0 errors), `npx eslint .`
(0 errors, 3 pre-existing warnings — see section 7), `npx vitest run`
(35/35 tests passing, 3 files), `npm run build` (all 26 routes build).

## 4. Claude Code governance layer (already set up)

This repo already has a `.claude/` governance layer — Claude Code should
pick it up automatically on `cd` into the repo:

- `CLAUDE.md` — entry point; imports `@AGENTS.md` (do not remove that
  import — it's auto-written by `next dev`, see AGENTS.md's own note) plus
  project-specific guidance pointing at `docs/`, `.claude/rules/`,
  `.claude/agents/`, `.claude/skills/`.
- `.mcp.json` — declares the Supabase MCP server for this project
  (`--project-ref=comxrhbasewjxraejjyl`).
- `.claude/rules/{frontend,database,security}.md` — domain conventions
  (RLS-as-boundary, the submit→verify→lock RPC pattern, finance-visibility
  flags, design tokens, accessibility, secrets handling).
- `.claude/agents/{code-reviewer,security-reviewer}.md` — subagents to
  dispatch before committing schema/permission-touching changes.
- `.claude/hooks/{protect-env,verify-before-commit}.sh` — a `PreToolUse`
  hook blocking commands that read `.env*`/print the service-role key, and
  a reminder hook nudging toward the verification suite before `git
  commit`. Both are executable (`chmod +x` already applied).
- `.claude/skills/{build-feature,review-feature}/SKILL.md` — the process
  for adding a feature end-to-end, and the pre-commit review checklist.
- `.claude/settings.json` is checked in (shared); `.claude/settings.local.json`
  is gitignored (personal/per-machine) — you'll get your own copy locally.

Tests live under a top-level `tests/` directory (not colocated with
source), importing via the `@/` alias — see `vitest.config.mts`. Run with
`npm test` or `npx vitest run`.

## 5. Environment variables

`.env.example` documents everything. Two are required for the app to run
at all; the rest are optional feature flags.

Required (already set in Vercel; you'll need your own `.env.local` for
local dev):
- `NEXT_PUBLIC_SUPABASE_URL` = `https://comxrhbasewjxraejjyl.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anon/public key (safe to expose to
  the browser; get it from Supabase → Project Settings → API, or via the
  Supabase MCP's `get_publishable_keys`).

Optional (already set in Vercel where relevant):
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, bypasses RLS entirely. Only
  needed for "invite a user by email" in admin. **Never** expose to the
  browser, never `NEXT_PUBLIC_`-prefixed, never commit it, never print it
  in a terminal that gets pasted anywhere. See section 8 — this key was
  accidentally pasted into a chat earlier and should be rotated.
- `NEXT_PUBLIC_APP_NAME` — display name in header/title; defaults to
  "Church Operations" if unset. Already set in Vercel.
- `NEXT_PUBLIC_SITE_URL` — fallback base URL for password-reset emails if
  the request origin isn't available. Not currently set; usually not
  needed since Vercel supplies the origin automatically.
- `NEXT_PUBLIC_SENTRY_DSN` (+ `SENTRY_AUTH_TOKEN`/`SENTRY_ORG`/`SENTRY_PROJECT`)
  — optional error monitoring, inert if unset.

## 6. Branding

A full brand pack was delivered separately (via ChatGPT) directly into
`public/brand/` on `main` (commit `cecea04`) — 15 PNGs (full logo,
transparent/dark/light/monochrome variants, icon-only marks, app icons,
favicon) plus `public/brand/README.md` explaining which asset to use where.

This has since been wired into the actual UI (commit `6d92ae8`):
- Sidebar nav logo (`src/components/layout/app-shell.tsx`)
- Auth pages — login/signup/forgot-password/reset-password all share
  `src/app/(auth)/layout.tsx`, which now shows the full logo above the form
- Public landing page (`src/app/page.tsx`)
- Browser tab icon: `src/app/icon.png` (favicon) and
  `src/app/apple-icon.png` (app icon) replace the old default Next.js
  favicon, using Next's file-convention metadata icons

`src/app/globals.css`'s "BRANDING LAYER" section (colors/fonts, supplied by
21st.dev earlier) already used a blue palette that matches the new logo —
no color changes were needed.

## 7. Known non-issues (don't waste time re-investigating these)

- `npx eslint .` reports exactly 3 warnings (0 errors) about React
  Compiler skipping memoization on `react-hook-form`'s `watch()` in
  `category-form.tsx`, `programme-entry-wizard.tsx`, and
  `user-role-form.tsx`. These are pre-existing, informational, and not
  bugs — `react-hook-form`'s API is simply incompatible with the compiler's
  memoization, which is expected and documented behavior.
- Dark mode follows the OS preference only (`prefers-color-scheme`); there
  is no manual toggle. This is intentional per `docs/PRODUCT.md`'s
  "deliberately out of scope" list, not an oversight.

## 8. Security note — rotate the service-role key

Earlier in this project's history, the Supabase **service_role** JWT for
this project was pasted into a chat conversation by mistake. It was not
stored or used beyond the single git-push it was needed for at the time,
but because it appeared in plaintext in a conversation, **it should be
treated as compromised**. If this hasn't been done yet:

1. Supabase dashboard → Project Settings → API → regenerate the
   `service_role` key.
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel's environment variables to
   the new value.
3. Redeploy.

## 9. Outstanding / not yet done

These are the real open items — nothing here is secretly finished:

- **Supabase Auth redirect URL** — Supabase's Auth "Site URL" is still
  defaulted to `http://localhost:3000`, so confirmation/reset emails
  currently link to localhost instead of the deployed app. This needs to
  be fixed in the Supabase dashboard (Authentication → URL Configuration):
  set **Site URL** to `https://church-oms.vercel.app` and add
  `https://church-oms.vercel.app/**` to **Redirect URLs** (keep the
  localhost one too if local dev auth flows matter to you). This is a
  dashboard-only setting — there's no migration/CLI path for it. **This
  was flagged to the user but not confirmed as fixed at handover time.**
- **Service-role key rotation** — see section 8; not confirmed done at
  handover time.
- **Marketing website** — now BUILT (the blocking question was answered:
  it is positioned as SaaS sold to many churches). Five pages under
  `src/app/(marketing)/` plus the legal pages. Two things still need real
  values from the business before real traffic arrives:
  - **Pricing is placeholder** — every figure lives in
    `src/lib/marketing/pricing.ts` and was invented to give the page a
    shape. Nobody has set real prices.
  - **Contact details** — `src/lib/marketing/site.ts` publishes the project
    account email; swap it for a dedicated support address. The contact
    form posts to `CONTACT_WEBHOOK_URL` (see `.env.example`); until that is
    set, the form tells visitors to email instead.

  There are deliberately no testimonials, customer logos or usage stats on
  the site — none exist yet, and inventing them would be misleading. Add
  real ones when there are real ones.
- **Email notifications** — PRD section 3.2, marked "should-have," not
  started.
- **Fuller attendance breakdown** (adult/teen/child × male/female instead
  of the current men/women/teenagers/children buckets) — raised in passing
  during requirements discussions, not committed to, not started.
- **"Service number" field** for branches running more than one occurrence
  of the same service type on the same day — not started.
- **A handful of `multiple_permissive_policies` advisor warnings** on a few
  admin "for all" RLS policies — cosmetic/performance, not a security
  issue, not yet split out. Run `mcp__Supabase__get_advisors` (or the
  Supabase dashboard's Advisors tab) to see current state.

## 10. Conventions to keep following

- Migrations are append-only under `supabase/migrations/`, applied in
  strict numeric order (currently through `0011`). Never edit an
  already-applied migration — add a new numbered one instead.
- Regenerate `src/types/database.ts` after any schema change:
  `npx supabase gen types typescript --project-id comxrhbasewjxraejjyl > src/types/database.ts`
- RLS is the real authorization boundary, not the UI — see
  `.claude/rules/database.md` and `docs/ARCHITECTURE.md` for the pattern
  (and migration `0011` for a real gap this caught: column-level grants
  matter as much as row-level policies).
- Every submit/verify pair must check the caller isn't the original
  submitter (already true for attendance/finance; keep it true for any new
  workflow-style feature) and must write to `audit_events`.
- Finance visibility is gated on two independent flags
  (`finance_permission`, `finance_history_permission`) — never inferred
  from role or admin status.
- Full verification before any commit: `npx next typegen`, `npx tsc
  --noEmit`, `npx eslint .`, `npx vitest run`, `npm run build`.
- Never touch Vercel environment variables or overwrite branding assets
  without being asked — both are explicitly the client/user's own
  responsibility, not the agent's.

## 11. Suggested first steps in Claude Code

1. Clone the repo, `npm install`, copy your own `.env.local` from
   `.env.example` (get the anon key from Supabase or ask the user).
2. Confirm the Claude Code governance layer loaded (`CLAUDE.md` should be
   visible in context; `.mcp.json` should offer the Supabase MCP tools).
3. Ask the user whether items in section 9 (redirect URL, key rotation)
   have been handled yet — don't assume.
4. Otherwise, treat `docs/PRODUCT.md` + `docs/ARCHITECTURE.md` +
   `.claude/rules/` as the source of truth for how this app is supposed to
   work, and use the `build-feature`/`review-feature` skills for new work.
