"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameServiceType, setServiceTypeActive } from "@/lib/data/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ServiceType } from "@/types/domain";

export function ServiceTypeListItem({ serviceType }: { serviceType: ServiceType }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(serviceType.name);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await renameServiceType(serviceType.id, name);
      setEditing(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function toggleActive() {
    setPending(true);
    try {
      await setServiceTypeActive(serviceType.id, !serviceType.active);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 w-48" />
        <Button size="sm" onClick={save} disabled={pending}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="flex items-center gap-2">
        {serviceType.name}
        {!serviceType.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
      </span>
      <span className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Rename
        </Button>
        <Button size="sm" variant="ghost" onClick={toggleActive} disabled={pending}>
          {serviceType.active ? "Deactivate" : "Reactivate"}
        </Button>
      </span>
    </div>
  );
}
