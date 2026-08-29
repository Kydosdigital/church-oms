import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0023_finance_workflow_integrity.sql"),
  "utf8"
);

function functionBody(signatureStart: string): string {
  const start = migration.indexOf(signatureStart);
  expect(start, `${signatureStart} should exist`).toBeGreaterThanOrEqual(0);
  const next = migration.indexOf("create or replace function public.", start + signatureStart.length);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe("finance workflow integrity migration", () => {
  it("adds one programme-level finance state and version", () => {
    expect(migration).toContain("finance_state public.record_state not null default 'draft'");
    expect(migration).toContain("finance_version integer not null default 1");
  });

  it("binds direct revenue access to the target programme branch", () => {
    expect(migration).toContain("public.has_finance_permission(p.branch_id)");
    expect(migration).toContain("public.has_finance_history_permission(p.branch_id)");
    expect(migration).toContain("public.has_role('finance_verifier'::public.app_role, p.branch_id)");
  });

  it("allows reopened finance to be corrected while keeping locked states immutable", () => {
    const policyStart = migration.indexOf("create policy revenue_write");
    const policyEnd = migration.indexOf("-- Serialize finance-data edits", policyStart);
    const policy = migration.slice(policyStart, policyEnd);
    expect(policy).toContain("'reopened'::public.record_state");
    expect(policy).toContain("p.finance_state in");
    expect(policy).toContain("public.has_role('treasurer'::public.app_role, p.branch_id)");
  });

  it("serializes amount edits against workflow transitions", () => {
    expect(migration).toContain("create or replace function public.guard_revenue_entry_edit()");
    expect(migration).toContain("for key share");
    expect(migration).toContain("new.created_by := old.created_by");
  });

  it.each([
    "submit_finance(\n  p_programme_id uuid,\n  p_expected_version integer",
    "verify_finance(\n  p_programme_id uuid,\n  p_expected_version integer",
    "return_finance(\n  p_programme_id uuid,\n  p_expected_version integer",
    "reopen_finance(\n  p_programme_id uuid,\n  p_expected_version integer",
  ])("uses optimistic finance version checks in %s", (signature) => {
    const body = functionBody(`create or replace function public.${signature}`);
    expect(body).toContain("v_prog.finance_version <> p_expected_version");
    expect(body).toContain("CONFLICT: finance record has been modified");
  });

  it("rejects empty finance submission instead of writing a false signoff", () => {
    const body = functionBody(
      "create or replace function public.submit_finance(\n  p_programme_id uuid,\n  p_expected_version integer"
    );
    expect(body).toContain("if v_count = 0 then");
    expect(body).toContain("Add at least one finance entry before submitting");
  });

  it("records the real next version in finance signoffs", () => {
    expect(migration).not.toMatch(/'finance',\s*'(submit|verify|return|reopen)'[^;]*,\s*1\s*[,)]/s);
    expect(migration).toContain("p_programme_id, 'finance', 'submit', auth.uid(), v_next_version");
    expect(migration).toContain("p_programme_id, 'finance', 'verify', auth.uid(), v_next_version");
  });

  it("keeps legacy RPC signatures as guarded compatibility wrappers", () => {
    expect(migration).toContain("create or replace function public.submit_finance(p_programme_id uuid)");
    expect(migration).toContain("public.submit_finance(\n    p_programme_id,");
    expect(migration).toContain("grant execute on function public.submit_finance(uuid) to authenticated");
    expect(migration).toContain("grant execute on function public.submit_finance(uuid, integer) to authenticated");
  });
});
