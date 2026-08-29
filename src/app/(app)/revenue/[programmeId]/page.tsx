import { notFound } from "next/navigation";
import { getProgramme } from "@/lib/data/programmes";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { listActiveCategories, getRevenueForProgramme } from "@/lib/data/revenue";
import { RevenueEntryForm } from "@/components/forms/revenue-entry-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignoffTimeline } from "@/components/workflow/signoff-timeline";
import { formatChurchDate } from "@/lib/locales";
import type { Signoff } from "@/types/domain";

export default async function RevenueEntryPage(props: PageProps<"/revenue/[programmeId]">) {
  const { programmeId } = await props.params;
  const result = await getProgramme(programmeId);
  if (!result) notFound();
  const { programme } = result;

  const ctx = await getCurrentUserContext();
  const supabase = await createClient();
  const { data: church } = await supabase
    .from("churches")
    .select("currency_code, timezone, locale_code")
    .eq("id", programme.church_id)
    .single();

  const [categories, entries, { data: signoffsData }] = await Promise.all([
    listActiveCategories(),
    getRevenueForProgramme(programmeId),
    supabase
      .from("signoffs")
      .select("*, app_users(full_name)")
      .eq("programme_id", programmeId)
      .eq("record_kind", "finance")
      .order("created_at"),
  ]);

  const signoffs = (
    (signoffsData ?? []) as (Signoff & { app_users: { full_name: string } | null })[]
  ).map((signoff) => ({
    ...signoff,
    actor_name: signoff.app_users?.full_name ?? null,
  }));

  return (
    <div className="p-4 sm:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{programme.programme_name}</h1>
        <p className="text-sm text-muted">
          {formatChurchDate(programme.programme_date, church?.locale_code ?? "en-GB")}
        </p>
      </div>

      <RevenueEntryForm
        programmeId={programmeId}
        categories={categories}
        existingEntries={entries}
        financeState={programme.finance_state}
        financeVersion={programme.finance_version}
        currencyCode={church?.currency_code ?? "GBP"}
        localeCode={church?.locale_code ?? "en-GB"}
        canEnter={ctx?.permissions.canEnterFinance(programme.branch_id) ?? false}
        canVerify={ctx?.permissions.canVerifyFinance(programme.branch_id) ?? false}
        canReopen={
          (ctx?.permissions.isAdministrator() ?? false) &&
          (ctx?.permissions.hasFinancePermission(programme.branch_id) ?? false)
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Digital finance sign-off</CardTitle>
          <CardDescription>
            Each workflow action records the authenticated user, church-local timestamp and exact
            finance version. When independent verification is enabled, the submitter and verifier
            are separate people.
          </CardDescription>
        </CardHeader>
        <SignoffTimeline
          signoffs={signoffs}
          timeZone={church?.timezone ?? "UTC"}
          locale={church?.locale_code ?? "en-GB"}
          emptyMessage="This finance record has not been digitally signed yet."
        />
      </Card>
    </div>
  );
}
