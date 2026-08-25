"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  totalAttendance,
  exceedsCapacity,
  outcomesExceedAttendance,
} from "@/lib/calculations";
import type { ProgrammeEntryValues } from "@/lib/validations/programme";
import type { ProgrammeOccurrence, AttendanceRecord } from "@/types/domain";

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

export async function listProgrammes(branchId?: string): Promise<ProgrammeListRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("programme_occurrences")
    .select("*, attendance_records(total_attendance)")
    .order("programme_date", { ascending: false })
    .limit(50);
  if (branchId) query = query.eq("branch_id", branchId);
  const { data } = await query;
  return (data ?? []) as unknown as ProgrammeListRow[];
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
