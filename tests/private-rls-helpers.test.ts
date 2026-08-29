import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0032_private_rls_helpers.sql"),
  "utf8"
);

const revenueData = readFileSync(
  resolve(process.cwd(), "src/lib/data/revenue.ts"),
  "utf8"
);

describe("private RLS helper hardening", () => {
  it("moves every SECURITY DEFINER authorization helper to private", () => {
    for (const signature of [
      "public.current_church_id()",
      "public.has_finance_history_permission(uuid)",
      "public.has_finance_permission(uuid)",
      "public.has_role(public.app_role, uuid)",
      "public.is_administrator()",
      "public.is_platform_admin()",
      "public.is_super_admin()",
      "public.user_branch_ids(public.app_role)",
    ]) {
      expect(migration).toContain(
        `alter function ${signature}`
      );
      expect(migration).toContain("set schema private");
    }
  });

  it("keeps authenticated RLS execution on private helpers only", () => {
    expect(migration).toContain(
      "grant usage on schema private to authenticated, service_role"
    );
    expect(migration).toContain(
      "grant execute on function private.has_role(public.app_role, uuid)\n  to authenticated, service_role"
    );
    expect(migration).toContain(
      "revoke all on function public.has_role(public.app_role, uuid)\n  from authenticated"
    );
  });

  it("uses non-definer public compatibility shells", () => {
    const publicShellSection = migration.slice(
      migration.indexOf("create function public.current_church_id()"),
      migration.indexOf("revoke all on function public.current_church_id()")
    );

    expect(publicShellSection).toContain("security invoker");
    expect(publicShellSection).not.toContain("security definer");
    expect(publicShellSection).toContain("private.current_church_id()");
    expect(publicShellSection).toContain("private.has_role(p_role, p_branch_id)");
  });

  it("retires only the legacy finance overloads from authenticated access", () => {
    for (const signature of [
      "public.submit_finance(uuid)",
      "public.verify_finance(uuid)",
      "public.return_finance(uuid, text)",
      "public.reopen_finance(uuid, text)",
    ]) {
      expect(migration).toContain(
        `revoke all on function ${signature} from authenticated`
      );
    }

    expect(migration).not.toContain(
      "revoke all on function public.submit_finance(uuid, integer) from authenticated"
    );
    expect(migration).not.toContain(
      "revoke all on function public.verify_finance(uuid, integer) from authenticated"
    );
  });

  it("the application calls version-checked finance workflow RPCs", () => {
    expect(revenueData).toContain("p_expected_version: expectedVersion");
    expect(revenueData).toMatch(
      /rpc\("submit_finance",[\s\S]*p_expected_version: expectedVersion/
    );
    expect(revenueData).toMatch(
      /rpc\("verify_finance",[\s\S]*p_expected_version: expectedVersion/
    );
    expect(revenueData).toMatch(
      /rpc\("return_finance",[\s\S]*p_expected_version: expectedVersion/
    );
    expect(revenueData).toMatch(
      /rpc\("reopen_finance",[\s\S]*p_expected_version: expectedVersion/
    );
  });
});
