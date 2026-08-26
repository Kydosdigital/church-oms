"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { CounterEntryRow, CounterSessionRow } from "@/lib/data/live-counter";

interface LiveCounterProps {
  programmeId: string;
  programmeName: string;
  programmeDate: string;
  currentUserId: string;
  currentUserName: string;
  recordedAttendanceTotal: number;
  initialSession: CounterSessionRow | null;
  initialEntries: CounterEntryRow[];
  canCount: boolean;
  canOpen: boolean;
  canReview: boolean;
  canClose: boolean;
}

export function LiveCounter({
  programmeId,
  programmeName,
  programmeDate,
  currentUserId,
  currentUserName,
  recordedAttendanceTotal,
  initialSession,
  initialEntries,
  canCount,
  canOpen,
  canReview,
  canClose,
}: LiveCounterProps) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<CounterSessionRow | null>(initialSession);
  const [entries, setEntries] = useState<CounterEntryRow[]>(initialEntries);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingWrites, setPendingWrites] = useState(0);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [closing, setClosing] = useState(false);

  const ownEntry = entries.find((entry) => entry.user_id === currentUserId);
  const liveTotal = entries.reduce((sum, entry) => sum + entry.count, 0);
  const submittedEntries = entries.filter((entry) => entry.status === "submitted");
  const submittedTotal = submittedEntries.reduce((sum, entry) => sum + entry.count, 0);
  const countingEntries = entries.filter((entry) => entry.status === "counting");
  const difference = submittedTotal - recordedAttendanceTotal;
  const sessionOpen = session?.status === "open";
  const ownSubmitted = ownEntry?.status === "submitted";

  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`attendance-counter:${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_counter_entries",
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = payload.old?.id;
            setEntries((current) => current.filter((entry) => entry.id !== oldId));
            return;
          }

          const rawRow = payload.new;
          const row: Omit<CounterEntryRow, "user_name"> = {
            id: rawRow.id,
            session_id: rawRow.session_id,
            user_id: rawRow.user_id,
            count: rawRow.count,
            status: rawRow.status === "submitted" ? "submitted" : "counting",
            submitted_at: rawRow.submitted_at,
            created_at: rawRow.created_at,
            updated_at: rawRow.updated_at,
          };

          setEntries((current) => {
            // Match by user as well as id so the first database INSERT replaces
            // the temporary optimistic row instead of double-counting it.
            const existing = current.find(
              (entry) => entry.id === row.id || entry.user_id === row.user_id
            );
            if (existing) {
              return current.map((entry) =>
                entry.id === existing.id
                  ? {
                      ...entry,
                      ...row,
                      id: row.id,
                      user_name:
                        row.user_id === currentUserId
                          ? currentUserName
                          : entry.user_name,
                    }
                  : entry
              );
            }

            return [
              ...current,
              {
                ...row,
                user_name:
                  row.user_id === currentUserId ? currentUserName : "Usher",
              },
            ];
          });

          if (
            payload.eventType === "INSERT" &&
            canReview &&
            row.user_id !== currentUserId
          ) {
            void supabase
              .from("app_users")
              .select("full_name")
              .eq("id", row.user_id)
              .maybeSingle()
              .then(({ data }) => {
                if (!data?.full_name) return;
                setEntries((current) =>
                  current.map((entry) =>
                    entry.user_id === row.user_id
                      ? { ...entry, user_name: data.full_name }
                      : entry
                  )
                );
              });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "attendance_counter_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const rawSession = payload.new as Partial<CounterSessionRow>;
          setSession((current) => {
            if (!current) return current;
            return {
              ...current,
              ...rawSession,
              status: rawSession.status === "closed" ? "closed" : "open",
            };
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session?.id, supabase, canReview, currentUserId, currentUserName]);

  async function refreshEntries(sessionId: string) {
    const { data, error: queryError } = await supabase
      .from("attendance_counter_entries")
      .select(
        "id, session_id, user_id, count, status, submitted_at, created_at, updated_at"
      )
      .eq("session_id", sessionId)
      .order("created_at");

    if (queryError) {
      setError(queryError.message);
      return;
    }

    setEntries((current) => {
      const names = new Map(current.map((entry) => [entry.user_id, entry.user_name]));
      return (data ?? []).map((entry) => ({
        ...entry,
        status: entry.status === "submitted" ? ("submitted" as const) : ("counting" as const),
        user_name:
          entry.user_id === currentUserId
            ? currentUserName
            : names.get(entry.user_id) ?? "Usher",
      }));
    });
  }

  async function openCounter() {
    if (!canOpen) return;
    const wasExisting = Boolean(session);
    setStarting(true);
    setError(null);
    setNotice(null);

    const { data, error: rpcError } = await supabase.rpc(
      "open_attendance_counter",
      { p_programme_id: programmeId }
    );
    setStarting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    const nextSession: CounterSessionRow = {
      ...data,
      status: data.status === "closed" ? "closed" : "open",
    };
    setSession(nextSession);
    await refreshEntries(nextSession.id);
    setNotice(wasExisting ? "Live counter reopened." : "Live counter started.");
  }

  function adjust(delta: 1 | -1) {
    if (!session || session.status !== "open" || !canCount) return;
    if (ownEntry?.status === "submitted") return;
    if (delta < 0 && (ownEntry?.count ?? 0) <= 0) return;

    setError(null);
    setNotice(null);
    setEntries((current) => {
      const existing = current.find((entry) => entry.user_id === currentUserId);
      if (existing) {
        return current.map((entry) =>
          entry.user_id === currentUserId
            ? {
                ...entry,
                count: Math.max(0, entry.count + delta),
                updated_at: new Date().toISOString(),
              }
            : entry
        );
      }

      const now = new Date().toISOString();
      return [
        ...current,
        {
          id: `optimistic-${currentUserId}`,
          session_id: session.id,
          user_id: currentUserId,
          count: Math.max(0, delta),
          status: "counting",
          submitted_at: null,
          created_at: now,
          updated_at: now,
          user_name: currentUserName,
        },
      ];
    });

    // Do not disable the large tap target while saving. Each adjustment is an
    // atomic database increment, so rapid taps from the same usher are safe.
    setPendingWrites((value) => value + 1);
    void (async () => {
      try {
        const { error: rpcError } = await supabase.rpc("increment_attendance_counter", {
          p_session_id: session.id,
          p_delta: delta,
        });
        if (rpcError) {
          setError(rpcError.message);
          await refreshEntries(session.id);
        }
      } finally {
        setPendingWrites((value) => Math.max(0, value - 1));
      }
    })();
  }

  async function submitCount() {
    if (!session || pendingWrites > 0) return;
    setSubmitting(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc(
      "submit_attendance_counter",
      { p_session_id: session.id }
    );
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.user_id === currentUserId
          ? {
              ...entry,
              count: Number(data ?? entry.count),
              status: "submitted",
              submitted_at: new Date().toISOString(),
            }
          : entry
      )
    );
    setNotice("Your count has been submitted.");
  }

  async function resumeCount() {
    if (!session) return;
    setSubmitting(true);
    setError(null);

    const { error: rpcError } = await supabase.rpc(
      "resume_attendance_counter",
      { p_session_id: session.id }
    );
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.user_id === currentUserId
          ? { ...entry, status: "counting", submitted_at: null }
          : entry
      )
    );
    setNotice("Your count is editable again.");
  }

  async function closeCounter() {
    if (!session || !canClose || countingEntries.length > 0) return;
    setClosing(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc(
      "close_attendance_counter",
      { p_session_id: session.id }
    );
    setClosing(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    setSession((current) =>
      current
        ? {
            ...current,
            status: "closed",
            closed_at: new Date().toISOString(),
          }
        : current
    );
    setNotice(
      `Counter closed with ${Number(data ?? submittedTotal).toLocaleString()} submitted attendees.`
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand">Live attendance</p>
          <h1 className="text-2xl font-semibold">{programmeName}</h1>
          <p className="text-sm text-muted">{programmeDate}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            sessionOpen
              ? "bg-success/10 text-success"
              : "bg-surface-border text-muted"
          }`}
        >
          {session ? (sessionOpen ? "Live" : "Closed") : "Not started"}
        </span>
      </div>

      {error && (
        <div className="rounded-brand border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-brand border border-success/30 bg-success/5 p-3 text-sm text-success">
          {notice}
        </div>
      )}

      {!sessionOpen && canOpen && (
        <Card className="text-center">
          <CardHeader>
            <CardTitle>
              {session ? "Reopen live counter" : "Start live counter"}
            </CardTitle>
          </CardHeader>
          <p className="mx-auto mb-4 max-w-lg text-sm text-muted">
            Each usher gets an individual tap counter. Church OMS combines every
            usher&apos;s number into one live total while keeping the individual
            submissions for review.
          </p>
          <Button onClick={openCounter} disabled={starting}>
            {starting
              ? "Starting…"
              : session
                ? "Reopen counter"
                : "Start counter"}
          </Button>
        </Card>
      )}

      {session && (
        <div
          className={`grid gap-4 ${
            canCount ? "lg:grid-cols-[1.15fr_0.85fr]" : ""
          }`}
        >
          {canCount && (
            <Card className="overflow-hidden">
              <div className="text-center">
                <p className="text-sm font-medium text-muted">MY COUNT</p>
                <p
                  aria-live="polite"
                  className="mt-2 text-7xl font-bold tracking-tight tabular-nums sm:text-8xl"
                >
                  {ownEntry?.count ?? 0}
                </p>
                <p className="mt-2 text-xs text-muted">
                  {ownSubmitted
                    ? "Submitted and locked"
                    : pendingWrites > 0
                      ? "Saving taps…"
                      : "Saved"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => adjust(1)}
                disabled={!sessionOpen || ownSubmitted}
                className="mt-6 flex min-h-56 w-full select-none items-center justify-center rounded-brand bg-brand px-6 text-4xl font-bold text-brand-foreground shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-64"
              >
                + TAP TO COUNT
              </button>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => adjust(-1)}
                  disabled={
                    !sessionOpen || ownSubmitted || (ownEntry?.count ?? 0) === 0
                  }
                >
                  Undo last tap
                </Button>
                {ownSubmitted ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resumeCount}
                    disabled={!sessionOpen || submitting}
                  >
                    {submitting ? "Resuming…" : "Resume counting"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={submitCount}
                    disabled={!sessionOpen || submitting || pendingWrites > 0}
                  >
                    {submitting
                      ? "Submitting…"
                      : pendingWrites > 0
                        ? "Saving taps…"
                        : "Submit my count"}
                  </Button>
                )}
              </div>
            </Card>
          )}

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Combined live count</CardTitle>
              </CardHeader>
              <p
                aria-live="polite"
                className="text-5xl font-bold tabular-nums text-brand"
              >
                {liveTotal.toLocaleString()}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-brand bg-surface-border/30 p-3">
                  <p className="text-xs text-muted">Submitted total</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {submittedTotal.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-brand bg-surface-border/30 p-3">
                  <p className="text-xs text-muted">Ushers</p>
                  <p className="mt-1 text-xl font-semibold">{entries.length}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">
                {submittedEntries.length} submitted · {countingEntries.length} still
                counting
              </p>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reconciliation</CardTitle>
              </CardHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Recorded attendance</span>
                  <strong>{recordedAttendanceTotal.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted">Submitted door count</span>
                  <strong>{submittedTotal.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between gap-4 border-t border-surface-border pt-2">
                  <span className="text-muted">Difference</span>
                  <strong
                    className={difference === 0 ? "text-success" : "text-warning"}
                  >
                    {difference > 0 ? "+" : ""}
                    {difference.toLocaleString()}
                  </strong>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">
                Door counts stay separate from the men, women, teenagers and
                children breakdown so the verifier can reconcile them without
                losing detail.
              </p>
            </Card>
          </div>
        </div>
      )}

      {session && canReview && (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Usher breakdown</CardTitle>
              <p className="mt-1 text-sm text-muted">
                Individual counts are retained for review and accountability.
              </p>
            </div>
            {canClose && sessionOpen && (
              <Button
                variant="outline"
                onClick={closeCounter}
                disabled={
                  closing ||
                  submittedEntries.length === 0 ||
                  countingEntries.length > 0
                }
              >
                {closing ? "Closing…" : "Close counter"}
              </Button>
            )}
          </div>

          {canClose && sessionOpen && countingEntries.length > 0 && (
            <p className="mt-3 text-xs text-warning">
              {countingEntries.length} usher counter(s) still need to submit before
              this service can be closed.
            </p>
          )}

          <div className="mt-4 divide-y divide-surface-border">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-medium">{entry.user_name}</p>
                  <p className="text-xs text-muted">
                    {entry.status === "submitted" ? "Submitted" : "Counting now"}
                  </p>
                </div>
                <p className="text-2xl font-semibold tabular-nums">
                  {entry.count.toLocaleString()}
                </p>
              </div>
            ))}
            {entries.length === 0 && (
              <p className="py-5 text-sm text-muted">
                No usher has started counting yet.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
