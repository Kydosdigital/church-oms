import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client — bypasses RLS entirely. ONLY use this for operations
 * that genuinely require Supabase's Auth admin API (inviting a user, i.e.
 * creating an auth.users row) and NEVER expose it to the browser. Every
 * caller must independently verify the requester is an administrator using
 * the normal RLS-bound server client (see requireAdministrator in
 * src/lib/data/admin.ts) before calling anything here — this client does not
 * check permissions itself.
 *
 * SUPABASE_SERVICE_ROLE_KEY is intentionally left unset in .env.example; a
 * missing key disables invite-by-email (with a clear error) rather than
 * silently falling back to anything less privileged.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Inviting users requires SUPABASE_SERVICE_ROLE_KEY to be set (Project Settings → API → service_role key). " +
        "Add it to your server environment (never NEXT_PUBLIC_*) to enable this."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
