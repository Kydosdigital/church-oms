import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0048_online_giving_composite_fk_indexes.sql"
  ),
  "utf8"
);

describe("online giving composite foreign-key indexes", () => {
  it("covers the batch branch/church foreign key in matching order", () => {
    expect(migration).toContain(
      "on public.online_giving_batches (branch_id, church_id)"
    );
  });

  it("covers the transaction batch/church/branch foreign key in matching order", () => {
    expect(migration).toContain(
      "on public.online_giving_transactions (batch_id, church_id, branch_id)"
    );
  });
});
