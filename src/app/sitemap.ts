import type { MetadataRoute } from "next";

// Kept in sync by hand with robots.ts's `allow` list — the only pages meant
// to rank are the public marketing/legal surface, not anything behind auth.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://church-oms.vercel.app";

  return [
    {
      url: base,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${base}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
