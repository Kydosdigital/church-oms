import { describe, expect, it } from "vitest";
import {
  churchSettingsSchema,
  provisionChurchSchema,
} from "@/lib/validations/admin";

describe("church timezone validation", () => {
  it("accepts valid IANA timezones", () => {
    expect(
      churchSettingsSchema.safeParse({
        name: "Grace Church",
        currency_code: "GBP",
        timezone: "Europe/London",
        reporting_year_start_month: 1,
        finance_requires_independent_verification: true,
      }).success
    ).toBe(true);

    expect(
      provisionChurchSchema.safeParse({
        name: "Grace Church",
        currency: "NGN",
        timezone: "Africa/Lagos",
      }).success
    ).toBe(true);
  });

  it("rejects arbitrary timezone text", () => {
    expect(
      churchSettingsSchema.safeParse({
        name: "Grace Church",
        currency_code: "GBP",
        timezone: "London",
        reporting_year_start_month: 1,
        finance_requires_independent_verification: true,
      }).success
    ).toBe(false);
  });
});
