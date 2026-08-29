import { describe, expect, it } from "vitest";
import { parseReportExportRange } from "@/lib/report-export-range";

describe("parseReportExportRange", () => {
  it("allows an unfiltered export", () => {
    expect(parseReportExportRange(new URLSearchParams())).toEqual({
      range: {},
      error: null,
    });
  });

  it("accepts a complete valid date range", () => {
    expect(
      parseReportExportRange(
        new URLSearchParams("from=2026-04-01&to=2026-06-30")
      )
    ).toEqual({
      range: { from: "2026-04-01", to: "2026-06-30" },
      error: null,
    });
  });

  it("rejects incomplete or malformed ranges", () => {
    expect(
      parseReportExportRange(new URLSearchParams("from=2026-04-01"))
        .error
    ).toBeTruthy();
    expect(
      parseReportExportRange(
        new URLSearchParams("from=2026-04-01&to=not-a-date")
      ).error
    ).toBeTruthy();
  });

  it("rejects a reversed range", () => {
    expect(
      parseReportExportRange(
        new URLSearchParams("from=2026-06-30&to=2026-04-01")
      ).error
    ).toContain("start date");
  });
});
