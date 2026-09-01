import type { ProgrammeOccurrence, Signoff } from "@/types/domain";

export type ProgrammeReportSignoff = Signoff & {
  app_users: { full_name: string } | null;
};

export function selectCurrentAttendanceSignoffs(
  signoffs: ProgrammeReportSignoff[],
  programmeState: ProgrammeOccurrence["state"]
) {
  const attendanceSignoffs = signoffs
    .filter((signoff) => signoff.record_kind === "attendance")
    .sort(
      (left, right) =>
        right.record_version - left.record_version ||
        right.created_at.localeCompare(left.created_at)
    );

  const submit = attendanceSignoffs.find(
    (signoff) => signoff.action === "submit"
  );

  const verify =
    programmeState === "verified" && submit
      ? attendanceSignoffs.find(
          (signoff) =>
            signoff.action === "verify" &&
            signoff.record_version > submit.record_version
        )
      : undefined;

  return { submit, verify };
}
