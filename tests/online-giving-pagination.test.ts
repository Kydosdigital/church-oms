import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dataSource = readFileSync(
  resolve(process.cwd(), "src/lib/data/online-giving.ts"),
  "utf8"
);
const pageSource = readFileSync(
  resolve(process.cwd(), "src/app/(app)/revenue/reconciliation/page.tsx"),
  "utf8"
);

describe("online giving transaction pagination", () => {
  it("uses a bounded server-side range with an exact filtered count", () => {
    expect(dataSource).toContain('.select("*", { count: "exact" })');
    expect(dataSource).toContain(
      "transactionQuery.range(from, from + pageSize - 1)"
    );
    expect(dataSource).not.toContain(".limit(200)");
    expect(dataSource).toContain('.order("id", { ascending: false })');
  });

  it("returns page metadata for the selected status view", () => {
    expect(dataSource).toContain("transactionCount ?? 0");
    expect(dataSource).toContain("totalPages: Math.max(");
    expect(dataSource).toContain("page: safePage");
  });

  it("keeps branch and status filters while navigating pages", () => {
    expect(pageSource).toContain("searchParams.page");
    expect(pageSource).toContain(
      "getOnlineGivingReconciliationData(selectedBranch.id, status, page)"
    );
    expect(pageSource).toContain("Previous");
    expect(pageSource).toContain("Next");
    expect(pageSource).toContain("&status=${status}&page=");
  });

  it("redirects an out-of-range page to the last available page", () => {
    expect(pageSource).toContain("page > data.pagination.totalPages");
    expect(pageSource).toContain("&page=${data.pagination.totalPages}");
  });
});
