import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import {
  getMissingProductionEnv,
  isSentryConfigured,
} from "./src/lib/config/production-env";

const missingProductionEnv = getMissingProductionEnv(process.env);
if (missingProductionEnv.length > 0) {
  throw new Error(
    `Missing required production environment variables: ${missingProductionEnv.join(", ")}`
  );
}

if (process.env.VERCEL_ENV === "production") {
  console.info(
    `Production monitoring: Sentry ${isSentryConfigured(process.env) ? "configured" : "not configured"}`
  );
}

const nextConfig: NextConfig = {
  // Minor technical-SEO/security hygiene: don't advertise the framework via
  // the X-Powered-By response header.
  poweredByHeader: false,
};

// Error monitoring (Sentry) is opt-in via environment variables. With no
// NEXT_PUBLIC_SENTRY_DSN configured, the SDK initializes as a safe no-op.
// Source-map upload is also optional and only runs when the auth token exists.
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
