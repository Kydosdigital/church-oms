import { createClient } from "@/lib/supabase/server";
import { PermissionContext } from "@/lib/permissions";
import type { AppUser, UserRoleAssignment } from "@/types/domain";

export interface CurrentUserContext {
  user: AppUser;
  roles: UserRoleAssignment[];
  permissions: PermissionContext;
}

/** Loads the signed-in user's profile + role assignments and builds a
 * PermissionContext for gating UI. Returns null if not signed in. */
export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) return null;

  const { data: roles } = await supabase
    .from("user_roles")
    .select("*")
    .eq("user_id", authUser.id);

  const roleList = (roles ?? []) as UserRoleAssignment[];

  return {
    user: profile as AppUser,
    roles: roleList,
    permissions: new PermissionContext(roleList),
  };
}
