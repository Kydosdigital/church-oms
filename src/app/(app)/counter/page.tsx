import Link from "next/link";
import { redirect } from "next/navigation";
import { listProgrammes } from "@/lib/data/programmes";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { StateBadge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { formatChurchDate } from "@/lib/locales";

export default async function LiveCounterIndexPage() {
  const [ctx, programmes] = await Promise.all([
    getCurrentUserContext(),
    listProgrammes(),
  ]);

  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: church } = ctx.user.church_id
    ? await supabase
        .from("churches")
        .select("locale_code")
        .eq("id", ctx.user.church_id)
        .single()
    : { data: null };
  const localeCode = church?.locale_code ?? "en-GB";

  const isAdministrator = ctx.permissions.isAdministrator();
  const visible = programmes.filter((programme) =>
    isAdministrator ||
    ctx.permissions.hasRole("usher", programme.branch_id) ||
    ctx.permissions.hasRole("attendance_verifier", programme.branch_id) ||
    ctx.permissions.hasRole("pastor")
  );

  if (!isAdministrator && !ctx.roles.some((role) => ["usher", "attendance_verifier", "pastor"].includes(role.role))) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-brand">Attendance tools</p>
          <h1 className="mt-1 text-2xl font-semibold">Live counter</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Choose a programme, then each usher can count arrivals from their own phone. Church OMS combines every counter in real time.
          </p>
        </div>
        {(ctx.permissions.hasRole("usher") || isAdministrator) && (
          <Link
            href="/programmes/new"
            className={buttonClassName({ variant: "outline" })}
          >
            Create programme
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {visible.map((programme) => {
          const attendance = programme.attendance_records?.[0]?.total_attendance ?? 0;
          return (
            <Card key={programme.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{programme.programme_name}</h2>
                    <StateBadge state={programme.state} />
                  </div>
                  <p className="mt-1 text-sm text-muted">{formatChurchDate(programme.programme_date, localeCode, {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}</p>
                  <p className="mt-2 text-xs text-muted">Recorded attendance: {attendance.toLocaleString(localeCode)}</p>
                </div>
                <Link
                  href={`/programmes/${programme.id}/counter`}
                  className={buttonClassName()}
                >
                  Open counter
                </Link>
              </div>
            </Card>
          );
        })}

        {visible.length === 0 && (
          <Card className="py-10 text-center">
            <p className="font-medium">No programmes yet</p>
            <p className="mt-1 text-sm text-muted">Create a programme first, then its live counter will appear here.</p>
          </Card>
        )}
      </div>
    </div>
  );
}

