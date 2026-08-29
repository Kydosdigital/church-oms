"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deactivateOfferingCategory, reactivateOfferingCategory } from "@/lib/data/revenue";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectSettingsForm } from "@/components/forms/project-settings-form";
import { formatCurrency, formatPercent, projectProgressPercent } from "@/lib/calculations";
import { formatChurchDate } from "@/lib/locales";
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

  const progress =
    project && cumulativeReceived !== undefined
      ? projectProgressPercent(cumulativeReceived, project.target_amount)
      : null;

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{category.name}</p>
          <Badge>{category.category_type}</Badge>
          {!category.active && <Badge className="bg-surface-border/60 text-muted">Inactive</Badge>}
          {category.is_default && <Badge>Default</Badge>}
          {project?.accepting_entries_after_end_override && (
            <Badge className="bg-warning/10 text-warning">
              After-end override enabled
            </Badge>
          )}
        </div>
        {category.description && <p className="text-sm text-muted mt-1">{category.description}</p>}
        {project && (
          <div className="mt-1 space-y-1 text-xs text-muted">
            <p>
              {project.target_amount ? (
                cumulativeReceived === undefined ? (
                  <>
                    Target {formatCurrency(project.target_amount, currencyCode, localeCode)} ·
                    progress hidden without finance-history access
                  </>
                ) : (
                  <>
                    Target {formatCurrency(project.target_amount, currencyCode, localeCode)} ·{" "}
                    {formatPercent(progress)} achieved
                  </>
                )
              ) : (
                "No target set"
              )}
            </p>
            <p>
              Project window:{" "}
              {project.start_date
                ? formatChurchDate(project.start_date, localeCode)
                : "No start date"}{" "}
              →{" "}
              {project.end_date
                ? formatChurchDate(project.end_date, localeCode)
                : "No end date"}
            </p>
          </div>
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

      {project && (
        <ProjectSettingsForm
          categoryId={category.id}
          project={project}
          currencyCode={currencyCode}
        />
      )}
    </div>
  );
}
