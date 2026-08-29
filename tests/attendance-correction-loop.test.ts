import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { programmeCorrectionSchema } from "@/lib/validations/programme";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0035_attendance_correction_loop.sql"),
  "utf8"
);
const programmeData = readFileSync(
  resolve(process.cwd(), "src/lib/data/programmes.ts"),
  "utf8"
);
const programmePage = readFileSync(
  resolve(process.cwd(), "src/app/(app)/programmes/[id]/page.tsx"),
  "utf8"
);
const correctionForm = readFileSync(
  resolve(process.cwd(), "src/components/forms/programme-correction-form.tsx"),
  "utf8"
);

const base = {
  programme_name: "Sunday Service",
  classification: "routine" as const,
  preacher_type: "none" as const,
  men_count: 10,
  women_count: 10,
  teenagers_count: 2,
  children_count: 3,
  first_timers_count: 1,
  converts_count: 1,
  new_births_count: 0,
  weddings_count: 0,
};

describe("programme correction validation", () => {
  it("accepts a valid correction", () => {
    expect(programmeCorrectionSchema.safeParse(base).success).toBe(true);
  });

  it("requires an existing preacher id when selected", () => {
    expect(
      programmeCorrectionSchema.safeParse({
        ...base,
        preacher_type: "existing",
      }).success
    ).toBe(false);
  });

  it("requires a guest preacher name when selected", () => {
    expect(
      programmeCorrectionSchema.safeParse({
        ...base,
        preacher_type: "guest",
        guest_preacher_name: "",
      }).success
    ).toBe(false);
  });

  it("rejects negative correction counts", () => {
    expect(
      programmeCorrectionSchema.safeParse({
        ...base,
        women_count: -1,
      }).success
    ).toBe(false);
  });
});

describe("atomic attendance correction migration", () => {
  it("keeps the public correction RPC under caller RLS", () => {
    const start = migration.indexOf(
      "create or replace function public.update_programme_entry"
    );
    expect(start).toBeGreaterThanOrEqual(0);
    const publicRpc = migration.slice(start);
    expect(publicRpc).toContain("security invoker");
    expect(publicRpc).not.toContain("security definer");
  });

  it("keeps the privileged version mutation in the private schema", () => {
    expect(migration).toContain(
      "create or replace function private.apply_programme_correction"
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain("version = version + 1");
  });

  it("rechecks recorder, tenant, branch, state and version before editing", () => {
    expect(migration).toContain(
      "v_programme.church_id is distinct from private.current_church_id()"
    );
    expect(migration).toContain(
      "v_programme.created_by is distinct from auth.uid()"
    );
    expect(migration).toContain(
      "select private.user_branch_ids('usher'::public.app_role)"
    );
    expect(migration).toContain(
      "'returned'::public.record_state"
    );
    expect(migration).toContain(
      "'reopened'::public.record_state"
    );
    expect(migration).toContain(
      "v_programme.version <> p_expected_version"
    );
  });

  it("updates programme and attendance together and audits the edit", () => {
    expect(migration).toContain(
      "update public.programme_occurrences"
    );
    expect(migration).toContain(
      "update public.attendance_records"
    );
    expect(migration).toContain(
      "insert into public.audit_events"
    );
    expect(migration).toContain("'edit'");
  });

  it("can resubmit the corrected version in the same transaction", () => {
    expect(migration).toContain("if p_submit then");
    expect(migration).toContain(
      "from public.submit_attendance("
    );
    expect(migration).toContain("v_programme.version");
  });
});

describe("attendance correction UI", () => {
  it("uses the atomic correction RPC instead of the old direct update path", () => {
    expect(programmeData).toContain(
      '"update_programme_entry" as never'
    );
    expect(programmeData).not.toContain(
      "export async function updateDraftAttendance"
    );
  });

  it("only exposes correction to the original recorder in editable states", () => {
    expect(programmePage).toContain(
      "ctx.user.id === programme.created_by"
    );
    expect(programmePage).toContain(
      '["draft", "returned", "reopened"].includes(programme.state)'
    );
    expect(programmePage).toContain(
      "<ProgrammeCorrectionForm"
    );
  });

  it("offers both save and resubmit actions", () => {
    expect(correctionForm).toContain("Save correction");
    expect(correctionForm).toContain("Save & resubmit");
    expect(correctionForm).toContain(
      "updateProgrammeEntryAction("
    );
  });
});
