import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0030_advisor_performance_indexes.sql"
  ),
  "utf8"
);

describe("advisor-driven performance migration", () => {
  it("adds covering indexes for live-counter foreign keys", () => {
    expect(migration).toContain(
      "idx_attendance_counter_entries_user_id"
    );
    expect(migration).toContain(
      "idx_attendance_counter_sessions_branch_id"
    );
    expect(migration).toContain(
      "idx_attendance_counter_sessions_opened_by"
    );
    expect(migration).toContain(
      "idx_attendance_counter_sessions_closed_by"
    );
  });

  it("evaluates auth.uid once in the Platform Owner RLS policy", () => {
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain("to authenticated");
  });

  it("does not broaden Platform Owner access", () => {
    expect(migration).toContain("and active = true");
    expect(migration).not.toContain("using (true)");
  });
});
