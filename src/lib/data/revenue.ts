"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fundraisingProjectAcceptsProgrammeDate } from "@/lib/fundraising";
import {
  fundraisingProjectSettingsSchema,
  offeringCategorySchema,
  type FundraisingProjectSettingsValues,
} from "@/lib/validations/revenue";
import type { OfferingCategory, RevenueEntry, FundraisingProject } from "@/types/domain";

type OfferingCategoryWithAvailability = OfferingCategory & {
  offering_category_service_types: { service_type_id: string }[];
  fundraising_projects:
    | Pick<
        FundraisingProject,
        "start_date" | "end_date" | "accepting_entries_after_end_override"
      >
    | null;
};

export async function listActiveCategories(
  serviceTypeId: string,
  programmeDate: string,
  includeCategoryIds: string[] = []
): Promise<OfferingCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("offering_categories")
    .select(
      "*, offering_category_service_types(service_type_id), fundraising_projects(start_date,end_date,accepting_entries_after_end_override)"
    )
    .order("category_type")
    .order("name");

  if (error) throw error;

  const includeSet = new Set(includeCategoryIds);

  return ((data ?? []) as unknown as OfferingCategoryWithAvailability[])
    .filter((category) => {
      // A category already used on this programme stays visible for legitimate
      // correction even if it is later deactivated or its project window closes.
      if (includeSet.has(category.id)) return true;
      if (!category.active) return false;

      const serviceMatches =
        category.applies_to_all_service_types ||
        category.offering_category_service_types.some(
          (scope) => scope.service_type_id === serviceTypeId
        );
      if (!serviceMatches) return false;

      if (category.category_type === "project") {
        return fundraisingProjectAcceptsProgrammeDate(
          category.fundraising_projects,
          programmeDate
        );
      }

      return true;
    })
    .map(
      ({
        offering_category_service_types: _scope,
        fundraising_projects: _project,
        ...category
      }) => category as OfferingCategory
    );
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
  accepting_entries_after_end_override?: boolean;
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

  input = offeringCategorySchema.parse(input);

  const { data: profile } = await supabase
    .from("app_users")
    .select("church_id")
    .eq("id", user.id)
    .single();
  if (!profile?.church_id) throw new Error("User is not assigned to a church yet");

  const scopedServiceTypeIds = input.applies_to_all_service_types
    ? []
    : Array.from(new Set(input.service_type_ids ?? []));

  if (!input.applies_to_all_service_types && scopedServiceTypeIds.length === 0) {
    throw new Error("Select at least one service type for this offering category");
  }

  if (scopedServiceTypeIds.length > 0) {
    const { data: serviceTypes, error: serviceTypeError } = await supabase
      .from("service_types")
      .select("id")
      .in("id", scopedServiceTypeIds)
      .eq("active", true);

    if (serviceTypeError) throw serviceTypeError;
    if ((serviceTypes ?? []).length !== scopedServiceTypeIds.length) {
      throw new Error("One or more selected service types are not available in this church");
    }
  }

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

  try {
    if (scopedServiceTypeIds.length > 0) {
      const { error: scopeError } = await supabase
        .from("offering_category_service_types")
        .insert(
          scopedServiceTypeIds.map((service_type_id) => ({
            category_id: category.id,
            service_type_id,
          }))
        );
      if (scopeError) throw scopeError;
    }

    if (input.category_type === "project") {
      const { error: projectError } = await supabase
        .from("fundraising_projects")
        .insert({
          category_id: category.id,
          target_amount: input.target_amount || null,
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          accepting_entries_after_end_override:
            input.accepting_entries_after_end_override ?? false,
        });
      if (projectError) throw projectError;
    }
  } catch (childError) {
    const { error: cleanupError } = await supabase
      .from("offering_categories")
      .delete()
      .eq("id", category.id);

    if (cleanupError) {
      const originalMessage =
        childError instanceof Error ? childError.message : "unknown setup error";
      throw new Error(
        `Could not finish category setup: ${originalMessage}. The partial category also could not be cleaned up.`
      );
    }

    throw childError;
  }

  revalidatePath("/admin/categories");
  return category;
}

export async function updateFundraisingProjectSettings(
  categoryId: string,
  input: FundraisingProjectSettingsValues
) {
  const values = fundraisingProjectSettingsSchema.parse(input);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fundraising_projects")
    .update({
      target_amount: values.target_amount ?? null,
      start_date: values.start_date || null,
      end_date: values.end_date || null,
      accepting_entries_after_end_override:
        values.accepting_entries_after_end_override,
    })
    .eq("category_id", categoryId)
    .select("id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Fundraising project settings were not found");

  revalidatePath("/admin/categories");
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
