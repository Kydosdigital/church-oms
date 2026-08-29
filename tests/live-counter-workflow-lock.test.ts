import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0038_live_counter_workflow_lock.sql"),
  "utf8"
);
const counterPage = readFileSync(
  resolve(process.cwd(), "src/app/(app)/programmes/[id]/counter/page.tsx"),
  "utf8"
);
const programmePage = readFileSync(
  resolve(process.cwd(), "src/app/(app)/programmes/[id]/page.tsx"),
  "utf8"
);
const liveCounter = readFileSync(
  resolve(process.cwd(), "src/components/attendance/live-counter.tsx"),
  "utf8"
);

describe("live counter workflow lock", () => {
  it("guards both counter sessions and counter entries at the database boundary", () => {
    expect(migration).toContain(
      "private.guard_attendance_counter_workflow_state"
    );
    expect(migration).toContain(
      "before insert or update\non public.attendance_counter_sessions"
    );
    expect(migration).toContain(
      "before insert or update\non public.attendance_counter_entries"
    );
  });

  it("allows counter writes only in editable attendance states", () => {
    expect(migration).toContain("'draft'::public.record_state");
    expect(migration).toContain("'returned'::public.record_state");
    expect(migration).toContain("'reopened'::public.record_state");
    expect(migration).toContain(
      "'Live counter is locked while attendance state is %'"
    );
  });

  it("serializes counter writes against attendance signoff", () => {
    expect(migration).toContain("for key share");
    expect(migration).toContain(
      "Close the live attendance counter before signing and submitting attendance"
    );
    expect(migration).toContain(
      "where s.programme_id = p_programme_id"
    );
    expect(migration).toContain("s.status = 'open'");
  });

  it("prevents closing while any usher is still counting", () => {
    expect(migration).toContain(
      "old.status = 'open'"
    );
    expect(migration).toContain(
      "new.status = 'closed'"
    );
    expect(migration).toContain(
      "e.status = 'counting'"
    );
    expect(migration).toContain(
      "usher counter(s) are still counting"
    );
  });

  it("allows a genuinely unused counter to close at zero", () => {
    const closeStart = migration.indexOf(
      "create or replace function public.close_attendance_counter"
    );
    const submitStart = migration.indexOf(
      "create or replace function public.submit_attendance",
      closeStart
    );
    const closeFn = migration.slice(closeStart, submitStart);

    expect(closeFn).toContain(
      "coalesce(sum(e.count), 0)::integer"
    );
    expect(closeFn).not.toContain(
      "No usher counts have been submitted yet"
    );
  });

  it("keeps the existing submit authorization and optimistic version check", () => {
    const submitStart = migration.indexOf(
      "create or replace function public.submit_attendance"
    );
    const submitFn = migration.slice(submitStart);

    expect(submitFn).toContain("v_prog.created_by <> auth.uid()");
    expect(submitFn).toContain(
      "v_prog.version <> p_expected_version"
    );
    expect(submitFn).toContain(
      "'CONFLICT: record has been modified"
    );
  });
});

describe("live counter locked-state UI", () => {
  it("makes count/open/close permissions conditional on editable attendance state", () => {
    expect(counterPage).toContain(
      'const workflowEditable = ["draft", "returned", "reopened"].includes(programme.state)'
    );
    expect(counterPage).toContain(
      "const canCount = workflowEditable"
    );
    expect(counterPage).toContain(
      "const canClose = workflowEditable"
    );
    expect(counterPage).toContain(
      "const canOpen ="
    );
  });

  it("keeps locked counter evidence reviewable by reviewers", () => {
    expect(programmePage).toContain("canReviewLiveCounter");
    expect(programmePage).toContain(
      'counterEditable ? "Open live counter" : "View live counter"'
    );
    expect(programmePage).toContain(
      "Review the final live-counter evidence"
    );
  });

  it("does not disable closing solely because no count was submitted", () => {
    expect(liveCounter).toContain(
      "disabled={closing || countingCount > 0}"
    );
    expect(liveCounter).not.toContain(
      "submittedCount === 0 ||"
    );
  });
});
