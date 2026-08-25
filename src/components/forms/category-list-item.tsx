"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deactivateOfferingCategory, reactivateOfferingCategory } from "@/lib/data/revenue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent, projectProgressPercent } from "@/lib/calculations";
import type { OfferingCategory, FundraisingProject } from "@/types/domain";

export function CategoryListItem({
  category,
  currencyCode,
  cumulativeReceived,
}: {
  category: OfferingCategory & { fundraising_projects: FundraisingProject[] };
  currencyCode: string;
  cumulativeReceived?: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const project = category.fundraising_projects?.[0];

  async function toggle() {
    setPending(true);
    try {
      if (category.active) await deactivateOfferingCategory(category.id);
      else await reactivateOfferingCategory(category.id);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const progress = project ? projectProgressPercent(cumulativeReceived ?? 0, project.target_amount) : null;

  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium">{category.name}</p>
          <Badge>{category.category_type}</Badge>
          {!category.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
          {category.is_default && <Badge>Default</Badge>}
        </div>
        {category.description && <p className="text-sm text-muted mt-1">{category.description}</p>}
        {project && (
          <p className="text-xs text-muted mt-1">
            {project.target_amount ? (
              <>Target {formatCurrency(project.target_amount, currencyCode)} · {formatPercent(progress)} achieved</>
            ) : (
              "No target set"
            )}
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
        {category.active ? "Deactivate" : "Reactivate"}
      </Button>
    </div>
  );
}
