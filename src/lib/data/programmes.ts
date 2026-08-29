"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  totalAttendance,
  exceedsCapacity,
  outcomesExceedAttendance,
} from "@/lib/calculations";
import type { ProgrammeEntryValues } from "@/lib/validations/programme";
import type { ProgrammeOccurrence, AttendanceRecord, RecordState } from "@/types/domain";

export interface ProgrammeWithAttendance {
  programme: ProgrammeOccurrence;
  attendance: AttendanceRecord;
}

export async function getProgramme(id: string): Promise<ProgrammeWithAttendance | null> {
  const supabase = await createClient();
  const { data: programme } = await supabase
    .from("programme_occurrences")
    .select("*")
    .eq("id", id)
    .single();
  if (!programme) return null;

  const { data: attendance } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("programme_id", id)
    .single();

  return { programme: programme as ProgrammeOccurrence, attendance: attendance as AttendanceRecord };
}

export type ProgrammeListRow = ProgrammeOccurrence & {
  attendance_records: { total_attendance: number }[];
};

export async function listProgrammes(
  branchId?: string,
  filters: { attendanceState?: RecordState; financeState?: RecordState } = {}
): Promise<ProgrammeListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("programme_occurrences")
    .select("*, attendance_records(total_attendance)")
    .order("programme_date", { ascending: false })
    .limit(50);

  if (branchId) query = query.eq("branch_id", branchId);
  if (filters.attendanceState) query = query.eq("state", filters.attendanceState);
  if (filters.financeState) query = query.eq("finance_state", filters.financeState);

  const { data } = await query;
  return (data ?? []) as unknown as ProgrammeListRow[];
}

/** SRV-08: looks for an existing occurrence with the same branch, service
 * type and date. Called from the wizard before submit so the usher gets a
 * friendly warning (with a chance to add an override reason) instead of a
 * raw unique-constraint error from the database. Not a hard block — some
 * churches legitimately run two services of the same type on the same day
 * (e.g. AM/PM), which is exactly why this is a warn-and-override, not a
 * unique constraint on its own. */
export async function checkDuplicateService(
  branchId: string,
  serviceTypeId: string,
  programmeDate: string,
  excludeProgrammeId?: string
): Promise<{ id: string; programme_name: string } | null> {
  if (!branchId || !serviceTypeId || !programmeDate) return null;
  const supabase = await createClient();
  let query = supabase
    .from("programme_occurrences")
    .select("id, programme_name")
    .eq("branch_id", branchId)
    .eq("service_type_id", serviceTypeId)
    .eq("programme_date", programmeDate);
  if (excludeProgrammeId) query = query.neq("id", excludeProgrammeId);
  const { data } = await query.limit(1).maybeSingle();
  return data ?? null;
}

/** Creates a draft programme + its (initially empty) attendance record.
 * SRV-08 duplicate check happens client-side before calling this (warns, does
 * not hard-block) and server-side via the partial unique index as a backstop. */
export async function createDraftProgramme(values: ProgrammeEntryValues) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: venue } = await supabase
    .from("venues")
    .select("default_capacity")
    .eq("id", values.venue_id)
    .single();

  const { data: branch } = await supabase
    .from("branches")
    .select("church_id")
    .eq("id", values.branch_id)
    .single();

  if (!branch) throw new Error("Branch not found");

  const total = totalAttendance(values);
  const capacity = venue?.default_capacity ?? 0;
  const capacityExceeded = exceedsCapacity(total, capacity);
  const outcomesExceeded = outcomesExceedAttendance(values, total);

  if (capacityExceeded && !values.capacity_exception_note) {
    throw new Error("Attendance exceeds venue capacity — add an explanatory note (ATT-07).");
  }
  if (outcomesExceeded && !values.outcome_exception_note) {
    throw new Error("First-timers/converts exceed total attendance — add an explanatory note (ATT-07).");
  }

  // SRV-08 server-side backstop: the wizard already warns and collects an
  // override reason client-side, but re-check here in case of a race (two
  // ushers submitting at once) or a client that skipped the check.
  const duplicate = await checkDuplicateService(values.branch_id, values.service_type_id, values.programme_date);
  if (duplicate && !values.duplicate_override) {
    throw new Error(
      `A ${values.classification === "special_event" ? "programme" : "service"} already exists for this branch, service type and date ("${duplicate.programme_name}"). Confirm this is intentional and add a reason to continue.`
    );
  }
  if (duplicate && values.duplicate_override && !values.duplicate_override_reason) {
    throw new Error("Add a reason for recording a duplicate service on the same day.");
  }

  const { data: programme, error } = await supabase
    .from("programme_occurrences")
    .insert({
      church_id: branch.church_id,
      branch_id: values.branch_id,
      service_type_id: values.service_type_id,
      venue_id: values.venue_id,
      programme_date: values.programme_date,
      programme_name: values.programme_name,
      classification: values.classification,
      preacher_id: values.preacher_id || null,
      sermon_topic: values.sermon_topic || null,
      venue_capacity_snapshot: capacity,
      notes: values.notes || null,
      duplicate_override: Boolean(duplicate && values.duplicate_override),
      duplicate_override_reason: duplicate && values.duplicate_override ? values.duplicate_override_reason || null : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  if (values.guest_minister_ids.length > 0) {
    await supabase.from("programme_guest_ministers").insert(
      values.guest_minister_ids.map((minister_id) => ({ programme_id: programme.id, minister_id }))
    );
  }

  await supabase.from("attendance_records").insert({
    programme_id: programme.id,
    men_count: values.men_count,
    women_count: values.women_count,
    teenagers_count: values.teenagers_count,
    children_count: values.children_count,
    first_timers_count: values.first_timers_count,
    converts_count: values.converts_count,
    new_births_count: values.new_births_count,
    weddings_count: values.weddings_count,
    capacity_exception_note: values.capacity_exception_note || null,
    outcome_exception_note: values.outcome_exception_note || null,
  });

  revalidatePath("/programmes");
  return programme as ProgrammeOccurrence;
}

export async function updateDraftAttendance(programmeId: string, values: ProgrammeEntryValues) {
  const supabase = await createClient();

  const { data: programme } = await supabase
    .from("programme_occurrences")
    .select("venue_capacity_snapshot")
    .eq("id", programmeId)
    .single();

  const total = totalAttendance(values);
  const capacity = programme?.venue_capacity_snapshot ?? 0;

  if (exceedsCapacity(total, capacity) && !values.capacity_exception_note) {
    throw new Error("Attendance exceeds venue capacity — add an explanatory note (ATT-07).");
  }
  if (outcomesExceedAttendance(values, total) && !values.outcome_exception_note) {
    throw new Error("First-timers/converts exceed total attendance — add an explanatory note (ATT-07).");
  }

  await supabase
    .from("programme_occurrences")
    .update({
      programme_name: values.programme_name,
      classification: values.classification,
      preacher_id: values.preacher_id || null,
      sermon_topic: values.sermon_topic || null,
      notes: values.notes || null,
    })
    .eq("id", programmeId);

  await supabase
    .from("attendance_records")
    .update({
      men_count: values.men_count,
      women_count: values.women_count,
      teenagers_count: values.teenagers_count,
      children_count: values.children_count,
      first_timers_count: values.first_timers_count,
      converts_count: values.converts_count,
      new_births_count: values.new_births_count,
      weddings_count: values.weddings_count,
      capacity_exception_note: values.capacity_exception_note || null,
      outcome_exception_note: values.outcome_exception_note || null,
    })
    .eq("programme_id", programmeId);

  revalidatePath(`/programmes/${programmeId}`);
}

export async function submitAttendanceAction(programmeId: string, expectedVersion: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_attendance", {
    p_programme_id: programmeId,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  revalidatePath(`/programmes/${programmeId}`);
}

export async function verifyAttendanceAction(programmeId: string, expectedVersion: number) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("verify_attendance", {
    p_programme_id: programmeId,
    p_expected_version: expectedVersion,
  });
  if (error) throw error;
  revalidatePath(`/programmes/${programmeId}`);
}

export async function returnAttendanceAction(programmeId: string, expectedVersion: number, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("return_attendance", {
    p_programme_id: programmeId,
    p_expected_version: expectedVersion,
    p_reason: reason,
  });
  if (error) throw error;
  revalidatePath(`/programmes/${programmeId}`);
}

export async function reopenAttendanceAction(programmeId: string, reason: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_attendance", {
    p_programme_id: programmeId,
    p_reason: reason,
  });
  if (error) throw error;
  revalidatePath(`/programmes/${programmeId}`);
}
