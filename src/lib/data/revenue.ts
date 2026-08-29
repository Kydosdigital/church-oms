"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OfferingCategory, RevenueEntry, FundraisingProject } from "@/types/domain";

export async function listActiveCategories(): Promise<OfferingCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offering_categories")
    .select("*")
    .eq("active", true)
    .order("category_type")
    .order("name");
  return (data ?? []) as OfferingCategory[];
}

export async function getRevenueForProgramme(programmeId: string): Promise<RevenueEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("revenue_entries")
    .select("*")
    .eq("programme_id", programmeId);
  return (data ?? []) as RevenueEntry[];
}

/** Returns verified historical revenue totals for the requested categories in
 * one RLS-bound query. Callers should only request this when the current user
 * has finance-history permission; the database remains the final authority. */
export async function getVerifiedRevenueTotalsByCategory(
  categoryIds: string[]
): Promise<Record<string, number>> {
  if (categoryIds.length === 0) return {};

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("revenue_entries")
    .select("category_id, category_total")
    .in("category_id", categoryIds)
    .eq("state", "verified");

  if (error) throw error;

  const totals: Record<string, number> = {};
  for (const entry of data ?? []) {
    totals[entry.category_id] =
      (totals[entry.category_id] ?? 0) + Number(entry.category_total ?? 0);
  }

  return totals;
}

export interface RevenueEntryInput {
  category_id: string;
  physical_amount: number;
  online_amount: number;
  notes?: string;
}

/** Upserts one row per (programme, category) — REV-01..REV-07. Treasurer/
 * Accountant only, enforced by RLS (finance_write policy) not this function. */
export async function saveRevenueEntries(programmeId: string, entries: RevenueEntryInput[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  for (const entry of entries) {
    if (
      !Number.isFinite(entry.physical_amount) ||
      !Number.isFinite(entry.online_amount) ||
      entry.physical_amount < 0 ||
      entry.online_amount < 0
    ) {
      throw new Error("Offering amounts must be valid non-negative numbers");
    }
  }

  const populated = entries.filter(
    (entry) =>
      entry.physical_amount > 0 ||
      entry.online_amount > 0 ||
      Boolean(entry.notes?.trim())
  );
  const clearedCategoryIds = entries
    .filter(
      (entry) =>
        entry.physical_amount === 0 &&
        entry.online_amount === 0 &&
        !entry.notes?.trim()
    )
    .map((entry) => entry.category_id);

  if (populated.length > 0) {
    const { error } = await supabase.from("revenue_entries").upsert(
      populated.map((entry) => ({
        programme_id: programmeId,
        category_id: entry.category_id,
        physical_amount: entry.physical_amount,
        online_amount: entry.online_amount,
        notes: entry.notes?.trim() || null,
        created_by: user.id,
        updated_by: user.id,
      })),
      { onConflict: "programme_id,category_id" }
    );
    if (error) throw error;
  }

  // Clearing an existing category back to zero should really clear it. The old
  // filter-only implementation skipped zero values, which could leave a stale
  // previously-entered amount in the database.
  if (clearedCategoryIds.length > 0) {
    const { error } = await supabase
      .from("revenue_entries")
      .delete()
      .eq("programme_id", programmeId)
      .in("category_id", clearedCategoryIds);
    if (error) throw error;
  }

  revalidatePath(`/revenue/${programmeId}`);
}

export async function submitFinanceAction(programmeId: string, expectedVersion: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_finance", {
    p_programme_id: programmeId,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  revalidatePath(`/revenue/${programmeId}`);
}

export async function verifyFinanceAction(programmeId: string, expectedVersion: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_finance", {
    p_programme_id: programmeId,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  revalidatePath(`/revenue/${programmeId}`);
}

export async function returnFinanceAction(
  programmeId: string,
  expectedVersion: number,
  reason: string
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_finance", {
    p_programme_id: programmeId,
    p_expected_version: expectedVersion,
    p_reason: reason,
  });
  if (error) throw error;
  revalidatePath(`/revenue/${programmeId}`);
}

export async function reopenFinanceAction(
  programmeId: string,
  expectedVersion: number,
  reason: string
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_finance", {
    p_programme_id: programmeId,
    p_expected_version: expectedVersion,
    p_reason: reason,
  });
  if (error) throw error;
  revalidatePath(`/revenue/${programmeId}`);
}

// ----------------------------------------------------------------------------
// Configurable offering categories (admin) — CFG-01..CFG-08
// ----------------------------------------------------------------------------

export interface OfferingCategoryInput {
  name: string;
  description?: string;
  category_type: "general" | "project" | "special";
  applies_to_all_service_types: boolean;
  service_type_ids?: string[];
  target_amount?: number;
  start_date?: string;
  end_date?: string;
}

export type OfferingCategoryWithProject = OfferingCategory & {
  fundraising_projects: FundraisingProject[];
};

export async function listAllCategories(): Promise<OfferingCategoryWithProject[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("offering_categories")
    .select("*, fundraising_projects(*)")
    .order("category_type")
    .order("name");

  // fundraising_projects is a to-one relation (unique FK on category_id) —
  // Supabase returns it as a single object or null; normalize to an array
  // here so the rest of the app can treat every category uniformly.
  return (data ?? []).map((row) => ({
    ...row,
    fundraising_projects: row.fundraising_projects ? [row.fundraising_projects] : [],
  })) as unknown as OfferingCategoryWithProject[];
}

export async function createOfferingCategory(input: OfferingCategoryInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase.from("app_users").select("church_id").eq("id", user.id).single();
  if (!profile?.church_id) throw new Error("User is not assigned to a church yet");

  const { data: category, error } = await supabase
    .from("offering_categories")
    .insert({
      church_id: profile.church_id,
      name: input.name,
      description: input.description || null,
      category_type: input.category_type,
      applies_to_all_service_types: input.applies_to_all_service_types,
    })
    .select()
    .single();
  if (error) throw error;

  if (!input.applies_to_all_service_types && input.service_type_ids?.length) {
    await supabase.from("offering_category_service_types").insert(
      input.service_type_ids.map((service_type_id) => ({ category_id: category.id, service_type_id }))
    );
  }

  if (input.category_type === "project") {
    await supabase.from("fundraising_projects").insert({
      category_id: category.id,
      target_amount: input.target_amount || null,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
    });
  }

  revalidatePath("/admin/categories");
  return category;
}

/** CFG-04: used categories cannot be deleted, only deactivated. */
export async function deactivateOfferingCategory(categoryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("offering_categories").update({ active: false }).eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/admin/categories");
}

export async function reactivateOfferingCategory(categoryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("offering_categories").update({ active: true }).eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/admin/categories");
}

export async function renameOfferingCategory(categoryId: string, name: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("offering_categories").update({ name }).eq("id", categoryId);
  if (error) throw error;
  revalidatePath("/admin/categories");
}
