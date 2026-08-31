"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ignoreOnlineGivingTransactionAction,
  matchOnlineGivingTransactionAction,
  searchReconciliationProgrammesAction,
  unmatchOnlineGivingTransactionAction,
  type OnlineGivingTransaction,
  type ReconciliationCategoryOption,
  type ReconciliationProgrammeOption,
} from "@/lib/data/online-giving";
import { formatCurrency } from "@/lib/calculations";
import { formatChurchDate } from "@/lib/locales";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function OnlineGivingTransactionRow({
  transaction,
  programmes,
  categories,
  currencyCode,
  localeCode,
}: {
  transaction: OnlineGivingTransaction;
  programmes: ReconciliationProgrammeOption[];
  categories: ReconciliationCategoryOption[];
  currencyCode: string;
  localeCode: string;
}) {
  const router = useRouter();
  const suggestedProgramme = useMemo(
    () =>
      programmes.find(
        (programme) => programme.programme_date === transaction.transaction_date
      )?.id ?? "",
    [programmes, transaction.transaction_date]
  );
  const [programmeId, setProgrammeId] = useState(suggestedProgramme);
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceResults, setServiceResults] = useState<
    ReconciliationProgrammeOption[]
  >([]);
  const [serviceSearching, setServiceSearching] = useState(false);
  const [serviceSearchMessage, setServiceSearchMessage] = useState<string | null>(
    null
  );
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [ignoreReason, setIgnoreReason] = useState("");
  const [showIgnore, setShowIgnore] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableProgrammes = useMemo(() => {
    const options = new Map(
      programmes.map((programme) => [programme.id, programme])
    );
    for (const programme of serviceResults) {
      options.set(programme.id, programme);
    }
    return Array.from(options.values()).sort(
      (a, b) =>
        b.programme_date.localeCompare(a.programme_date) ||
        a.programme_name.localeCompare(b.programme_name)
    );
  }, [programmes, serviceResults]);

  const matchedProgramme = availableProgrammes.find(
    (programme) => programme.id === transaction.matched_programme_id
  );
  const matchedCategory = categories.find(
    (category) => category.id === transaction.matched_category_id
  );

  async function searchServices() {
    const query = serviceSearch.trim();
    if (query.length < 2) {
      setServiceSearchMessage("Enter at least 2 letters from the service name.");
      return;
    }

    setServiceSearching(true);
    setServiceSearchMessage(null);
    setError(null);
    try {
      const results = await searchReconciliationProgrammesAction(
        transaction.branch_id,
        query
      );
      setServiceResults(results);
      setServiceSearchMessage(
        results.length === 0
          ? "No matching services found."
          : `Found ${results.length} service${results.length === 1 ? "" : "s"}. Choose one above.`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not search older services."
      );
    } finally {
      setServiceSearching(false);
    }
  }

  async function matchTransaction() {
    if (!programmeId) {
      setError("Choose the service this transaction belongs to.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await matchOnlineGivingTransactionAction({
        transaction_id: transaction.id,
        programme_id: programmeId,
        category_id: categoryId || null,
        note: note.trim() || null,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not match this transaction.");
    } finally {
      setPending(false);
    }
  }

  async function restoreTransaction() {
    setPending(true);
    setError(null);
    try {
      await unmatchOnlineGivingTransactionAction(transaction.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not restore this transaction.");
    } finally {
      setPending(false);
    }
  }

  async function ignoreTransaction() {
    if (ignoreReason.trim().length < 3) {
      setError("Add a short reason before ignoring this transaction.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await ignoreOnlineGivingTransactionAction(
        transaction.id,
        ignoreReason.trim()
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not ignore this transaction.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 border-b border-surface-border p-4 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {formatCurrency(transaction.amount, currencyCode, localeCode)}
          </p>
          <p className="text-sm text-muted">
            {formatChurchDate(transaction.transaction_date, localeCode)}
            {transaction.reference ? ` · ${transaction.reference}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted">
            {transaction.source_name}
            {transaction.external_id ? ` · ID ${transaction.external_id}` : ""}
          </p>
        </div>

        <span className="rounded-full bg-surface-border/50 px-2.5 py-1 text-xs font-medium capitalize">
          {transaction.status}
        </span>
      </div>

      {transaction.status === "unmatched" && (
        <div className="grid gap-3 rounded-brand bg-surface-border/20 p-3 lg:grid-cols-2">
          <div>
            <Label htmlFor={`programme-${transaction.id}`}>Match to service</Label>
            <select
              id={`programme-${transaction.id}`}
              value={programmeId}
              onChange={(event) => setProgrammeId(event.target.value)}
              className="block h-11 w-full rounded-brand border border-surface-border bg-background px-3 text-sm"
            >
              <option value="">Choose service</option>
              {availableProgrammes.map((programme) => (
                <option key={programme.id} value={programme.id}>
                  {formatChurchDate(programme.programme_date, localeCode)} ·{" "}
                  {programme.programme_name}
                </option>
              ))}
            </select>
            <div className="mt-2 flex flex-wrap gap-2">
              <Input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Search older services by name"
                maxLength={80}
                className="min-w-56 flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={searchServices}
                disabled={pending || serviceSearching}
              >
                {serviceSearching ? "Searching…" : "Search older services"}
              </Button>
            </div>
            {serviceSearchMessage && (
              <p className="mt-1 text-xs text-muted">{serviceSearchMessage}</p>
            )}
          </div>

          <div>
            <Label htmlFor={`category-${transaction.id}`}>
              Offering category (optional)
            </Label>
            <select
              id={`category-${transaction.id}`}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="block h-11 w-full rounded-brand border border-surface-border bg-background px-3 text-sm"
            >
              <option value="">Whole service / not classified</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <Label htmlFor={`note-${transaction.id}`}>Match note (optional)</Label>
            <Input
              id={`note-${transaction.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Sunday online offering"
              maxLength={500}
            />
          </div>

          <div className="flex flex-wrap gap-2 lg:col-span-2">
            <Button type="button" size="sm" onClick={matchTransaction} disabled={pending}>
              {pending ? "Saving…" : "Match transaction"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowIgnore((shown) => !shown)}
              disabled={pending}
            >
              Ignore instead
            </Button>
          </div>

          {showIgnore && (
            <div className="space-y-2 rounded-brand border border-warning/30 bg-warning/5 p-3 lg:col-span-2">
              <Label htmlFor={`ignore-${transaction.id}`}>Reason to ignore</Label>
              <Input
                id={`ignore-${transaction.id}`}
                value={ignoreReason}
                onChange={(event) => setIgnoreReason(event.target.value)}
                placeholder="e.g. Transfer between church accounts"
                maxLength={500}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={ignoreTransaction}
                disabled={pending || ignoreReason.trim().length < 3}
              >
                {pending ? "Saving…" : "Confirm ignore"}
              </Button>
            </div>
          )}
        </div>
      )}

      {transaction.status === "matched" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-brand bg-success/5 p-3">
          <div className="text-sm">
            <p>
              Matched to{" "}
              <span className="font-medium">
                {matchedProgramme?.programme_name ?? "service"}
              </span>
              {matchedCategory ? ` · ${matchedCategory.name}` : ""}
            </p>
            {transaction.match_note && (
              <p className="mt-1 text-xs text-muted">{transaction.match_note}</p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={restoreTransaction}
            disabled={pending}
          >
            {pending ? "Restoring…" : "Unmatch"}
          </Button>
        </div>
      )}

      {transaction.status === "ignored" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-brand bg-surface-border/20 p-3">
          <div className="text-sm">
            <p className="font-medium">Excluded from reconciliation</p>
            <p className="text-xs text-muted">
              {transaction.match_note ?? "No reason recorded"}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={restoreTransaction}
            disabled={pending}
          >
            {pending ? "Restoring…" : "Restore to unmatched"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
