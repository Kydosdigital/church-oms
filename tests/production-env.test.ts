import { describe, expect, it } from "vitest";
import {
  getMissingProductionEnv,
  isSentryConfigured,
} from "@/lib/config/production-env";

describe("production environment validation", () => {
  it("does not enforce production-only variables outside Vercel production", () => {
    expect(getMissingProductionEnv({ VERCEL_ENV: "preview" })).toEqual([]);
  });

  it("reports only missing required production variables", () => {
    expect(
      getMissingProductionEnv({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
      })
    ).toEqual(["SUPABASE_SERVICE_ROLE_KEY"]);
  });

  it("accepts a fully configured production environment", () => {
    expect(
      getMissingProductionEnv({
        VERCEL_ENV: "production",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-key",
        SUPABASE_SERVICE_ROLE_KEY: "server-secret",
      })
    ).toEqual([]);
  });

  it("reports Sentry configuration without exposing the DSN", () => {
    expect(isSentryConfigured({ NEXT_PUBLIC_SENTRY_DSN: "" })).toBe(false);
    expect(
      isSentryConfigured({
        NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/123",
      })
    ).toBe(true);
  });
});
