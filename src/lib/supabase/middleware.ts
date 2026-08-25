import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from the protected (app) route group.
 * Wired up in middleware.ts at the project root.
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

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup") ||
    request.nextUrl.pathname.startsWith("/forgot-password");
  const isPublicAsset = request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon");
  // /auth/* are route handlers (email confirmation links, password-reset
  // code exchange) that run before a session cookie exists yet — they issue
  // their own redirects once done, so never gate them here. /reset-password
  // is reached right after that exchange with a fresh recovery session, so
  // it behaves like a normal authenticated page rather than an auth route
  // (it must NOT bounce a signed-in user straight to /dashboard).
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth");
  // Marketing/legal pages that make sense whether or not you're signed in.
  const isPublicPage = request.nextUrl.pathname === "/privacy" || request.nextUrl.pathname === "/terms";

  if (!user && !isAuthRoute && !isPublicAsset && !isAuthCallback && !isPublicPage) {
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
