import type { FundraisingProject } from "@/types/domain";

/**
 * Fundraising project availability is based on the programme date, not the
 * current clock date. That keeps historic services stable and makes the
 * configured project window deterministic.
 */
export function fundraisingProjectAcceptsProgrammeDate(
  project: Pick<
    FundraisingProject,
    "start_date" | "end_date" | "accepting_entries_after_end_override"
  > | null | undefined,
  programmeDate: string
): boolean {
  if (!project) return false;

  if (project.start_date && programmeDate < project.start_date) {
    return false;
  }

  if (
    project.end_date &&
    programmeDate > project.end_date &&
    !project.accepting_entries_after_end_override
  ) {
    return false;
  }

  return true;
}
