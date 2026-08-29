const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/about",
  "/features",
  "/pricing",
  "/contact",
  "/privacy",
  "/terms",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
]);

function normalizePathname(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

export function isPublicRequestPath(pathname: string) {
  return PUBLIC_EXACT_PATHS.has(normalizePathname(pathname));
}
