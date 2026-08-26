import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type CounterSessionDbRow = Tables<"attendance_counter_sessions">;
type CounterEntryDbRow = Tables<"attendance_counter_entries">;

export type CounterSessionRow = Omit<CounterSessionDbRow, "status"> & {
  status: "open" | "closed";
};

export type CounterEntryRow = Omit<CounterEntryDbRow, "status"> & {
  status: "counting" | "submitted";
  user_name: string;
};

export async function getLiveCounterForProgramme(programmeId: string): Promise<{
  session: CounterSessionRow | null;
  entries: CounterEntryRow[];
}> {
  const supabase = await createClient();

  const { data: session, error: sessionError } = await supabase
    .from("attendance_counter_sessions")
    .select("*")
    .eq("programme_id", programmeId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) return { session: null, entries: [] };

  const { data: entries, error: entriesError } = await supabase
    .from("attendance_counter_entries")
    .select("id, session_id, user_id, count, status, submitted_at, created_at, updated_at")
    .eq("session_id", session.id)
    .order("created_at");

  if (entriesError) throw entriesError;

  const rawEntries = (entries ?? []).map((entry) => ({
    ...entry,
    status: entry.status === "submitted" ? ("submitted" as const) : ("counting" as const),
  }));
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
    session: {
      ...session,
      status: session.status === "closed" ? "closed" : "open",
    },
    entries: rawEntries.map((entry) => ({
      ...entry,
      user_name: userNames.get(entry.user_id) ?? "Usher",
    })),
  };
}
