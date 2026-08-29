import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0025_transactional_church_onboarding.sql"
  ),
  "utf8"
);

describe("transactional church onboarding", () => {
  it("creates one server-only onboarding RPC", () => {
    expect(migration).toContain(
      "create or replace function public.complete_church_onboarding"
    );
    expect(migration).toContain(
      "grant execute on function public.complete_church_onboarding"
    );
    expect(migration).toContain("to service_role");
    expect(migration).toContain("from public, anon, authenticated");
  });

  it("locks the owner row to serialize duplicate submissions", () => {
    expect(migration).toContain("from public.app_users");
    expect(migration).toContain("for update");
    expect(migration).toContain("already attached to a church");
  });

  it("keeps public church provisioning inside the same database transaction", () => {
    expect(migration).toContain("v_church_id := public.provision_new_church");
    expect(migration).toContain("update public.app_users");
    expect(migration).toContain("insert into public.user_roles");
  });

  it("creates both Administrator and Super Admin roles", () => {
    expect(migration).toContain("'administrator'::public.app_role");
    expect(migration).toContain("'super_admin'::public.app_role");
    expect(migration).toContain("true,");
    expect(migration).toContain("true");
  });
});
