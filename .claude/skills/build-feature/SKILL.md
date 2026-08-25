---
name: build-feature
description: Process for adding a new feature to Church OMS end-to-end (schema through UI), following the project's submit-verify-lock and permission conventions.
---

# Build a Church OMS feature

1. **Check for an existing pattern first.** Most Church OMS features are a
   variation on: a table with `church_id`/branch scoping, an RLS policy,
   optionally a submit→verify→lock RPC set, a Zod schema in
   `src/lib/validations/`, a server action, and a form/page. Read
   `docs/ARCHITECTURE.md` and the closest existing feature before writing
   anything new.
2. **Schema first, as a new migration.** Add a new numbered file under
   `supabase/migrations/` — never edit an already-applied one. Enable RLS
   and write the policy in the same migration as the table, not a
   follow-up. If the feature needs sign-off (submit/verify), mirror
   `0003_functions.sql`'s shape and write the transition to `audit_events`.
3. **Regenerate types**: `npx supabase gen types typescript --project-id comxrhbasewjxraejjyl > src/types/database.ts` (or the Supabase MCP's `generate_typescript_types`).
4. **Validation schema** in `src/lib/validations/`, used by both the form
   (`react-hook-form` + `zodResolver`) and the server action — one schema,
   not two.
5. **Permission check** — if the feature is finance-adjacent, gate on
   `finance_permission`/`finance_history_permission` explicitly via
   `src/lib/permissions.ts`, never on role or admin status alone. If it's
   branch-scoped, reuse `usherBranchScope` rather than re-deriving branch
   access.
6. **UI** — use existing design tokens (`globals.css`), keep the
   skip-link/landmark/`aria-current` pattern on any new layout, and give
   any numeric-warning UI a required-note escape hatch rather than a
   silent accept or hard block.
7. **Test** — add or extend a file under `tests/`, importing via `@/`.
   Run `npx vitest run`.
8. **Verify** before committing: `npx next typegen`, `npx tsc --noEmit`,
   `npx eslint .`, `npm test`, `npm run build`. Then use the
   `review-feature` skill or the `code-reviewer`/`security-reviewer`
   subagents before pushing.
