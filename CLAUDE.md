@AGENTS.md

# Church OMS — working here

Read `docs/PRODUCT.md` (what this app is and who it's for) and
`docs/ARCHITECTURE.md` (stack, auth model, migration history) before making
non-trivial changes — most questions about "why is it built this way" are
answered there.

Domain-specific conventions live under `.claude/rules/`:

- `.claude/rules/frontend.md` — Next.js 16 routing/proxy conventions, design
  tokens, accessibility, form/validation patterns.
- `.claude/rules/database.md` — migration discipline, RLS-as-boundary,
  the submit→verify→lock RPC pattern, finance-visibility flags.
- `.claude/rules/security.md` — secrets handling, separation of duties,
  column-level privilege.

Two subagents are defined under `.claude/agents/` for reviewing changes:
`code-reviewer` (general correctness/consistency pass) and
`security-reviewer` (RLS/RPC/auth-focused, can query Supabase advisors).
Use them before committing anything that touches schema, permissions, or
the submit/verify workflow.

Two skills are defined under `.claude/skills/`: `build-feature` (the
end-to-end process for adding a feature — schema, types, validation,
permissions, UI, tests) and `review-feature` (the pre-commit checklist).

`.mcp.json` declares the Supabase MCP server for this project
(`comxrhbasewjxraejjyl`) so schema/RLS/advisor tools are available directly.

Tests live under the top-level `tests/` directory (not colocated with
source), importing via the `@/` path alias — see `vitest.config.mts`.
