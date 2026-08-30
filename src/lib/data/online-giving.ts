"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserContext } from "@/lib/data/current-user";
import type { Database, Json } from "@/types/database";

type OnlineGivingBatch =
  Database["public"]["Tables"]["online_giving_batches"]["Row"];
export type OnlineGivingTransaction =
  Database["public"]["Tables"]["online_giving_transactions"]["Row"];

export interface ReconciliationBranch {
  id: string;
  name: string;
}

export interface ReconciliationProgrammeOption {
  id: string;
  programme_name: string;
  programme_date: string;
  finance_state: string;
}

export interface ReconciliationCategoryOption {
  id: string;
  name: string;
}

export interface ProgrammeReconciliationSummary {
  programme_id: string;
  programme_name: string;
  programme_date: string;
  finance_state: string;
  recorded_online: number;
  matched_imported: number;
  variance: number;
  matched_transaction_count: number;
}

export interface OnlineGivingReconciliationData {
  transactions: OnlineGivingTransaction[];
  batches: OnlineGivingBatch[];
  programmes: ReconciliationProgrammeOption[];
  categories: ReconciliationCategoryOption[];
  summary: ProgrammeReconciliationSummary[];
}

export type ReconciliationStatus = "all" | "unmatched" | "matched" | "ignored";

async function getAuthorizedBranch(branchId: string) {
  const ctx = await getCurrentUserContext();
  if (!ctx?.user.active || !ctx.user.church_id) {
    throw new Error("Not authorized");
  }

  if (!ctx.permissions.hasFinanceHistoryPermission(branchId)) {
    throw new Error("Finance-history permission is required for reconciliation");
  }

  const supabase = await createClient();
  const { data: branch } = await supabase
    .from("branches")
    .select("id, name")
    .eq("id", branchId)
    .eq("active", true)
    .maybeSingle();

  if (!branch) {
    throw new Error("This branch is not available for reconciliation");
  }

  return { supabase, ctx, branch };
}

export async function listReconciliationBranches(): Promise<ReconciliationBranch[]> {
  const ctx = await getCurrentUserContext();
  if (!ctx?.user.active || !ctx.user.church_id) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name")
    .eq("active", true)
    .order("name");

  if (error) throw error;

  return (data ?? []).filter((branch) =>
    ctx.permissions.hasFinanceHistoryPermission(branch.id)
  );
}

async function fetchAllMatchedTotals(branchId: string) {
  const supabase = await createClient();
  const totals = new Map<string, { amount: number; count: number }>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("online_giving_transactions")
      .select("matched_programme_id, amount")
      .eq("branch_id", branchId)
      .eq("status", "matched")
      .not("matched_programme_id", "is", null)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    for (const row of data ?? []) {
      if (!row.matched_programme_id) continue;
      const current = totals.get(row.matched_programme_id) ?? {
        amount: 0,
        count: 0,
      };
      current.amount += Number(row.amount);
      current.count += 1;
      totals.set(row.matched_programme_id, current);
    }

    if ((data ?? []).length < pageSize) break;
  }

  return totals;
}

async function fetchAllRecordedOnlineTotals(branchId: string) {
  const supabase = await createClient();
  const totals = new Map<string, number>();
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("revenue_entries")
      .select(
        "programme_id, online_amount, programme_occurrences!inner(branch_id)"
      )
      .eq("programme_occurrences.branch_id", branchId)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    for (const row of data ?? []) {
      totals.set(
        row.programme_id,
        (totals.get(row.programme_id) ?? 0) + Number(row.online_amount)
      );
    }

    if ((data ?? []).length < pageSize) break;
  }

  return totals;
}

async function buildProgrammeSummary(branchId: string) {
  const [matchedTotals, recordedTotals] = await Promise.all([
    fetchAllMatchedTotals(branchId),
    fetchAllRecordedOnlineTotals(branchId),
  ]);

  const ids = Array.from(
    new Set([...matchedTotals.keys(), ...recordedTotals.keys()])
  );

  if (ids.length === 0) return [];

  const supabase = await createClient();
  const programmes: ReconciliationProgrammeOption[] = [];

  for (let index = 0; index < ids.length; index += 200) {
    const chunk = ids.slice(index, index + 200);
    const { data, error } = await supabase
      .from("programme_occurrences")
      .select("id, programme_name, programme_date, finance_state")
      .eq("branch_id", branchId)
      .in("id", chunk);

    if (error) throw error;
    programmes.push(...(data ?? []));
  }

  return programmes
    .map((programme) => {
      const recorded = recordedTotals.get(programme.id) ?? 0;
      const matched = matchedTotals.get(programme.id) ?? { amount: 0, count: 0 };
      const variance = Math.round((matched.amount - recorded) * 100) / 100;

      return {
        programme_id: programme.id,
        programme_name: programme.programme_name,
        programme_date: programme.programme_date,
        finance_state: programme.finance_state,
        recorded_online: Math.round(recorded * 100) / 100,
        matched_imported: Math.round(matched.amount * 100) / 100,
        variance,
        matched_transaction_count: matched.count,
      };
    })
    .sort((a, b) => b.programme_date.localeCompare(a.programme_date));
}

export async function getOnlineGivingReconciliationData(
  branchId: string,
  status: ReconciliationStatus = "unmatched"
): Promise<OnlineGivingReconciliationData> {
  const { supabase } = await getAuthorizedBranch(branchId);

  let transactionQuery = supabase
    .from("online_giving_transactions")
    .select("*")
    .eq("branch_id", branchId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") {
    transactionQuery = transactionQuery.eq("status", status);
  }

  const [
    { data: transactions, error: transactionError },
    { data: batches, error: batchError },
    { data: programmes, error: programmeError },
    { data: categories, error: categoryError },
    summary,
  ] = await Promise.all([
    transactionQuery,
    supabase
      .from("online_giving_batches")
      .select("*")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("programme_occurrences")
      .select("id, programme_name, programme_date, finance_state")
      .eq("branch_id", branchId)
      .order("programme_date", { ascending: false })
      .limit(100),
    supabase.from("offering_categories").select("id, name").order("name"),
    buildProgrammeSummary(branchId),
  ]);

  if (transactionError) throw transactionError;
  if (batchError) throw batchError;
  if (programmeError) throw programmeError;
  if (categoryError) throw categoryError;

  return {
    transactions: transactions ?? [],
    batches: batches ?? [],
    programmes: programmes ?? [],
    categories: categories ?? [],
    summary,
  };
}

export interface OnlineGivingImportInput {
  branch_id: string;
  source_name: string;
  file_name: string;
  file_hash: string;
  transactions: {
    transaction_date: string;
    amount: number;
    reference: string | null;
    external_id: string | null;
  }[];
}

export async function importOnlineGivingBatchAction(
  input: OnlineGivingImportInput
) {
  const { supabase } = await getAuthorizedBranch(input.branch_id);

  const { data, error } = await supabase.rpc("import_online_giving_batch", {
    p_branch_id: input.branch_id,
    p_source_name: input.source_name,
    p_file_name: input.file_name,
    p_file_hash: input.file_hash,
    p_transactions: input.transactions as unknown as Json,
  });

  if (error) throw error;

  revalidatePath("/revenue/reconciliation");
  return data;
}

export async function matchOnlineGivingTransactionAction(input: {
  transaction_id: string;
  programme_id: string;
  category_id?: string | null;
  note?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("match_online_giving_transaction", {
    p_transaction_id: input.transaction_id,
    p_programme_id: input.programme_id,
    p_category_id: input.category_id || undefined,
    p_note: input.note || undefined,
  });

  if (error) throw error;
  revalidatePath("/revenue/reconciliation");
}

export async function unmatchOnlineGivingTransactionAction(
  transactionId: string
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unmatch_online_giving_transaction", {
    p_transaction_id: transactionId,
  });

  if (error) throw error;
  revalidatePath("/revenue/reconciliation");
}

export async function ignoreOnlineGivingTransactionAction(
  transactionId: string,
  reason: string
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("ignore_online_giving_transaction", {
    p_transaction_id: transactionId,
    p_reason: reason,
  });

  if (error) throw error;
  revalidatePath("/revenue/reconciliation");
}
