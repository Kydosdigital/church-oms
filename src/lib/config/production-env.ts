type EnvMap = Readonly<Record<string, string | undefined>>;

const REQUIRED_PRODUCTION_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function getMissingProductionEnv(env: EnvMap): string[] {
  if (env.VERCEL_ENV !== "production") return [];

  return REQUIRED_PRODUCTION_ENV.filter((name) => !env[name]?.trim());
}

export function isSentryConfigured(env: EnvMap): boolean {
  return Boolean(env.NEXT_PUBLIC_SENTRY_DSN?.trim());
}
