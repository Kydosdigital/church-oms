---
name: review-feature
description: Checklist for reviewing a Church OMS change before it's committed or pushed — pairs with the code-reviewer and security-reviewer subagents.
---

# Review a Church OMS change

Run through this before committing, in addition to (not instead of)
dispatching the `code-reviewer` and, for anything touching schema/RLS/auth,
the `security-reviewer` subagent.

1. **RLS and grants** — every new/changed table has RLS enabled and a
   policy that actually scopes by `church_id`/branch; column-level grants
   match intent (see migration 0011 precedent).
2. **Separation of duties** — any submit/verify pair checks the caller
   isn't the original submitter, inside the RPC, not just the UI.
3. **Finance visibility** — gated on `finance_permission` /
   `finance_history_permission` explicitly, never inferred from role.
4. **Audit trail** — state transitions write to `audit_events`.
5. **Types regenerated** — `src/types/database.ts` matches the schema after
   any migration.
6. **Design tokens** — no hardcoded colors/spacing/fonts in touched
   components.
7. **Accessibility** — skip-link, landmark, `aria-current` still present on
   any touched layout.
8. **Tests** — new logic has a corresponding test under `tests/`, and
   `npx vitest run` passes.
9. **Full verification suite green**: `npx next typegen`, `npx tsc --noEmit`,
   `npx eslint .`, `npm test`, `npm run build`.
10. **Secrets** — `git status` reviewed for anything env-shaped before
    staging; no `.env*` file or service-role key in the diff.

Only after all of the above: commit, then push via the project's normal
git remote.
