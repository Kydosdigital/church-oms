import type { MetadataRoute } from "next";

// Only the true public/marketing surface (home, privacy, terms) should be
// crawled. Everything else is either an auth utility page with no search
// value (login/signup/forgot-password/reset-password/onboarding) or
// requires a session and redirects anonymous visitors anyway
// ((app)/* — dashboard, programmes, revenue, reports, help, admin/*).
// Matching Disallow rules here are a courtesy for well-behaved crawlers;
// the actual access control is Supabase RLS + proxy.ts, and the
// authenticated routes also carry their own `noindex` meta (see their
// layout/page metadata) as a second line of defence.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://church-oms.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/features", "/pricing", "/about", "/contact", "/privacy", "/terms"],
      disallow: [
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/onboarding",
        "/dashboard",
        "/programmes",
        "/revenue",
        "/reports",
        "/help",
        "/admin",
        "/auth",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
