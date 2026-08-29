import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const revenueSource = readFileSync(
  resolve(process.cwd(), "src/lib/data/revenue.ts"),
  "utf8"
);
const dashboardSource = readFileSync(
  resolve(process.cwd(), "src/lib/data/dashboards.ts"),
  "utf8"
);
const categoryPageSource = readFileSync(
  resolve(process.cwd(), "src/app/(app)/admin/categories/page.tsx"),
  "utf8"
);

describe("project revenue aggregation", () => {
  it("uses one category-id batch query for verified revenue totals", () => {
    expect(revenueSource).toContain("getVerifiedRevenueTotalsByCategory");
    expect(revenueSource).toContain('.in("category_id", categoryIds)');
    expect(revenueSource).toContain('.eq("state", "verified")');
  });

  it("does not query revenue once per project in dashboard aggregation", () => {
    expect(dashboardSource).toContain("getVerifiedRevenueTotalsByCategory");
    expect(dashboardSource).not.toContain(
      '.eq("category_id", cat.id)'
    );
  });

  it("does not query revenue once per project on the admin category page", () => {
    expect(categoryPageSource).toContain("getVerifiedRevenueTotalsByCategory");
    expect(categoryPageSource).not.toContain(
      '.eq("category_id", category.id)'
    );
  });

  it("does not request historical project totals without history permission", () => {
    expect(categoryPageSource).toContain("hasFinanceHistoryPermission()");
    expect(categoryPageSource).toContain(
      "canViewProjectProgress"
    );
  });
});
