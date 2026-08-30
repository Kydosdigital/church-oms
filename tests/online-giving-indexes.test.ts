import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0040_online_giving_fk_indexes.sql"
  ),
  "utf8"
);

describe("online giving foreign-key indexes", () => {
  it("covers the imported_by foreign key", () => {
    expect(migration).toContain("idx_online_giving_batches_imported_by");
  });

  it("covers transaction batch and match foreign keys", () => {
    expect(migration).toContain("idx_online_giving_transactions_batch_id");
    expect(migration).toContain("idx_online_giving_transactions_matched_by");
    expect(migration).toContain(
      "idx_online_giving_transactions_matched_category_id"
    );
  });

  it("does not change RLS or grants", () => {
    expect(migration).not.toContain("create policy");
    expect(migration).not.toContain("grant ");
    expect(migration).not.toContain("revoke ");
  });
});
