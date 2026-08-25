"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBranch, setBranchActive } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { VenueForm } from "@/components/forms/venue-form";
import { VenueListItem } from "@/components/forms/venue-list-item";
import type { BranchWithVenuesRow } from "@/lib/data/admin";

export function BranchListItem({ branch }: { branch: BranchWithVenuesRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(branch.name);
  const [isPrimary, setIsPrimary] = useState(branch.is_primary);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await updateBranch(branch.id, { name, is_primary: isPrimary });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save branch");
    } finally {
      setPending(false);
    }
  }

  async function toggleActive() {
    setPending(true);
    try {
      await setBranchActive(branch.id, !branch.active);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-48" />
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} className="h-4 w-4" />
              Primary
            </label>
            <Button size="sm" onClick={save} disabled={pending}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
        ) : (
          <CardTitle className="flex items-center gap-2">
            {branch.name}
            {branch.is_primary && <span className="text-xs text-muted font-normal">(primary)</span>}
            {!branch.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
            <span className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={toggleActive} disabled={pending}>
                {branch.active ? "Deactivate" : "Reactivate"}
              </Button>
            </span>
          </CardTitle>
        )}
      </CardHeader>
      {error && <p className="text-sm text-danger">{error}</p>}

      <ul className="text-sm space-y-1 divide-y divide-surface-border/60">
        {(branch.venues ?? []).map((v) => (
          <VenueListItem key={v.id} venue={v} />
        ))}
        {(branch.venues ?? []).length === 0 && <li className="text-muted py-1">No venues yet.</li>}
      </ul>

      <VenueForm branchId={branch.id} />
    </Card>
  );
}
