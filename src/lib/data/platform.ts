import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PlatformAdminContext {
  userId: string;
  role: "owner" | "admin" | "support";
}

const platformSnapshotSchema = z.object({
  totals: z.object({
    churches: z.number().int().nonnegative(),
    churches_last_7_days: z.number().int().nonnegative(),
    users: z.number().int().nonnegative(),
    active_users: z.number().int().nonnegative(),
    awaiting_church_setup: z.number().int().nonnegative(),
    branches: z.number().int().nonnegative(),
    programmes: z.number().int().nonnegative(),
    active_churches_30_days: z.number().int().nonnegative(),
  }),
  growth: z.array(
    z.object({
      date: z.string(),
      churches: z.number().int().nonnegative(),
      accounts: z.number().int().nonnegative(),
      programmes: z.number().int().nonnegative(),
    })
  ),
  churches: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      currency_code: z.string(),
      timezone: z.string(),
      created_at: z.string(),
      user_count: z.number().int().nonnegative(),
      active_user_count: z.number().int().nonnegative(),
      branch_count: z.number().int().nonnegative(),
      programme_count: z.number().int().nonnegative(),
      latest_programme_at: z.string().nullable(),
      super_admins: z.array(
        z.object({
          full_name: z.string(),
          email: z.string(),
        })
      ),
    })
  ),
  recent_accounts: z.array(
    z.object({
      id: z.string().uuid(),
      full_name: z.string(),
      email: z.string(),
      active: z.boolean(),
      created_at: z.string(),
      church_id: z.string().uuid().nullable(),
      church_name: z.string().nullable(),
    })
  ),
});

export type PlatformChurchRow = z.infer<
  typeof platformSnapshotSchema.shape.churches.element
>;
export type PlatformAccountRow = z.infer<
  typeof platformSnapshotSchema.shape.recent_accounts.element
>;
export type PlatformGrowthPoint = z.infer<
  typeof platformSnapshotSchema.shape.growth.element
>;

export interface PlatformDashboardData {
  platformRole: PlatformAdminContext["role"];
  totals: {
    churches: number;
    churchesLast7Days: number;
    users: number;
    activeUsers: number;
    awaitingChurchSetup: number;
    branches: number;
    programmes: number;
    activeChurches30Days: number;
  };
  growth: PlatformGrowthPoint[];
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

  const { data } = await supabase
    .from("platform_admins")
    .select("role, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;
  if (data.role !== "owner" && data.role !== "admin" && data.role !== "support") {
    return null;
  }

  return { userId: user.id, role: data.role };
}

export async function getPlatformDashboardData(): Promise<PlatformDashboardData | null> {
  const platform = await getPlatformAdminContext();
  if (!platform) return null;

  // The service-role client is used only after platform membership is proven
  // through the caller's normal RLS-bound session. Cross-tenant aggregation is
  // performed inside PostgreSQL and returns a bounded dashboard projection,
  // rather than downloading every source row into application memory.
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("platform_owner_dashboard_snapshot", {
    p_days: 30,
    p_church_limit: 50,
    p_account_limit: 25,
  });

  if (error) throw error;

  const parsed = platformSnapshotSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      `Platform analytics payload failed validation: ${parsed.error.issues[0]?.message ?? "unknown shape"}`
    );
  }

  const snapshot = parsed.data;

  return {
    platformRole: platform.role,
    totals: {
      churches: snapshot.totals.churches,
      churchesLast7Days: snapshot.totals.churches_last_7_days,
      users: snapshot.totals.users,
      activeUsers: snapshot.totals.active_users,
      awaitingChurchSetup: snapshot.totals.awaiting_church_setup,
      branches: snapshot.totals.branches,
      programmes: snapshot.totals.programmes,
      activeChurches30Days: snapshot.totals.active_churches_30_days,
    },
    growth: snapshot.growth,
    churches: snapshot.churches,
    recentAccounts: snapshot.recent_accounts,
  };
}
