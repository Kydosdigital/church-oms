import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0026_live_counter_privacy_and_audit.sql"
  ),
  "utf8"
);

describe("live counter privacy and audit migration", () => {
  it("moves aggregate totals onto the session row", () => {
    for (const column of [
      "live_total",
      "submitted_total",
      "counter_count",
      "counting_count",
      "submitted_count",
    ]) {
      expect(migration).toContain(column);
    }
    expect(migration).toContain(
      "create or replace function public.recompute_attendance_counter_session"
    );
  });

  it("lets an usher select their own row but not every usher row", () => {
    expect(migration).toContain("user_id = (select auth.uid())");
    expect(migration).toContain(
      "public.has_role('attendance_verifier'::public.app_role, s.branch_id)"
    );
    expect(migration).toContain(
      "public.has_role('pastor'::public.app_role)"
    );
  });

  it("updates session aggregates after entry changes", () => {
    expect(migration).toContain(
      "create trigger trg_sync_attendance_counter_session_totals"
    );
    expect(migration).toContain("after insert or update or delete");
  });

  it("audits session open/reopen/close without logging every tap", () => {
    expect(migration).toContain("'counter_open'");
    expect(migration).toContain("'counter_reopen'");
    expect(migration).toContain("'counter_close'");
    expect(migration).not.toContain("'counter_increment'");
  });

  it("audits usher submit and resume actions", () => {
    expect(migration).toContain("'counter_submit'");
    expect(migration).toContain("'counter_resume'");
  });
});
