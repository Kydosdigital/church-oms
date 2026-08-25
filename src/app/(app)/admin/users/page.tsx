import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { ATTENDANCE_ROLE_LABELS } from "@/types/domain";
import type { AppUser, AppRole } from "@/types/domain";

type UserRoleRow = {
  role: AppRole;
  branch_id: string | null;
  finance_permission: boolean;
  branches: { name: string } | null;
};
type UserWithRoles = AppUser & { user_roles: UserRoleRow[] };

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("app_users")
    .select("*, user_roles(role, branch_id, finance_permission, branches(name))")
    .order("full_name");
  const userList = (users ?? []) as UserWithRoles[];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Users & roles</h1>
        <p className="text-sm text-muted">
          A person may hold more than one role. Finance visibility is explicit and independent of
          role — an administrator does not automatically see finance data (section 2.1).
        </p>
      </div>

      <div className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
        {userList.map((u) => (
          <div key={u.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{u.full_name}</p>
                <p className="text-sm text-muted">{u.email}</p>
              </div>
              {!u.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(u.user_roles ?? []).map((r, i) => (
                <Badge key={i}>
                  {ATTENDANCE_ROLE_LABELS[r.role] ?? r.role}
                  {r.branches?.name ? ` · ${r.branches.name}` : " · all branches"}
                  {r.finance_permission ? " · finance" : ""}
                </Badge>
              ))}
              {(u.user_roles ?? []).length === 0 && <span className="text-sm text-muted">No roles assigned yet</span>}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted">
        Inviting new users and editing role/branch assignments from this screen is planned for the
        next implementation pass — the user_roles table, its RLS policies, and the finance_permission
        flag are already in place in supabase/migrations.
      </p>
    </div>
  );
}
