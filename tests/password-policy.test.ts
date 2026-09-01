import { describe, expect, it } from "vitest";
import {
  getPasswordPolicyError,
  MIN_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS,
} from "@/lib/auth/password-policy";

describe("password policy", () => {
  it("requires at least 12 characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(getPasswordPolicyError("Aa1!short")).toBe(PASSWORD_REQUIREMENTS);
  });

  it.each([
    ["all lowercase", "lowercase123!"],
    ["all uppercase", "UPPERCASE123!"],
    ["no number", "NoNumbersHere!"],
    ["no symbol", "NoSymbols1234"],
  ])("rejects %s", (_label, password) => {
    expect(getPasswordPolicyError(password)).toBe(PASSWORD_REQUIREMENTS);
  });

  it("accepts a password meeting every requirement", () => {
    expect(getPasswordPolicyError("ChurchOMS2026!")).toBeNull();
  });
});
