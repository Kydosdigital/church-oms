import { getReferenceData } from "@/lib/data/reference";
import { ProgrammeEntryWizard } from "@/components/forms/programme-entry-wizard";

export default async function NewProgrammePage() {
  const reference = await getReferenceData();

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">New programme</h1>
      <p className="text-sm text-muted mb-6">
        Service details, attendance, outcomes and notes — review everything before you sign and submit.
      </p>
      <ProgrammeEntryWizard reference={reference} />
    </div>
  );
}
