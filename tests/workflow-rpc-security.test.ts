import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0022_harden_workflow_rpc_scope.sql"),
  "utf8"
);

function functionBody(name: string): string {
  const start = migration.indexOf(`create or replace function public.${name}`);
  expect(start, `${name} should be defined by migration 0022`).toBeGreaterThanOrEqual(0);

  const next = migration.indexOf("create or replace function public.", start + 1);
  return migration.slice(start, next === -1 ? migration.length : next);
}

describe("workflow RPC security migration", () => {
  it.each([
    "reopen_attendance",
    "submit_finance",
    "verify_finance",
    "return_finance",
    "reopen_finance",
  ])("binds %s to the caller church", (name) => {
    expect(functionBody(name)).toContain(
      "v_prog.church_id is distinct from public.current_church_id()"
    );
  });

  it.each([
    "submit_finance",
    "verify_finance",
    "return_finance",
    "reopen_finance",
  ])("checks target-branch finance permission in %s", (name) => {
    expect(functionBody(name)).toContain(
      "public.has_finance_permission(v_prog.branch_id)"
    );
  });

  it("requires a branch-scoped treasurer or administrator to submit finance", () => {
    const body = functionBody("submit_finance");
    expect(body).toContain(
      "public.has_role('treasurer'::public.app_role, v_prog.branch_id)"
    );
    expect(body).toContain("public.is_administrator()");
  });

  it.each(["verify_finance", "return_finance"])(
    "requires a branch-scoped finance verifier in %s",
    (name) => {
      const body = functionBody(name);
      expect(body).toContain(
        "public.has_role('finance_verifier'::public.app_role, v_prog.branch_id)"
      );
      expect(body).not.toContain("and not public.is_administrator()");
    }
  );

  it("preserves the configured independent finance verification rule", () => {
    const body = functionBody("verify_finance");
    expect(body).toContain("v_church.finance_requires_independent_verification");
    expect(body).toContain("v_last_submitter = auth.uid()");
  });

  it("keeps workflow RPC execution unavailable to public and anon", () => {
    expect(migration).toContain(
      "revoke all on function public.submit_finance(uuid) from public, anon;"
    );
    expect(migration).toContain(
      "grant execute on function public.submit_finance(uuid) to authenticated;"
    );
    expect(migration).toContain(
      "revoke all on function public.reopen_attendance(uuid, text) from public, anon;"
    );
  });
});
