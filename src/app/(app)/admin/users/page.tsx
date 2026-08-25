import { listUsersWithRoles } from "@/lib/data/admin";
import { getReferenceData } from "@/lib/data/reference";
import { InviteUserForm } from "@/components/forms/invite-user-form";
import { UserAdminItem } from "@/components/forms/user-admin-item";

export default async function UsersAdminPage() {
  const [userList, { branches }] = await Promise.all([listUsersWithRoles(), getReferenceData()]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Users & roles</h1>
        <p className="text-sm text-muted">
          A person may hold more than one role. Finance visibility is explicit and independent of
          role — an administrator does not automatically see finance data (section 2.1).
        </p>
      </div>

      <InviteUserForm />

      <div className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
        {userList.map((u) => (
          <UserAdminItem key={u.id} user={u} branches={branches} />
        ))}
        {userList.length === 0 && <p className="p-4 text-sm text-muted">No users yet.</p>}
      </div>
    </div>
  );
}
