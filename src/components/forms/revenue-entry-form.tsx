"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveFinanceEntrySetAction,
  verifyFinanceAction,
  returnFinanceAction,
  reopenFinanceAction,
} from "@/lib/data/revenue";
import { categoryTotal, formatCurrency } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { StateBadge } from "@/components/ui/badge";
import type { OfferingCategory, RevenueEntry, RecordState } from "@/types/domain";

type PendingAction = "save" | "submit" | "verify" | "return" | "reopen" | null;

interface Props {
  programmeId: string;
  categories: OfferingCategory[];
  existingEntries: RevenueEntry[];
  financeState: RecordState;
  financeVersion: number;
  currencyCode: string;
  localeCode: string;
  canEnter: boolean;
  canVerify: boolean;
  canReopen: boolean;
}

function actionError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  if (message.includes("CONFLICT:")) {
    return "This finance record changed in another session. Refresh the page before trying again.";
  }
  return message;
}

export function RevenueEntryForm({
  programmeId,
  categories,
  existingEntries,
  financeState,
  financeVersion,
  currencyCode,
  localeCode,
  canEnter,
  canVerify,
  canReopen,
}: Props) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, { physical: string; online: string }>>(() => {
    const map: Record<string, { physical: string; online: string }> = {};
    for (const cat of categories) {
      const existing = existingEntries.find((entry) => entry.category_id === cat.id);
      map[cat.id] = {
        physical: existing ? String(existing.physical_amount) : "0",
        online: existing ? String(existing.online_amount) : "0",
      };
    }
    return map;
  });
  const [reason, setReason] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const locked = financeState === "submitted" || financeState === "verified";
  const pending = pendingAction !== null;
  const overallTotal = categories.reduce((sum, cat) => {
    const amount = amounts[cat.id];
    return sum + categoryTotal(Number(amount?.physical || 0), Number(amount?.online || 0));
  }, 0);

  function currentEntries() {
    return categories.map((cat) => ({
      category_id: cat.id,
      physical_amount: Number(amounts[cat.id]?.physical || 0),
      online_amount: Number(amounts[cat.id]?.online || 0),
    }));
  }

  async function persistEntries(submit: boolean) {
    await saveFinanceEntrySetAction(
      programmeId,
      financeVersion,
      currentEntries(),
      submit
    );
  }

  async function handleSave() {
    setPendingAction("save");
    setError(null);
    setNotice(null);
    try {
      await persistEntries(false);
      setNotice("Offering amounts saved.");
      router.refresh();
    } catch (e) {
      setError(actionError(e, "Could not save revenue entries"));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSubmit() {
    setPendingAction("submit");
    setError(null);
    setNotice(null);
    try {
      await persistEntries(true);
      setNotice("Finance record signed and submitted for verification.");
      router.refresh();
    } catch (e) {
      setError(actionError(e, "Could not submit finance record"));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleVerify() {
    setPendingAction("verify");
    setError(null);
    setNotice(null);
    try {
      await verifyFinanceAction(programmeId, financeVersion);
      setNotice("Finance record verified and locked.");
      router.refresh();
    } catch (e) {
      setError(actionError(e, "Could not verify finance record"));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReturn() {
    setPendingAction("return");
    setError(null);
    setNotice(null);
    try {
      await returnFinanceAction(programmeId, financeVersion, reason);
      setReason("");
      setNotice("Finance record returned for correction.");
      router.refresh();
    } catch (e) {
      setError(actionError(e, "Could not return finance record"));
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReopen() {
    setPendingAction("reopen");
    setError(null);
    setNotice(null);
    try {
      await reopenFinanceAction(programmeId, financeVersion, reason);
      setReason("");
      setNotice("Finance record reopened for correction.");
      router.refresh();
    } catch (e) {
      setError(actionError(e, "Could not reopen finance record"));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Offerings</h2>
          <p className="text-xs text-muted">Finance workflow version {financeVersion}</p>
        </div>
        <StateBadge state={financeState} />
      </div>

      {categories.length === 0 ? (
        <div className="rounded-brand border border-surface-border p-4 text-sm text-muted">
          No active offering categories are available for this church yet. An administrator can
          add or reactivate categories under Offering categories.
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const amount = amounts[cat.id] ?? { physical: "0", online: "0" };
            const rowTotal = categoryTotal(
              Number(amount.physical || 0),
              Number(amount.online || 0)
            );
            return (
              <div key={cat.id} className="rounded-brand border border-surface-border p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-sm text-muted">{formatCurrency(rowTotal, currencyCode, localeCode)}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor={`physical-${cat.id}`}>Physical</Label>
                    <input
                      id={`physical-${cat.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      disabled={!canEnter || locked || pending}
                      value={amount.physical}
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [cat.id]: { ...prev[cat.id], physical: e.target.value },
                        }))
                      }
                      className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`online-${cat.id}`}>Online</Label>
                    <input
                      id={`online-${cat.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      disabled={!canEnter || locked || pending}
                      value={amount.online}
                      onChange={(e) =>
                        setAmounts((prev) => ({
                          ...prev,
                          [cat.id]: { ...prev[cat.id], online: e.target.value },
                        }))
                      }
                      className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-brand bg-brand-muted px-4 py-3">
        <span className="text-sm font-medium text-brand">Programme total</span>
        <span className="text-2xl font-bold text-brand">
          {formatCurrency(overallTotal, currencyCode, localeCode)}
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

      {canEnter && !locked && categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleSave} disabled={pending}>
            {pendingAction === "save" ? "Saving…" : "Save"}
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pendingAction === "submit" ? "Signing & submitting…" : "Sign & submit"}
          </Button>
        </div>
      )}

      {financeState === "submitted" && canVerify && (
        <div className="space-y-2">
          <Button onClick={handleVerify} disabled={pending}>
            {pendingAction === "verify" ? "Verifying…" : "Verify"}
          </Button>
          <Textarea
            placeholder="Reason for returning (required)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={pending}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={handleReturn}
            disabled={pending || reason.trim().length < 3}
          >
            {pendingAction === "return" ? "Returning…" : "Return for correction"}
          </Button>
        </div>
      )}

      {financeState === "verified" && canReopen && (
        <div className="space-y-2">
          <Textarea
            placeholder="Reason for reopening (required)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={pending}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={handleReopen}
            disabled={pending || reason.trim().length < 3}
          >
            {pendingAction === "reopen" ? "Reopening…" : "Reopen"}
          </Button>
        </div>
      )}
    </div>
  );
}
