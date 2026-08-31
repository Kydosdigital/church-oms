import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

describe("online giving historical service selection", () => {
  it("keeps the default service list bounded", () => {
    expect(dataSource).toContain('.limit(100)');
    expect(dataSource).toContain('.limit(25)');
  });

  it("adds services matching transaction dates from the current page", () => {
    expect(dataSource).toContain("transactionDates");
    expect(dataSource).toContain('.in("programme_date", transactionDates)');
  });

  it("keeps already-matched historical service names available", () => {
    expect(dataSource).toContain("missingMatchedProgrammeIds");
    expect(dataSource).toContain('.in("id", missingMatchedProgrammeIds)');
  });

  it("provides an authorized bounded search for older services", () => {
    expect(dataSource).toContain(
      "export async function searchReconciliationProgrammesAction"
    );
    expect(dataSource).toContain(
      "const { supabase } = await getAuthorizedBranch(branchId)"
    );
    expect(dataSource).toContain('.ilike("programme_name"');
    expect(rowSource).toContain("Search older services");
    expect(rowSource).toContain("searchReconciliationProgrammesAction");
  });
});
