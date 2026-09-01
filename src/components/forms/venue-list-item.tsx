"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateVenue, setVenueActive } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Venue } from "@/types/domain";

export function VenueListItem({ venue }: { venue: Venue }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(venue.name);
  const [capacity, setCapacity] = useState(String(venue.default_capacity));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await updateVenue(venue.id, { name, default_capacity: Number(capacity) });
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save venue");
    } finally {
      setPending(false);
    }
  }

  async function toggleActive() {
    setPending(true);
    try {
      await setVenueActive(venue.id, !venue.active);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 py-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-40" />
        <Input
          aria-label="Default capacity"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="h-9 w-28"
        />
        <Button size="sm" onClick={save} disabled={pending}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
        <p className="text-xs text-muted w-full">Capacity changes apply to future programmes; existing programme snapshots stay unchanged.</p>
        {error && <p className="text-sm text-danger w-full">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 py-1">
      <span className="flex items-center gap-2">
        {venue.name}
        {!venue.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
      </span>
      <span className="flex items-center gap-3">
        <span className="text-muted">Default capacity {venue.default_capacity}</span>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={toggleActive} disabled={pending}>
          {venue.active ? "Deactivate" : "Reactivate"}
        </Button>
      </span>
    </li>
  );
}