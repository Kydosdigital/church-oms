"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveRevenueEntries, submitFinanceAction, verifyFinanceAction, returnFinanceAction, reopenFinanceAction } from "@/lib/data/revenue";
import { categoryTotal, formatCurrency } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { StateBadge } from "@/components/ui/badge";
import type { OfferingCategory, RevenueEntry, RecordState } from "@/types/domain";

interface Props {
  programmeId: string;
  categories: OfferingCategory[];
  existingEntries: RevenueEntry[];
  financeState: RecordState;
  currencyCode: string;
  canEnter: boolean;
  canVerify: boolean;
  canReopen: boolean;
}

export function RevenueEntryForm({
  programmeId,
  categories,
  existingEntries,
  financeState,
  currencyCode,
  canEnter,
  canVerify,
  canReopen,
}: Props) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, { physical: string; online: string }>>(() => {
    const map: Record<string, { physical: string; online: string }> = {};
    for (const cat of categories) {
      const existing = existingEntries.find((e) => e.category_id === cat.id);
      map[cat.id] = {
        physical: existing ? String(existing.physical_amount) : "0",
        online: existing ? String(existing.online_amount) : "0",
      };
    }
    return map;
  });
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = financeState === "submitted" || financeState === "verified";
  const overallTotal = categories.reduce((sum, cat) => {
    const a = amounts[cat.id];
    return sum + categoryTotal(Number(a?.physical || 0), Number(a?.online || 0));
  }, 0);

  async function handleSave() {
    setPending(true);
    setError(null);
    try {
      await saveRevenueEntries(
        programmeId,
        categories.map((cat) => ({
          category_id: cat.id,
          physical_amount: Number(amounts[cat.id]?.physical || 0),
          online_amount: Number(amounts[cat.id]?.online || 0),
        }))
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save revenue entries");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit() {
    setPending(true);
    setError(null);
    try {
      await handleSave();
      await submitFinanceAction(programmeId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit finance record");
    } finally {
      setPending(false);
    }
  }

  async function handleVerify() {
    setPending(true);
    try {
      await verifyFinanceAction(programmeId);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not verify");
    } finally {
      setPending(false);
    }
  }

  async function handleReturn() {
    setPending(true);
    try {
      await returnFinanceAction(programmeId, reason);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not return");
    } finally {
      setPending(false);
    }
  }

  async function handleReopen() {
    setPending(true);
    try {
      await reopenFinanceAction(programmeId, reason);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reopen");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Offerings</h2>
        <StateBadge state={financeState} />
      </div>

      <div className="space-y-3">
        {categories.map((cat) => {
          const a = amounts[cat.id] ?? { physical: "0", online: "0" };
          const rowTotal = categoryTotal(Number(a.physical || 0), Number(a.online || 0));
          return (
            <div key={cat.id} className="rounded-brand border border-surface-border p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{cat.name}</p>
                <p className="text-sm text-muted">{formatCurrency(rowTotal, currencyCode)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`physical-${cat.id}`}>Physical</Label>
                  <input
                    id={`physical-${cat.id}`}
                    type="number"
                    min={0}
                    step="0.01"
                    disabled={!canEnter || locked}
                    value={a.physical}
                    onChange={(e) =>
                      setAmounts((prev) => ({ ...prev, [cat.id]: { ...prev[cat.id], physical: e.target.value } }))
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
                    disabled={!canEnter || locked}
                    value={a.online}
                    onChange={(e) =>
                      setAmounts((prev) => ({ ...prev, [cat.id]: { ...prev[cat.id], online: e.target.value } }))
                    }
                    className="block w-full rounded-brand border border-surface-border bg-background h-11 px-3"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-brand bg-brand-muted px-4 py-3">
        <span className="text-sm font-medium text-brand">Programme total</span>
        <span className="text-2xl font-bold text-brand">{formatCurrency(overallTotal, currencyCode)}</span>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {canEnter && !locked && (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleSave} disabled={pending}>Save</Button>
          <Button onClick={handleSubmit} disabled={pending}>Sign & submit</Button>
        </div>
      )}

      {financeState === "submitted" && canVerify && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button onClick={handleVerify} disabled={pending}>Verify</Button>
          </div>
          <Textarea placeholder="Reason for returning (required)…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button variant="danger" size="sm" onClick={handleReturn} disabled={pending || reason.trim().length < 3}>
            Return for correction
          </Button>
        </div>
      )}

      {financeState === "verified" && canReopen && (
        <div className="space-y-2">
          <Textarea placeholder="Reason for reopening (required)…" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button variant="danger" size="sm" onClick={handleReopen} disabled={pending || reason.trim().length < 3}>
            Reopen
          </Button>
        </div>
      )}
    </div>
  );
}
