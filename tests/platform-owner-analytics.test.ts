import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0028_platform_owner_analytics_snapshot.sql"
  ),
  "utf8"
);

describe("Platform Owner analytics snapshot", () => {
  it("aggregates platform totals in PostgreSQL", () => {
    expect(migration).toContain(
      "create or replace function public.platform_owner_dashboard_snapshot"
    );
    expect(migration).toContain("'churches'");
    expect(migration).toContain("'users'");
    expect(migration).toContain("'programmes'");
    expect(migration).toContain("'active_churches_30_days'");
  });

  it("returns bounded daily growth analytics", () => {
    expect(migration).toContain("greatest(7, least(coalesce(p_days, 30), 90))");
    expect(migration).toContain("generate_series");
    expect(migration).toContain("'accounts'");
    expect(migration).toContain("'programmes'");
  });

  it("bounds recent church and account result sizes", () => {
    expect(migration).toContain(
      "greatest(1, least(coalesce(p_church_limit, 50), 200))"
    );
    expect(migration).toContain(
      "greatest(1, least(coalesce(p_account_limit, 25), 100))"
    );
  });

  it("returns only the recent dashboard projection instead of all source rows", () => {
    expect(migration).toContain("'recent_accounts'");
    expect(migration).toContain("'super_admins'");
    expect(migration).toContain("'latest_programme_at'");
  });

  it("is server-only", () => {
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
