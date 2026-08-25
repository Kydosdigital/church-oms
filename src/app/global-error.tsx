"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary for the whole app (must render its own
 * <html>/<body> since it replaces the root layout). Reports to Sentry when
 * configured (see src/instrumentation.ts) — otherwise this is just a plain
 * friendly error page instead of a blank crash.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error));
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-white text-slate-900">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-slate-600">
            The error has been logged. Try reloading the page — if this keeps happening, contact
            your church administrator.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 text-white px-4 h-10 text-sm font-medium"
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}
