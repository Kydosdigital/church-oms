import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/0043_online_giving_category_scope.sql"
  ),
  "utf8"
);
const dataSource = readFileSync(
  resolve(process.cwd(), "src/lib/data/online-giving.ts"),
  "utf8"
);
const rowSource = readFileSync(
  resolve(
    process.cwd(),
    "src/components/revenue/online-giving-transaction-row.tsx"
  ),
  "utf8"
);

describe("online giving reconciliation category scope", () => {
  it("requires a newly selected category to be active and church-scoped", () => {
    expect(migration).toContain("c.church_id = v_tx.church_id");
    expect(migration).toContain("c.active = true");
  });

  it("requires the category to apply to the selected service type", () => {
    expect(migration).toContain("c.applies_to_all_service_types = true");
    expect(migration).toContain("public.offering_category_service_types");
    expect(migration).toContain(
      "cs.service_type_id = v_programme.service_type_id"
    );
  });

  it("mirrors fundraising project entry-window rules", () => {
    expect(migration).toContain(
      "v_programme.programme_date >= fp.start_date"
    );
    expect(migration).toContain(
      "v_programme.programme_date <= fp.end_date"
    );
    expect(migration).toContain(
      "fp.accepting_entries_after_end_override = true"
    );
  });

  it("keeps inactive categories available for historical labels but not selection", () => {
    expect(dataSource).toContain('.select("id, name, active")');
    expect(rowSource).toContain(
      ".filter((category) => category.active)"
    );
  });
});
