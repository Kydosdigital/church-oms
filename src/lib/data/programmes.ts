"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  ProgrammeCorrectionValues,
  ProgrammeEntryValues,
} from "@/lib/validations/programme";
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

/** Creates the programme header, attendance row, guest-minister links and,
 * optionally, the attendance submission in one PostgreSQL statement. The RPC
 * is SECURITY INVOKER, so the caller's normal grants and RLS remain active. */
async function createProgrammeEntry(
  values: ProgrammeEntryValues,
  submit: boolean
): Promise<ProgrammeOccurrence> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc(
    "create_programme_entry" as never,
    {
      p_entry: values,
      p_submit: submit,
    } as never
  );

  if (error) throw error;
  if (!data) throw new Error("Programme creation did not return a record");

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object" || !("id" in result)) {
    throw new Error("Programme creation returned an invalid record");
  }

  revalidatePath("/programmes");
  return result as unknown as ProgrammeOccurrence;
}

export async function createDraftProgramme(values: ProgrammeEntryValues) {
  return createProgrammeEntry(values, false);
}

export async function createAndSubmitProgramme(values: ProgrammeEntryValues) {
  return createProgrammeEntry(values, true);
}

export async function updateProgrammeEntryAction(
  programmeId: string,
  expectedVersion: number,
  values: ProgrammeCorrectionValues,
  submit: boolean
): Promise<ProgrammeOccurrence> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc(
    "update_programme_entry" as never,
    {
      p_programme_id: programmeId,
      p_expected_version: expectedVersion,
      p_entry: values,
      p_submit: submit,
    } as never
  );

  if (error) throw error;
  if (!data) throw new Error("Programme correction did not return a record");

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object" || !("id" in result)) {
    throw new Error("Programme correction returned an invalid record");
  }

  revalidatePath(`/programmes/${programmeId}`);
  revalidatePath("/programmes");
  return result as unknown as ProgrammeOccurrence;
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
