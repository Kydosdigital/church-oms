import type { Instrumentation } from "next";

/**
 * Error monitoring (Sentry) — entirely opt-in. Nothing here does anything
 * unless NEXT_PUBLIC_SENTRY_DSN is set as a Vercel project environment
 * variable (the user's own responsibility, not this codebase's). Without it,
 * this whole file is a no-op and the only way to notice a production
 * problem stays the Vercel deployment logs, exactly as before.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
