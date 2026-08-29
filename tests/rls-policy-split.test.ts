import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0031_split_mutation_rls_policies.sql"
  ),
  "utf8"
);

const executableSql = migration
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .toLowerCase();

describe("mutation RLS policy split", () => {
  it("removes FOR ALL from the affected mutation policies", () => {
    expect(executableSql).not.toMatch(/for\s+all/);

    for (const legacyPolicy of [
      "app_users_admin_write",
      "app_users_update_self",
      "attendance_write",
      "branches_write",
      "projects_write",
      "ministers_write",
      "categories_write",
      "category_service_types_write",
      "programme_guest_ministers_write",
      "revenue_write",
      "service_types_write",
      "user_roles_admin_write",
      "venues_write",
    ]) {
      expect(executableSql).toContain(`drop policy if exists ${legacyPolicy}`);
    }
  });

  it("keeps one consolidated app-user update policy", () => {
    expect(executableSql).toContain(
      "create policy app_users_update"
    );
    expect(executableSql).toContain(
      "id = (select auth.uid())"
    );
    expect(executableSql).toContain(
      "church_id = public.current_church_id()"
    );
    expect(executableSql).toContain(
      "and public.is_administrator()"
    );
  });

  it("preserves draft finance visibility for current finance editors", () => {
    expect(executableSql).toContain(
      "public.has_finance_history_permission(p.branch_id)"
    );
    expect(executableSql).toContain(
      "revenue_entries.created_by = (select auth.uid())"
    );
    expect(executableSql).toContain(
      "public.has_role(\n            'finance_verifier'::public.app_role"
    );
    expect(executableSql).toContain(
      "public.has_role(\n              'treasurer'::public.app_role"
    );
    expect(executableSql).toContain(
      "or public.is_administrator()"
    );
  });

  it("creates explicit insert, update and delete policies for every split table", () => {
    const prefixes = [
      "attendance",
      "branches",
      "projects",
      "ministers",
      "categories",
      "category_service_types",
      "programme_guest_ministers",
      "revenue",
      "service_types",
      "user_roles_admin",
      "venues",
    ];

    for (const prefix of prefixes) {
      expect(executableSql).toContain(`create policy ${prefix}_insert`);
      expect(executableSql).toContain(`create policy ${prefix}_update`);
      expect(executableSql).toContain(`create policy ${prefix}_delete`);
    }

    expect(executableSql).toContain("create policy app_users_admin_insert");
    expect(executableSql).toContain("create policy app_users_update");
    expect(executableSql).toContain("create policy app_users_admin_delete");
  });
});
