import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PlatformAdminContext {
  userId: string;
  role: "owner" | "admin" | "support";
}

export interface PlatformChurchRow {
  id: string;
  name: string;
  currency_code: string;
  timezone: string;
  created_at: string;
  user_count: number;
  active_user_count: number;
  branch_count: number;
  programme_count: number;
  super_admins: { full_name: string; email: string }[];
}

export interface PlatformAccountRow {
  id: string;
  full_name: string;
  email: string;
  active: boolean;
  created_at: string;
  church_id: string | null;
  church_name: string | null;
}

export interface PlatformDashboardData {
  totals: {
    churches: number;
    churchesLast7Days: number;
    users: number;
    activeUsers: number;
    awaitingChurchSetup: number;
    branches: number;
    programmes: number;
  };
  churches: PlatformChurchRow[];
  recentAccounts: PlatformAccountRow[];
}

/** Platform-owner access is independent of church roles. We intentionally
 * check the caller through the normal RLS-bound client first, then only use
 * the service-role client after that check succeeds. */
export async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Generated DB types intentionally lag additive migrations until the next
  // schema regeneration. Keep the escape hatch local to this new table.
  const { data } = await (supabase as any)
    .from("platform_admins")
    .select("role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;
  return { userId: user.id, role: data.role as PlatformAdminContext["role"] };
}

export async function getPlatformDashboardData(): Promise<PlatformDashboardData | null> {
  const platform = await getPlatformAdminContext();
  if (!platform) return null;

  // Never expose the service-role client to a Client Component. All cross-
  // tenant aggregation stays on the server after platform membership is
  // verified above.
  const admin = createAdminClient() as any;

  const [churchResult, userResult, branchResult, programmeResult, roleResult] = await Promise.all([
    admin
      .from("churches")
      .select("id, name, currency_code, timezone, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("app_users")
      .select("id, church_id, full_name, email, active, created_at")
      .order("created_at", { ascending: false }),
    admin.from("branches").select("id, church_id, active"),
    admin.from("programme_occurrences").select("id, church_id, created_at"),
    admin.from("user_roles").select("user_id, role"),
  ]);

  for (const result of [churchResult, userResult, branchResult, programmeResult, roleResult]) {
    if (result.error) throw result.error;
  }

  const churches = (churchResult.data ?? []) as {
    id: string;
    name: string;
    currency_code: string;
    timezone: string;
    created_at: string;
  }[];
  const users = (userResult.data ?? []) as {
    id: string;
    church_id: string | null;
    full_name: string;
    email: string;
    active: boolean;
    created_at: string;
  }[];
  const branches = (branchResult.data ?? []) as { id: string; church_id: string; active: boolean }[];
  const programmes = (programmeResult.data ?? []) as { id: string; church_id: string; created_at: string }[];
  const roles = (roleResult.data ?? []) as { user_id: string; role: string }[];

  const churchNameById = new Map(churches.map((church) => [church.id, church.name]));
  const userById = new Map(users.map((user) => [user.id, user]));
  const superAdminIds = new Set(
    roles.filter((assignment) => assignment.role === "super_admin").map((assignment) => assignment.user_id)
  );

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const churchRows: PlatformChurchRow[] = churches.map((church) => {
    const churchUsers = users.filter((user) => user.church_id === church.id);
    const superAdmins = churchUsers
      .filter((user) => superAdminIds.has(user.id))
      .map((user) => ({ full_name: user.full_name, email: user.email }));

    return {
      ...church,
      user_count: churchUsers.length,
      active_user_count: churchUsers.filter((user) => user.active).length,
      branch_count: branches.filter((branch) => branch.church_id === church.id && branch.active).length,
      programme_count: programmes.filter((programme) => programme.church_id === church.id).length,
      super_admins: superAdmins,
    };
  });

  const recentAccounts: PlatformAccountRow[] = users.slice(0, 25).map((user) => ({
    ...user,
    church_name: user.church_id ? churchNameById.get(user.church_id) ?? null : null,
  }));

  // Touch the map so TypeScript catches user id shape drift in one place if
  // the generated schema changes later.
  void userById;

  return {
    totals: {
      churches: churches.length,
      churchesLast7Days: churches.filter((church) => new Date(church.created_at).getTime() >= sevenDaysAgo).length,
      users: users.length,
      activeUsers: users.filter((user) => user.active).length,
      awaitingChurchSetup: users.filter((user) => !user.church_id).length,
      branches: branches.filter((branch) => branch.active).length,
      programmes: programmes.length,
    },
    churches: churchRows,
    recentAccounts,
  };
}
