import { notFound } from "next/navigation";
import { getProgramme } from "@/lib/data/programmes";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { listActiveCategories, getRevenueForProgramme } from "@/lib/data/revenue";
import { RevenueEntryForm } from "@/components/forms/revenue-entry-form";

export default async function RevenueEntryPage(props: PageProps<"/revenue/[programmeId]">) {
  const { programmeId } = await props.params;
  const result = await getProgramme(programmeId);
  if (!result) notFound();
  const { programme } = result;

  const ctx = await getCurrentUserContext();
  const supabase = await createClient();
  const { data: church } = await supabase.from("churches").select("currency_code").eq("id", programme.church_id).single();

  const [categories, entries] = await Promise.all([
    listActiveCategories(),
    getRevenueForProgramme(programmeId),
  ]);

  const financeState = entries[0]?.state ?? "draft";

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">{programme.programme_name}</h1>
      <p className="text-sm text-muted mb-6">{programme.programme_date}</p>

      <RevenueEntryForm
        programmeId={programmeId}
        categories={categories}
        existingEntries={entries}
        financeState={financeState}
        currencyCode={church?.currency_code ?? "USD"}
        canEnter={ctx?.permissions.canEnterFinance(programme.branch_id) ?? false}
        canVerify={ctx?.permissions.canVerifyFinance(programme.branch_id) ?? false}
        canReopen={ctx?.permissions.isAdministrator() ?? false}
      />
    </div>
  );
}
