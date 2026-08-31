import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0047_online_giving_relational_scope.sql"
  ),
  "utf8"
);

describe("online giving relational tenant scope", () => {
  it("makes branch identity referenceable with its church", () => {
    expect(migration).toContain(
      "unique (id, church_id)"
    );
  });

  it("requires each giving batch branch to belong to the same church", () => {
    expect(migration).toContain(
      "foreign key (branch_id, church_id)"
    );
    expect(migration).toContain(
      "references public.branches (id, church_id)"
    );
  });

  it("makes batch scope a composite identity", () => {
    expect(migration).toContain(
      "unique (id, church_id, branch_id)"
    );
  });

  it("requires transaction scope to match its parent batch", () => {
    expect(migration).toContain(
      "foreign key (batch_id, church_id, branch_id)"
    );
    expect(migration).toContain(
      "references public.online_giving_batches (id, church_id, branch_id)"
    );
  });
});
