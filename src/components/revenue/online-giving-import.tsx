"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  importOnlineGivingBatchAction,
  type OnlineGivingImportInput,
} from "@/lib/data/online-giving";
import {
  parseOnlineGivingCsv,
  type ParsedOnlineGivingCsv,
} from "@/lib/online-giving-csv";
import { formatCurrency } from "@/lib/calculations";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function OnlineGivingImport({
  branchId,
  branchName,
  currencyCode,
  localeCode,
}: {
  branchId: string;
  branchName: string;
  currencyCode: string;
  localeCode: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceName, setSourceName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedOnlineGivingCsv | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function chooseFile(nextFile: File | null) {
    setError(null);
    setNotice(null);
    setFile(nextFile);
    setPreview(null);

    if (!nextFile) return;

    try {
      const text = await nextFile.text();
      setPreview(parseOnlineGivingCsv(text, localeCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this CSV file.");
    }
  }

  async function importFile() {
    if (!file || !preview) {
      setError("Choose a valid CSV file first.");
      return;
    }

    if (sourceName.trim().length < 2) {
      setError("Enter the payment or bank source for this file.");
      return;
    }

    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const input: OnlineGivingImportInput = {
        branch_id: branchId,
        source_name: sourceName.trim(),
        file_name: file.name,
        transactions: preview.rows,
      };

      await importOnlineGivingBatchAction(input);

      setNotice(
        `Imported ${preview.rows.length.toLocaleString(localeCode)} transactions for ${branchName}.`
      );
      setFile(null);
      setPreview(null);
      setSourceName("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The statement could not be imported.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="online-source">Payment / bank source</Label>
          <Input
            id="online-source"
            value={sourceName}
            onChange={(event) => setSourceName(event.target.value)}
            placeholder="e.g. Stripe, Church bank"
            maxLength={80}
          />
        </div>

        <div>
          <Label htmlFor="online-file">CSV statement</Label>
          <Input
            ref={fileRef}
            id="online-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <p className="text-xs text-muted">
        Required columns: <strong>date</strong> and <strong>amount</strong>. Optional:
        reference and external_id. Dates may use YYYY-MM-DD or your church&rsquo;s
        regional day/month format.
      </p>

      {preview && (
        <div className="rounded-brand border border-surface-border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {preview.rows.length.toLocaleString(localeCode)} transactions ready
              </p>
              <p className="text-sm text-muted">
                Statement total:{" "}
                {formatCurrency(preview.total, currencyCode, localeCode)}
              </p>
            </div>
            <Button type="button" onClick={importFile} disabled={pending}>
              {pending ? "Importing…" : "Import statement"}
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">External ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {preview.rows.slice(0, 5).map((row, index) => (
                  <tr key={row.external_id ?? `${row.transaction_date}-${index}`}>
                    <td className="py-2">{row.transaction_date}</td>
                    <td className="py-2 text-right">
                      {formatCurrency(row.amount, currencyCode, localeCode)}
                    </td>
                    <td className="py-2">{row.reference ?? "—"}</td>
                    <td className="py-2 text-muted">{row.external_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.rows.length > 5 && (
              <p className="mt-2 text-xs text-muted">
                Previewing the first 5 rows. All {preview.rows.length.toLocaleString(localeCode)} rows
                will be imported.
              </p>
            )}
          </div>
        </div>
      )}

      <div aria-live="polite">
        {error && <p className="text-sm text-danger">{error}</p>}
        {notice && !error && <p className="text-sm text-brand">{notice}</p>}
      </div>
    </div>
  );
}
