"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  verifyAttendanceAction,
  returnAttendanceAction,
  reopenAttendanceAction,
} from "@/lib/data/programmes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import type { RecordState } from "@/types/domain";

export function VerificationActions({
  programmeId,
  version,
  state,
  canVerify,
  canReopen,
}: {
  programmeId: string;
  version: number;
  state: RecordState;
  canVerify: boolean;
  canReopen: boolean;
}) {
  const router = useRouter();
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    setPending(true);
    setError(null);
    try {
      await verifyAttendanceAction(programmeId, version);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify record");
    } finally {
      setPending(false);
    }
  }

  async function handleReturn() {
    setPending(true);
    setError(null);
    try {
      await returnAttendanceAction(programmeId, version, reason);
      setShowReturnForm(false);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not return record");
    } finally {
      setPending(false);
    }
  }

  async function handleReopen() {
    setPending(true);
    setError(null);
    try {
      await reopenAttendanceAction(programmeId, reason);
      setShowReopenForm(false);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reopen record");
    } finally {
      setPending(false);
    }
  }

  const statusMessage =
    state === "submitted"
      ? canVerify
        ? "Review the submitted attendance below, then verify it or return it for correction."
        : "This attendance record has been submitted and is waiting for an Attendance Verifier."
      : state === "verified"
        ? "This attendance record is verified and locked. Reopening requires an Administrator and a reason."
        : state === "returned"
          ? "This record was returned for correction and must be resubmitted after the changes are made."
          : state === "reopened"
            ? "This verified record was reopened for correction and must be submitted through the workflow again."
            : "This record is still a draft and has not been digitally signed.";

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{statusMessage}</p>
      {error && <p className="text-sm text-danger">{error}</p>}

      {state === "submitted" && canVerify && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleVerify} disabled={pending}>
            {pending ? "Verifying…" : "Verify"}
          </Button>
          <Button variant="outline" onClick={() => setShowReturnForm((s) => !s)} disabled={pending}>
            Return for correction
          </Button>
        </div>
      )}

      {showReturnForm && (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason for returning this record (required)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button size="sm" variant="danger" onClick={handleReturn} disabled={pending || reason.trim().length < 3}>
            {pending ? "Returning…" : "Confirm return"}
          </Button>
        </div>
      )}

      {state === "verified" && canReopen && (
        <Button variant="outline" onClick={() => setShowReopenForm((s) => !s)} disabled={pending}>
          Reopen record
        </Button>
      )}

      {showReopenForm && (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason for reopening this verified record (required)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button size="sm" variant="danger" onClick={handleReopen} disabled={pending || reason.trim().length < 3}>
            {pending ? "Reopening…" : "Confirm reopen"}
          </Button>
        </div>
      )}
    </div>
  );
}
