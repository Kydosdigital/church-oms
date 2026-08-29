import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0021_harden_inactive_users_and_administrator_scope.sql"),
  "utf8"
);

const userAccess = readFileSync(
  resolve(process.cwd(), "src/lib/data/user-access.ts"),
  "utf8"
);

describe("access-control hardening migration", () => {
  it("removes church membership authority from inactive users", () => {
    expect(migration).toContain("and u.active = true;");
    expect(migration).toContain("create or replace function public.current_church_id()");
  });

  it("requires an active user for role and finance helpers", () => {
    const activeChecks = migration.match(/u\.active = true/g) ?? [];
    expect(activeChecks.length).toBeGreaterThanOrEqual(3);
  });

  it("enforces Administrator as church-wide at the database layer", () => {
    expect(migration).toContain("user_roles_administrator_churchwide");
    expect(migration).toContain("role <> 'administrator'::public.app_role");
    expect(migration).toContain("or branch_id is null");
  });

  it("normalizes Administrator assignments in the server action too", () => {
    expect(userAccess).toContain(
      'const branchId = input.role === "administrator" ? null : input.branch_id ?? null;'
    );
  });

  it("preserves restricted helper execution", () => {
    expect(migration).toContain(
      "revoke all on function public.current_church_id() from public;"
    );
    expect(migration).toContain(
      "grant execute on function public.current_church_id() to authenticated;"
    );
  });
});
