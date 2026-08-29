import { describe, expect, it } from "vitest";
import { isPublicRequestPath } from "@/lib/public-routes";

describe("public request routes", () => {
  it.each([
    "/",
    "/about",
    "/features",
    "/pricing",
    "/contact",
    "/privacy",
    "/terms",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
  ])("keeps %s public for signed-out visitors", (pathname) => {
    expect(isPublicRequestPath(pathname)).toBe(true);
  });

  it("accepts a trailing slash on public pages", () => {
    expect(isPublicRequestPath("/pricing/")).toBe(true);
    expect(isPublicRequestPath("/about/")).toBe(true);
  });

  it.each([
    "/dashboard",
    "/programmes",
    "/reports",
    "/revenue",
    "/admin",
    "/counter",
    "/platform",
    "/onboarding",
    "/account-inactive",
    "/reset-password",
  ])("does not classify protected route %s as public", (pathname) => {
    expect(isPublicRequestPath(pathname)).toBe(false);
  });

  it("does not make arbitrary future paths public by prefix accident", () => {
    expect(isPublicRequestPath("/pricing/admin")).toBe(false);
    expect(isPublicRequestPath("/contact/export")).toBe(false);
  });
});
