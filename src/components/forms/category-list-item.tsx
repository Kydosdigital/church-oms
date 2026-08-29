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
  localeCode,
  cumulativeReceived,
}: {
  category: OfferingCategory & { fundraising_projects: FundraisingProject[] };
  currencyCode: string;
  localeCode: string;
  cumulativeReceived?: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const project = category.fundraising_projects?.[0];

  async function toggle() {
    setPending(true);
    setError(null);
    try {
      if (category.active) await deactivateOfferingCategory(category.id);
      else await reactivateOfferingCategory(category.id);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update this category");
    } finally {
      setPending(false);
    }
  }

  const progress = project ? projectProgressPercent(cumulativeReceived ?? 0, project.target_amount) : null;

  return (
    <div className="p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{category.name}</p>
          <Badge>{category.category_type}</Badge>
          {!category.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
          {category.is_default && <Badge>Default</Badge>}
        </div>
        {category.description && <p className="text-sm text-muted mt-1">{category.description}</p>}
        {project && (
          <p className="text-xs text-muted mt-1">
            {project.target_amount ? (
              <>
                Target {formatCurrency(project.target_amount, currencyCode, localeCode)} · {formatPercent(progress)} achieved
              </>
            ) : (
              "No target set"
            )}
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-danger" aria-live="polite">
            {error}
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={toggle} disabled={pending}>
        {pending
          ? category.active
            ? "Deactivating…"
            : "Reactivating…"
          : category.active
            ? "Deactivate"
            : "Reactivate"}
      </Button>
    </div>
  );
}
