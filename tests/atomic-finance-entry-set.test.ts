import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0037_atomic_finance_entry_set.sql"),
  "utf8"
);
const revenueData = readFileSync(
  resolve(process.cwd(), "src/lib/data/revenue.ts"),
  "utf8"
);
const revenueForm = readFileSync(
  resolve(process.cwd(), "src/components/forms/revenue-entry-form.tsx"),
  "utf8"
);

describe("atomic finance entry-set migration", () => {
  it("keeps the public save RPC under caller RLS", () => {
    const start = migration.indexOf(
      "create or replace function public.save_finance_entry_set"
    );
    expect(start).toBeGreaterThanOrEqual(0);
    const fn = migration.slice(start);
    expect(fn).toContain("security invoker");
    expect(fn).not.toContain("security definer");
  });

  it("uses a private helper for the privileged header version advance", () => {
    expect(migration).toContain(
      "create or replace function private.begin_finance_edit"
    );
    expect(migration).toContain("security definer");
    expect(migration).toContain(
      "set finance_version = v_next_version"
    );
  });

  it("rechecks tenant, finance permission, role, state and expected version", () => {
    expect(migration).toContain(
      "v_prog.church_id is distinct from private.current_church_id()"
    );
    expect(migration).toContain(
      "private.has_finance_permission(v_prog.branch_id)"
    );
    expect(migration).toContain(
      "private.has_role('treasurer'::public.app_role, v_prog.branch_id)"
    );
    expect(migration).toContain(
      "'reopened'::public.record_state"
    );
    expect(migration).toContain(
      "v_prog.finance_version <> p_expected_version"
    );
  });

  it("records each committed finance edit version in the audit log", () => {
    expect(migration).toContain(
      "'revenue_entries',"
    );
    expect(migration).toContain("'edit',");
    expect(migration).toContain(
      "'version', v_next_version"
    );
  });

  it("validates the entry-set shape before taking the edit lock", () => {
    const publicStart = migration.indexOf(
      "create or replace function public.save_finance_entry_set"
    );
    const publicFn = migration.slice(publicStart);
    const validationPosition = publicFn.indexOf(
      "Each offering category may appear only once"
    );
    const lockPosition = publicFn.indexOf(
      "private.begin_finance_edit("
    );

    expect(validationPosition).toBeGreaterThanOrEqual(0);
    expect(lockPosition).toBeGreaterThan(validationPosition);
    expect(publicFn).toContain(
      "Offering amounts must be valid non-negative numbers"
    );
  });

  it("upserts populated rows and deletes categories cleared to zero", () => {
    expect(migration).toContain(
      "on conflict (programme_id, category_id)"
    );
    expect(migration).toContain(
      "delete from public.revenue_entries existing"
    );
    expect(migration).toContain(
      "entry.physical_amount = 0"
    );
    expect(migration).toContain(
      "entry.online_amount = 0"
    );
  });

  it("submits the newly-saved version inside the same RPC", () => {
    expect(migration).toContain("if p_submit then");
    expect(migration).toContain(
      "from public.submit_finance("
    );
    expect(migration).toContain(
      "v_prog.finance_version"
    );
  });

  it("does not expose the private edit helper as a public RPC", () => {
    expect(migration).toContain(
      "revoke all on function private.begin_finance_edit"
    );
    expect(migration).toContain(
      "grant execute on function private.begin_finance_edit"
    );
  });
});

describe("atomic finance entry UI", () => {
  it("sends the user's expected finance version with every save", () => {
    expect(revenueData).toContain(
      "p_expected_version: expectedVersion"
    );
    expect(revenueForm).toContain(
      "financeVersion,"
    );
  });

  it("uses one action for draft save and sign-and-submit", () => {
    expect(revenueForm).toContain(
      "saveFinanceEntrySetAction("
    );
    expect(revenueForm).toContain(
      "await persistEntries(false)"
    );
    expect(revenueForm).toContain(
      "await persistEntries(true)"
    );
  });

  it("does not perform the old two-request save then submit sequence", () => {
    expect(revenueForm).not.toContain("saveRevenueEntries");
    expect(revenueForm).not.toContain(
      "submitFinanceAction(programmeId, financeVersion)"
    );
  });

  it("validates numeric inputs again on the server action", () => {
    expect(revenueData).toContain(
      "!Number.isFinite(entry.physical_amount)"
    );
    expect(revenueData).toContain(
      "Offering amounts must be valid non-negative numbers"
    );
  });
});
