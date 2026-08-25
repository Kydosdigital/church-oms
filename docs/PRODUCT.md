# Church Operations Management System (Church OMS) — Product

## What it is

A responsive web app a church uses to record what happens at every service —
attendance, outcomes (first-timers, converts, new births, weddings), and
offerings/giving — with a built-in two-person check before any record is
treated as final, plus dashboards and exports for leadership.

## Who it's for

One church (currently: this client), with several roles that map to real
responsibilities rather than generic "user"/"admin":

- **Usher** — records attendance and outcomes right after a service.
- **Attendance verifier** — a different person who checks a submitted
  attendance record before it locks.
- **Treasurer** — records offerings by category and by physical/online
  channel.
- **Finance verifier** — a different person who checks a submitted offering
  record before it locks.
- **Pastor** — views dashboards and trends; has no data-entry responsibility.
- **Administrator** — configures branches, venues, service types, offering
  categories, church settings, and everyone's roles/permissions.

A person can hold more than one role, and roles are branch-scoped (or
church-wide, for leadership). Every branch identifier exists from day one,
even for a single-branch church, so adding a second branch later never
requires a data migration.

## Core workflow: submit → verify → lock

This is the product's central idea, applied identically to both attendance
and finance records:

1. An usher (or treasurer) creates a draft and **submits** it — this records
   their identity, a timestamp, and the record version as a digital sign-off.
2. A **different, independently-authorized person** (never the same user)
   **verifies** it, locking it against further edits.
3. A verifier can instead **return** a record with a reason, sending it back
   to draft for correction and resubmission.
4. Even a verified/locked record can be **reopened** by someone with the
   right permission, with a required reason — nothing is ever silently
   unrecoverable, but every state change is recorded.

Separation of duties is enforced at the database level (see
`docs/ARCHITECTURE.md`), not just hidden in the UI — the same person can
never submit and verify their own record.

## Finance visibility is explicit, not implied by role

An administrator does not automatically see financial data, and neither
does a pastor. Finance access is a separate, explicit flag
(`finance_permission`) an administrator grants per person per branch. On top
of that, a second flag (`finance_history_permission`) controls whether
someone with finance access can see *other* services' amounts, dashboards,
trends and exports — or only enter/review their own current, not-yet-locked
entry. This lets a treasurer be trusted to record today's offering without
being able to browse the church's entire giving history.

## What's built

- Attendance capture (phone-first wizard: service details → attendance
  counts → outcomes → notes → review/sign), with capacity-exceeded and
  outcome-exceeds-total warnings that require an explanatory note rather
  than silently accepting the numbers.
- SRV-08 duplicate-service detection — warns (doesn't hard-block) when
  another occurrence already exists for the same branch/service type/date,
  requiring an override reason to proceed.
- Revenue entry with configurable offering categories (general, project,
  special) and physical/online giving totals.
- Fundraising project progress tracking against a configurable target.
- Dashboards: attendance and revenue trends, pending approvals, project
  progress, giving-channel breakdown — all respecting the viewer's actual
  permissions, with a configurable date range.
- Full admin CRUD: branches, venues, service types, offering categories,
  user roles (including inviting a new person by email), and church-wide
  settings (currency, timezone, reporting year start, whether finance
  requires independent verification).
- Church onboarding (a brand-new signup provisions their own church and
  becomes its first administrator), password reset, an audit log viewer,
  CSV/Excel exports, a print-ready programme report, per-role help guides,
  and privacy/terms pages.
- Optional error monitoring (Sentry) — inert unless a DSN is configured.

## Deliberately out of scope for now

- A public marketing/informational website — a separate, not-yet-started
  effort, blocked on one decision: is this being sold to other churches
  (needs pricing/multi-tenant framing) or built for this one client (a
  single "get started" page is enough)?
- Email notifications (PRD section 3.2, marked "should-have", not
  "must-have").
- A fuller gender-by-age attendance breakdown beyond the current
  men/women/teenagers/children buckets, if the client ends up wanting it.
- A "service number" field for branches running more than one of the same
  service type on the same day.
- Manual light/dark toggle (currently follows the OS preference only).
