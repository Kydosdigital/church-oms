import { listUsersWithRoles } from "@/lib/data/admin";
import { getReferenceData } from "@/lib/data/reference";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { InviteUserForm } from "@/components/forms/invite-user-form";
import { UserAdminItem } from "@/components/forms/user-admin-item";

export default async function UsersAdminPage() {
  const [userList, { branches }, ctx] = await Promise.all([
    listUsersWithRoles(),
    getReferenceData(),
    getCurrentUserContext(),
  ]);

  const canAssignSuperAdmin = ctx?.permissions.canAssignSuperAdmin() ?? false;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Users & roles</h1>
        <p className="text-sm text-muted">
          Invite staff and key volunteers into this church with their first role already assigned.
          A person may hold more than one role, and finance visibility remains explicit.
        </p>
        {canAssignSuperAdmin && (
          <p className="text-sm text-muted mt-2">
            As a Super Admin, you can also grant Super Admin access. Super Admins have full church-wide
            access and can appoint another Super Admin.
          </p>
        )}
      </div>

      <InviteUserForm branches={branches} canAssignSuperAdmin={canAssignSuperAdmin} />

      <div className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
        {userList.map((u) => (
          <UserAdminItem
            key={u.id}
            user={u}
            branches={branches}
            canAssignSuperAdmin={canAssignSuperAdmin}
          />
        ))}
        {userList.length === 0 && <p className="p-4 text-sm text-muted">No users yet.</p>}
      </div>
    </div>
  );
}
