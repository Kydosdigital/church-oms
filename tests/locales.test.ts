import { describe, expect, it } from "vitest";
import {
  formatChurchDate,
  formatChurchDateTime,
  getLocaleOptions,
  isValidLocale,
} from "@/lib/locales";

describe("church locale helpers", () => {
  it("accepts supported regional locales and rejects malformed values", () => {
    expect(isValidLocale("en-GB")).toBe(true);
    expect(isValidLocale("en-NG")).toBe(true);
    expect(isValidLocale("en-US")).toBe(true);
    expect(isValidLocale("not a locale!")).toBe(false);
  });

  it("keeps common Church OMS regions available", () => {
    const values = new Set(getLocaleOptions().map((option) => option.value));
    expect(values.has("en-GB")).toBe(true);
    expect(values.has("en-NG")).toBe(true);
    expect(values.has("en-US")).toBe(true);
    expect(values.has("en-GH")).toBe(true);
    expect(values.has("en-KE")).toBe(true);
  });

  it("formats ISO programme dates using the selected locale", () => {
    expect(
      formatChurchDate("2026-08-29", "en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    ).toBe("29/08/2026");

    expect(
      formatChurchDate("2026-08-29", "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    ).toBe("08/29/2026");
  });

  it("formats sign-off timestamps in the church timezone", () => {
    const value = "2026-08-29T18:30:00.000Z";

    const london = formatChurchDateTime(value, "en-GB", "Europe/London", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const lagos = formatChurchDateTime(value, "en-NG", "Africa/Lagos", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    expect(london).toContain("19:30");
    expect(lagos).toContain("19:30");
  });
});
