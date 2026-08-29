import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicRequestPath } from "@/lib/public-routes";

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from protected app routes.
 * Wired up in proxy.ts at the project root.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute =
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");
  // /auth/* are route handlers (email confirmation links, password-reset
  // code exchange) that run before a session cookie exists yet, they issue
  // their own redirects once done. /reset-password is reached immediately
  // after that exchange with a recovery session, so it stays protected.
  const isAuthCallback = pathname.startsWith("/auth");
  const isPublicPage = isPublicRequestPath(pathname);

  if (
    !user &&
    !isAuthRoute &&
    !isPublicAsset &&
    !isAuthCallback &&
    !isPublicPage
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
