import * as Sentry from "@sentry/nextjs";

// No-ops entirely if NEXT_PUBLIC_SENTRY_DSN isn't set — the user manages this
// via Vercel project environment variables, not anything in this repo.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
  });
}
