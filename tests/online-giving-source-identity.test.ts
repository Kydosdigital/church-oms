import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0046_normalize_online_giving_source_identity.sql"
  ),
  "utf8"
);

describe("online giving external transaction identity", () => {
  it("normalizes case and whitespace in the payment source", () => {
    expect(migration).toContain("lower(btrim(source_name))");
  });

  it("keeps external IDs unique within the church and normalized source", () => {
    expect(migration).toContain(
      "create unique index uq_online_giving_external_transaction"
    );
    expect(migration).toContain("church_id");
    expect(migration).toContain("external_id");
    expect(migration).toContain("where external_id is not null");
  });

  it("replaces the original case-sensitive index", () => {
    expect(migration).toContain(
      "drop index if exists public.uq_online_giving_external_transaction"
    );
  });
});
