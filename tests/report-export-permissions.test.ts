import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const financeRoute = readFileSync(
  resolve(process.cwd(), "src/app/(app)/reports/finance/route.ts"),
  "utf8"
);
const attendanceRoute = readFileSync(
  resolve(process.cwd(), "src/app/(app)/reports/attendance/route.ts"),
  "utf8"
);

describe("report export access boundaries", () => {
  it("requires finance-history permission at the finance export endpoint", () => {
    expect(financeRoute).toContain("hasFinanceHistoryPermission()");
    expect(financeRoute).toContain('status: 403');
  });

  it("requires an authenticated app context for both export endpoints", () => {
    expect(financeRoute).toContain('status: 401');
    expect(attendanceRoute).toContain('status: 401');
  });

  it("validates and applies requested report date ranges", () => {
    expect(financeRoute).toContain("parseReportExportRange");
    expect(attendanceRoute).toContain("parseReportExportRange");
    expect(financeRoute).toContain("programme_occurrences.programme_date");
    expect(attendanceRoute).toContain('gte("programme_date"');
  });
});
