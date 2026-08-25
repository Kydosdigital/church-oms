import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Minor technical-SEO/security hygiene: don't advertise the framework via
  // the X-Powered-By response header.
  poweredByHeader: false,
};

// Error monitoring (Sentry) — entirely opt-in via env vars the user sets in
// Vercel, not this codebase. With no NEXT_PUBLIC_SENTRY_DSN configured, the
// SDK initializes as a safe no-op (sentry.*.config.ts below all check for the
// DSN before calling init()) and this wrapper skips source-map upload
// gracefully when SENTRY_AUTH_TOKEN/SENTRY_ORG/SENTRY_PROJECT aren't set —
// it does not fail the build either way.
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
