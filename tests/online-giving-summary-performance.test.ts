import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0041_online_giving_programme_summary.sql"
  ),
  "utf8"
);
const dataSource = readFileSync(
  resolve(process.cwd(), "src/lib/data/online-giving.ts"),
  "utf8"
);

describe("online giving reconciliation summary performance", () => {
  it("aggregates matched and recorded totals inside PostgreSQL", () => {
    expect(migration).toContain(
      "create or replace function public.online_giving_programme_summary"
    );
    expect(migration).toContain("group by t.matched_programme_id");
    expect(migration).toContain("group by r.programme_id");
  });

  it("keeps the summary RPC under caller RLS and finance-history scope", () => {
    expect(migration).toContain("security invoker");
    expect(migration).not.toContain("security definer");
    expect(migration).toContain(
      "private.has_finance_history_permission(p_branch_id)"
    );
    expect(migration).toContain("from private.user_branch_ids()");
    expect(migration).toContain("p.church_id = v_church_id");
  });

  it("returns grouped summary rows instead of paging full history into Node", () => {
    expect(dataSource).toContain(
      'supabase.rpc(\n    "online_giving_programme_summary"'
    );
    expect(dataSource).not.toContain("fetchAllMatchedTotals");
    expect(dataSource).not.toContain("fetchAllRecordedOnlineTotals");
    expect(dataSource).not.toContain('.select("matched_programme_id, amount")');
    expect(dataSource).not.toContain(
      '"programme_id, online_amount, programme_occurrences!inner(branch_id)"'
    );
  });
});
