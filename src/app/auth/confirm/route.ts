import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase's email-link confirmation redirect (password reset today;
 * also usable for signup/invite confirmation links, which currently rely on
 * Supabase's own hosted verify page instead). Exchanges the token_hash from
 * the email link for a real session, then forwards to `next` — this route
 * itself is exempted from the auth-required check in
 * src/lib/supabase/middleware.ts since no session exists until this runs.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=reset_link_invalid`);
}
