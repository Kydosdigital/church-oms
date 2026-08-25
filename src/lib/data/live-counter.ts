import { createClient } from "@/lib/supabase/server";

export interface CounterSessionRow {
  id: string;
  programme_id: string;
  church_id: string;
  branch_id: string;
  status: "open" | "closed";
  opened_by: string;
  opened_at: string;
  closed_by: string | null;
  closed_at: string | null;
  updated_at: string;
}

export interface CounterEntryRow {
  id: string;
  session_id: string;
  user_id: string;
  count: number;
  status: "counting" | "submitted";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  user_name: string;
}

export async function getLiveCounterForProgramme(programmeId: string): Promise<{
  session: CounterSessionRow | null;
  entries: CounterEntryRow[];
}> {
  const supabase = await createClient();
  const db = supabase as any;

  const { data: session, error: sessionError } = await db
    .from("attendance_counter_sessions")
    .select("*")
    .eq("programme_id", programmeId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return { session: null, entries: [] };

  const { data: entries, error: entriesError } = await db
    .from("attendance_counter_entries")
    .select("id, session_id, user_id, count, status, submitted_at, created_at, updated_at")
    .eq("session_id", session.id)
    .order("created_at");

  if (entriesError) throw entriesError;

  const rawEntries = (entries ?? []) as Omit<CounterEntryRow, "user_name">[];
  const userIds = Array.from(new Set(rawEntries.map((entry) => entry.user_id)));

  let userNames = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("app_users")
      .select("id, full_name")
      .in("id", userIds);
    userNames = new Map((users ?? []).map((user) => [user.id, user.full_name]));
  }

  return {
    session: session as CounterSessionRow,
    entries: rawEntries.map((entry) => ({
      ...entry,
      user_name: userNames.get(entry.user_id) ?? "Usher",
    })),
  };
}
