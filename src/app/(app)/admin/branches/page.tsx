import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import type { Branch, Venue } from "@/types/domain";

type BranchWithVenues = Branch & { venues: Venue[] };

export default async function BranchesAdminPage() {
  const supabase = await createClient();
  const { data: branches } = await supabase.from("branches").select("*, venues(*)").order("name");
  const branchList = (branches ?? []) as BranchWithVenues[];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Branches & venues</h1>
        <p className="text-sm text-muted">
          Branch identifiers exist from day one, even for a single-branch church (section 10.2).
          Branch selection is hidden from ordinary workflows when only one branch exists.
        </p>
      </div>

      {branchList.map((branch) => (
        <Card key={branch.id}>
          <CardHeader>
            <CardTitle>
              {branch.name} {branch.is_primary && <span className="text-xs text-muted">(primary)</span>}
            </CardTitle>
          </CardHeader>
          <ul className="text-sm space-y-1">
            {(branch.venues ?? []).map((v) => (
              <li key={v.id} className="flex justify-between">
                <span>{v.name}</span>
                <span className="text-muted">Capacity {v.default_capacity}</span>
              </li>
            ))}
            {(branch.venues ?? []).length === 0 && <li className="text-muted">No venues yet.</li>}
          </ul>
        </Card>
      ))}

      <p className="text-xs text-muted">
        Editing branches, venues and service types from this screen is planned for the next
        implementation pass — the underlying tables and RLS policies (administrator-only writes)
        are already in place in supabase/migrations.
      </p>
    </div>
  );
}
