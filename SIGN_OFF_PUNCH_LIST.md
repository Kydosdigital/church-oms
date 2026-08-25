# Church OMS — Path to Client Sign-Off

Status check (25 Aug): the `church-oms` Vercel project is already linked to the GitHub repo and auto-deploying on every push to `main`. The latest deployment is live and healthy — no runtime errors in the last 24 hours, and the public landing page renders correctly at `church-oms.vercel.app`. Supabase (schema, RLS, workflow RPCs) is fully applied and verified. That's the good news: there is a real, working foundation. What follows is what still stands between this and a client sign-off.

This list has two parts: the operations app itself, and the marketing website (which doesn't exist yet).

## Part 1 — Church Operations App

### Must fix before go-live

1. **Provision the real client's church.** Nobody has actually created this client's church record yet. `provision_new_church(...)` exists as a database helper (seeds a default branch, service types, and offering categories) but nothing in the UI calls it, and there's no first administrator account. Either run this once by hand for the client, or build a minimal "set up my church" screen that a brand-new sign-up hits before anything else.
2. **Password reset.** There's a sign-in and sign-up page but no "forgot password" flow. Any real user who forgets their password is stuck.
3. **Duplicate-service warning.** The PRD asks the app to warn an usher when a service record looks like a likely duplicate and let them override with a reason (SRV-08). The database has a backstop unique constraint, but the friendly client-side warning was never actually built — right now a true duplicate just hits a raw database error instead of a clear message.
4. **Church settings screen.** Currency, timezone, reporting-year start month, and the "finance requires independent verification" toggle all live in the `churches` table but have no admin UI — they're frozen at whatever the seed defaults set.
5. **Real branding assets.** The favicon, app icon, and social preview image are still the default Next.js placeholders. Needs whatever comes from 21st.dev (or a placeholder appropriate to this client) before it's shown to them.
6. **Confirm Vercel environment variables.** I don't have a tool that can read or set Vercel project environment variables, so this needs a manual check: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and (if invites are needed) `SUPABASE_SERVICE_ROLE_KEY` should all be set in Project Settings → Environment Variables. The homepage rendering correctly doesn't prove these are set, since it's a static page that doesn't call Supabase.

### Should have before sign-off

7. **Audit log viewer.** Every create/edit/verify/reopen is already recorded in `audit_events` with admin-only read access — there's just no screen to look at it yet. Right now it's data with no interface.
8. **Excel/PDF export.** The PRD asks for Excel and PDF exports; today there's only CSV and a browser print-to-PDF page. Acceptable as an MVP substitute, but worth a decision on whether it's good enough for sign-off.
9. **Custom domain.** Right now the app only lives on `*.vercel.app` subdomains — a client-facing sign-off usually wants the real domain wired up first.
10. **Basic error monitoring.** Nothing like Sentry is wired in; today the only way to notice a production problem is to check Vercel's logs by hand.
11. **A short guide per role** (usher, treasurer/accountant, attendance verifier, finance verifier, pastor, administrator) — nothing written yet, useful both for client training and for the sign-off conversation itself.
12. **Privacy policy / terms.** Worth having if the client's church will be storing people's names against attendance and giving records.
13. **Basic automated tests.** None exist yet. At minimum the permission/RLS logic and the submit → verify → lock → reopen workflow deserve real test coverage before being trusted with a paying client's data.
14. **An actual accessibility pass.** The UI was built with accessible patterns (sr-only data tables, non-color-only status badges, 44px touch targets) by design, but nothing has run a real audit against it yet.

### Can follow launch

15. Email notifications (PRD section 3.2, marked "should-have" not "must-have").
16. A fuller gender-by-age attendance breakdown, if the client actually wants it (raised in passing during requirements discussion, not in the PRD this was built from).
17. A "service number" field for branches that run more than one of the same service type on a given day.
18. A manual light/dark toggle (currently follows the OS preference only).
19. Splitting a handful of admin "for all" RLS policies that Supabase's performance advisor flags as `multiple_permissive_policies` — cosmetic, not a security issue.

## Part 2 — Marketing website (not started)

You confirmed this is meant to be an informational site — where someone can learn what Church OMS does before clicking through to sign up/log in to the actual app. Nothing exists for this yet; it's a separate build. What it needs:

- **Home/hero** — what the product is, who it's for, one clear call to action into the app.
- **Feature sections** — attendance capture, two-person verification, configurable offerings and giving, project fundraising progress, dashboards, roles and permissions, security (RLS-backed access control is a genuine selling point worth stating plainly).
- **Screenshots or a short demo** of the real app, once its branding is finalized.
- **A pricing or "request access" section** — this depends on a decision I don't have yet: is this being sold to other churches beyond this one client, or built and marketed for this client specifically? That changes whether the site needs pricing tiers, a contact-sales form, or just a single "Get started" button straight to sign-up.
- **About / contact.**
- **CTA button(s)** linking to the app's real sign-up/login URL.
- **SEO basics** — title/meta tags, an Open Graph image, a sitemap.
- **Hosting decision** — likely its own small Next.js project in the same Vercel team, either a separate repo or a route group alongside the app; either way it needs its own domain or subdomain decided before build.

The pricing/access-model question above is the one thing I'd want an answer to before starting the marketing site build, since it changes the page structure rather than just the copy.
