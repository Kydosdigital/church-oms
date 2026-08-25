import { listBranchesWithVenues, listServiceTypesAll } from "@/lib/data/admin";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { BranchForm } from "@/components/forms/branch-form";
import { BranchListItem } from "@/components/forms/branch-list-item";
import { ServiceTypeForm } from "@/components/forms/service-type-form";
import { ServiceTypeListItem } from "@/components/forms/service-type-list-item";

export default async function BranchesAdminPage() {
  const [branches, serviceTypes] = await Promise.all([listBranchesWithVenues(), listServiceTypesAll()]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Branches & venues</h1>
        <p className="text-sm text-muted">
          Branch identifiers exist from day one, even for a single-branch church (section 10.2).
          Branch selection is hidden from ordinary workflows when only one branch exists.
        </p>
      </div>

      <BranchForm />

      {branches.map((branch) => (
        <BranchListItem key={branch.id} branch={branch} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Service types</CardTitle>
        </CardHeader>
        <div className="divide-y divide-surface-border">
          {serviceTypes.map((st) => (
            <ServiceTypeListItem key={st.id} serviceType={st} />
          ))}
          {serviceTypes.length === 0 && <p className="text-sm text-muted py-1.5">No service types yet.</p>}
        </div>
        <div className="pt-3 border-t border-surface-border mt-3">
          <ServiceTypeForm />
        </div>
      </Card>
    </div>
  );
}
