import { describe, expect, it } from "vitest";
import { resolveDashboardRange } from "@/lib/dashboard-range";

const NOW = new Date("2026-08-29T12:00:00.000Z");

describe("dashboard reporting ranges", () => {
  it("keeps the existing rolling-day presets", () => {
    expect(resolveDashboardRange({ range: "30d" }, 1, NOW)).toMatchObject({
      preset: "30d",
      from: "2026-07-30",
      to: "2026-08-29",
    });
  });

  it("uses the configured reporting-year start for YTD", () => {
    expect(resolveDashboardRange({ range: "year" }, 4, NOW)).toMatchObject({
      preset: "year",
      from: "2026-04-01",
      to: "2026-08-29",
    });
  });

  it("builds fiscal quarters from the reporting-year start month", () => {
    expect(resolveDashboardRange({ range: "q1" }, 4, NOW)).toMatchObject({
      from: "2026-04-01",
      to: "2026-06-30",
    });
    expect(resolveDashboardRange({ range: "q4" }, 4, NOW)).toMatchObject({
      from: "2027-01-01",
      to: "2027-03-31",
    });
  });

  it("resolves current quarter against the reporting year", () => {
    const range = resolveDashboardRange({ range: "currentq" }, 4, NOW);
    expect(range).toMatchObject({
      preset: "currentq",
      from: "2026-07-01",
      to: "2026-09-30",
    });
    expect(range.label).toContain("Q2");
  });

  it("accepts a valid custom range", () => {
    expect(
      resolveDashboardRange(
        { range: "custom", from: "2026-08-01", to: "2026-08-20" },
        1,
        NOW
      )
    ).toEqual({
      preset: "custom",
      from: "2026-08-01",
      to: "2026-08-20",
      label: "Custom range",
    });
  });

  it("falls back safely when a custom range is invalid", () => {
    expect(
      resolveDashboardRange(
        { range: "custom", from: "2026-08-20", to: "2026-08-01" },
        1,
        NOW
      )
    ).toMatchObject({
      preset: "custom",
      from: "2026-05-31",
      to: "2026-08-29",
    });
  });
});
