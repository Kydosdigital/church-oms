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
  counts: {
    batches: number;
    unmatched: number;
    matched: number;
    ignored: number;
  };
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

async function buildProgrammeSummary(
  branchId: string
): Promise<ProgrammeReconciliationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "online_giving_programme_summary",
    { p_branch_id: branchId }
  );

  if (error) throw error;

  return (data ?? []).map((row) => ({
    programme_id: row.programme_id,
    programme_name: row.programme_name,
    programme_date: row.programme_date,
    finance_state: row.finance_state,
    recorded_online: Number(row.recorded_online ?? 0),
    matched_imported: Number(row.matched_imported ?? 0),
    variance: Number(row.variance ?? 0),
    matched_transaction_count: Number(row.matched_transaction_count ?? 0),
  }));
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
    { count: batchCount },
    { count: unmatchedCount },
    { count: matchedCount },
    { count: ignoredCount },
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
    supabase
      .from("online_giving_batches")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId),
    supabase
      .from("online_giving_transactions")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId)
      .eq("status", "unmatched"),
    supabase
      .from("online_giving_transactions")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId)
      .eq("status", "matched"),
    supabase
      .from("online_giving_transactions")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId)
      .eq("status", "ignored"),
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
    counts: {
      batches: batchCount ?? 0,
      unmatched: unmatchedCount ?? 0,
      matched: matchedCount ?? 0,
      ignored: ignoredCount ?? 0,
    },
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
