import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0034_atomic_programme_entry.sql"),
  "utf8"
);
const programmeData = readFileSync(
  resolve(process.cwd(), "src/lib/data/programmes.ts"),
  "utf8"
);
const wizard = readFileSync(
  resolve(process.cwd(), "src/components/forms/programme-entry-wizard.tsx"),
  "utf8"
);

describe("atomic programme entry", () => {
  it("uses a SECURITY INVOKER RPC so normal RLS remains active", () => {
    const start = migration.indexOf(
      "create or replace function public.create_programme_entry"
    );
    expect(start).toBeGreaterThanOrEqual(0);
    const fn = migration.slice(start);
    expect(fn).toContain("security invoker");
    expect(fn).not.toContain("security definer");
    expect(fn).toContain(
      "grant execute on function public.create_programme_entry(jsonb, boolean)"
    );
  });

  it("creates attendance and guest-minister links inside the same function", () => {
    expect(migration).toContain(
      "insert into public.programme_occurrences"
    );
    expect(migration).toContain(
      "insert into public.attendance_records"
    );
    expect(migration).toContain(
      "insert into public.programme_guest_ministers"
    );
  });

  it("can submit inside the same transaction", () => {
    expect(migration).toContain("if p_submit then");
    expect(migration).toContain(
      "from public.submit_attendance("
    );
    expect(migration).toContain(
      "v_programme.version"
    );
  });

  it("revalidates tenant and reference scope inside the RPC", () => {
    expect(migration).toContain(
      "b.church_id = v_church_id"
    );
    expect(migration).toContain(
      "s.church_id = v_church_id"
    );
    expect(migration).toContain(
      "v.branch_id = v_branch_id"
    );
    expect(migration).toContain(
      "m.church_id = v_church_id"
    );
  });

  it("revalidates attendance exception rules inside the RPC", () => {
    expect(migration).toContain(
      "v_total > v_capacity"
    );
    expect(migration).toContain(
      "v_first_timers > v_total or v_converts > v_total"
    );
    expect(migration).toContain(
      "Attendance and outcome counts cannot be negative"
    );
  });

  it("revalidates duplicate-service acknowledgement inside the RPC", () => {
    expect(migration).toContain("v_duplicate_exists");
    expect(migration).toContain(
      "if v_duplicate_exists and not v_duplicate_override then"
    );
    expect(migration).toContain(
      "Add a reason for recording a duplicate service on the same day"
    );
  });

  it("aligns guest-minister links with Administrator programme creation", () => {
    expect(migration).toContain(
      "or private.is_administrator()"
    );
    expect(migration).toContain(
      "m.church_id = private.current_church_id()"
    );
  });

  it("uses the atomic RPC for both draft and submitted creation", () => {
    expect(programmeData).toContain(
      '"create_programme_entry" as never'
    );
    expect(programmeData).toContain(
      "return createProgrammeEntry(values, false)"
    );
    expect(programmeData).toContain(
      "return createProgrammeEntry(values, true)"
    );
  });

  it("does not perform a second submit call from the new-programme wizard", () => {
    expect(wizard).toContain(
      "const programme = await createAndSubmitProgramme(data)"
    );
    expect(wizard).not.toContain("submitAttendanceAction(programme.id");
  });
});
