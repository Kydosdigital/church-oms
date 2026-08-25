import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { RecordState } from "@/types/domain";

const stateStyles: Record<RecordState, string> = {
  draft: "bg-surface-border/60 text-foreground",
  submitted: "bg-info/15 text-info",
  returned: "bg-danger/15 text-danger",
  verified: "bg-success/15 text-success",
  reopened: "bg-warning/15 text-warning",
};

/** Status badges always pair color with a text label — color is never the
 * only signal (section 8.3 accessibility requirement). */
export const StateBadge = ({ state }: { state: RecordState }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
      stateStyles[state]
    )}
  >
    {state.charAt(0).toUpperCase() + state.slice(1)}
  </span>
);

export const Badge = ({ className, ...props }: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-brand-muted text-brand",
      className
    )}
    {...props}
  />
);
