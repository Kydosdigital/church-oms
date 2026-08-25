import { getReferenceData } from "@/lib/data/reference";
import { getCurrentUserContext } from "@/lib/data/current-user";
import { ProgrammeEntryWizard } from "@/components/forms/programme-entry-wizard";
import { Card, CardDescription } from "@/components/ui/card";

export default async function NewProgrammePage() {
  const [ctx, reference] = await Promise.all([getCurrentUserContext(), getReferenceData()]);

  // Branch protection: the branch comes from the user's own usher
  // assignment(s), not a freely editable dropdown of every branch in the
  // church — this is enforced server-side by RLS regardless, but scoping the
  // options here avoids a confusing rejection after the fact.
  const scope = ctx?.permissions.usherBranchScope() ?? [];
  const branches = scope === "all" ? reference.branches : reference.branches.filter((b) => scope.includes(b.id));

  if (branches.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold mb-4">New programme</h1>
        <Card>
          <CardDescription>
            You aren&rsquo;t assigned as an usher for any branch yet. Ask an administrator to assign
            you a branch from Users &amp; roles before creating a programme record.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-1">New programme</h1>
      <p className="text-sm text-muted mb-6">
        Service details, attendance, outcomes and notes — review everything before you sign and submit.
      </p>
      <ProgrammeEntryWizard reference={{ ...reference, branches }} />
    </div>
  );
}
