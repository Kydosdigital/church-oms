import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0044_online_giving_server_fingerprint.sql"
  ),
  "utf8"
);
const dataSource = readFileSync(
  resolve(process.cwd(), "src/lib/data/online-giving.ts"),
  "utf8"
);
const importUi = readFileSync(
  resolve(
    process.cwd(),
    "src/components/revenue/online-giving-import.tsx"
  ),
  "utf8"
);
const pageSource = readFileSync(
  resolve(
    process.cwd(),
    "src/app/(app)/revenue/reconciliation/page.tsx"
  ),
  "utf8"
);

describe("online giving server-owned fingerprint", () => {
  it("computes SHA-256 inside PostgreSQL from normalized rows", () => {
    expect(migration).toContain("extensions.digest(");
    expect(migration).toContain("'sha256'");
    expect(migration).toContain("pg_catalog.jsonb_agg(");
    expect(migration).toContain("pg_catalog.round(t.amount, 2)");
    expect(migration).toContain("order by");
  });

  it("adds a four-argument import RPC that does not accept a client hash", () => {
    expect(migration).toContain(
      "p_file_name text,\n  p_transactions jsonb"
    );
    expect(dataSource).not.toContain("p_file_hash:");
    expect(dataSource).not.toContain("file_hash: string");
  });

  it("keeps the legacy signature only as a secure compatibility wrapper", () => {
    expect(migration).toContain("p_file_hash text");
    expect(migration).toContain("security invoker");
    expect(migration).toContain(
      "select public.import_online_giving_batch("
    );
  });

  it("stops hashing the raw browser file", () => {
    expect(importUi).not.toContain("crypto.subtle.digest");
    expect(importUi).not.toContain("sha256Hex");
    expect(importUi).not.toContain("file_hash:");
  });

  it("describes the stored reference field accurately", () => {
    expect(pageSource).toContain(
      "statement references are retained for reconciliation"
    );
    expect(pageSource).not.toContain(
      "Donor names are not stored by this reconciliation feature"
    );
  });
});
