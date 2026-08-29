import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0024_align_programme_entry_permissions.sql"
  ),
  "utf8"
);

describe("programme entry permission hardening", () => {
  it("allows administrators through the same programme-entry path as the UI", () => {
    expect(migration).toContain("or public.is_administrator()");
    expect(migration).toContain("create policy programme_insert");
  });

  it("keeps direct updates inside editable attendance states", () => {
    expect(migration).toContain("'reopened'::public.record_state");
    expect(migration).toContain("create policy programme_update");
    expect(migration).toContain("state in (");
  });

  it("allows reopened attendance records to be corrected and resubmitted", () => {
    expect(migration).toContain("create policy attendance_write");
    expect(migration).toContain(
      "create or replace function public.submit_attendance"
    );
    expect(migration).toContain("'reopened'::public.record_state");
  });

  it("binds attendance submission to the caller's church and creator identity", () => {
    expect(migration).toContain(
      "v_prog.church_id is distinct from public.current_church_id()"
    );
    expect(migration).toContain("v_prog.created_by <> auth.uid()");
  });

  it("removes direct workflow-column write privileges", () => {
    expect(migration).toContain(
      "revoke insert, update on table public.programme_occurrences from authenticated"
    );
    expect(migration).toContain("grant insert (");
    expect(migration).toContain("grant update (");
    expect(migration).not.toMatch(
      /grant update \([^)]*(?:state|version|finance_state|finance_version)/s
    );
  });
});
