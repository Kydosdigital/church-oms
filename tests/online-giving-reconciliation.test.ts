import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0039_online_giving_reconciliation.sql"
  ),
  "utf8"
);

describe("online giving reconciliation migration", () => {
  it("creates branch-scoped import and transaction tables", () => {
    expect(migration).toContain("create table if not exists public.online_giving_batches");
    expect(migration).toContain("create table if not exists public.online_giving_transactions");
    expect(migration).toContain("branch_id uuid not null");
    expect(migration).toContain("finance-history permission is required");
  });

  it("does not store donor names", () => {
    expect(migration).not.toContain("donor_name");
    expect(migration).not.toContain("payer_name");
  });

  it("prevents importing the same file twice", () => {
    expect(migration).toContain("unique (church_id, file_hash)");
    expect(migration).toContain("This statement has already been imported");
  });

  it("keeps authenticated clients read-only at table level", () => {
    expect(migration).toContain(
      "revoke insert, update, delete on public.online_giving_batches from authenticated"
    );
    expect(migration).toContain(
      "revoke insert, update, delete on public.online_giving_transactions from authenticated"
    );
    expect(migration).toContain("grant select on public.online_giving_transactions to authenticated");
  });

  it("validates same-church and same-branch matching", () => {
    expect(migration).toContain(
      "The selected service must belong to the same church and branch"
    );
    expect(migration).toContain(
      "The selected offering category does not belong to this church"
    );
  });

  it("uses the hardened private authorization helpers", () => {
    expect(migration).toContain("private.current_church_id()");
    expect(migration).toContain("private.user_branch_ids()");
    expect(migration).toContain("private.has_finance_history_permission(");
    expect(migration).not.toContain("public.current_church_id()");
  });

  it("audits import, match, unmatch and ignore actions", () => {
    expect(migration).toContain("'online_giving_import'");
    expect(migration).toContain("'online_giving_match'");
    expect(migration).toContain("'online_giving_unmatch'");
    expect(migration).toContain("'online_giving_ignore'");
  });
});
