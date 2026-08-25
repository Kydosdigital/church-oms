import * as Sentry from "@sentry/nextjs";

// No-ops entirely without NEXT_PUBLIC_SENTRY_DSN set — see src/instrumentation.ts.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
