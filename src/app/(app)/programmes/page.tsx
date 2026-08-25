import Link from "next/link";
import { listProgrammes } from "@/lib/data/programmes";
import { StateBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ProgrammesPage() {
  const programmes = await listProgrammes();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Programmes</h1>
          <p className="text-sm text-muted">Service records for your assigned branches.</p>
        </div>
        <Link href="/programmes/new">
          <Button>New programme</Button>
        </Link>
      </div>

      <div className="divide-y divide-surface-border rounded-brand border border-surface-border overflow-hidden">
        {programmes.length === 0 && (
          <p className="p-6 text-sm text-muted">No programmes yet — create your first service record.</p>
        )}
        {programmes.map((p) => (
          <Link
            key={p.id}
            href={`/programmes/${p.id}`}
            className="flex items-center justify-between p-4 hover:bg-surface"
          >
            <div>
              <p className="font-medium">{p.programme_name}</p>
              <p className="text-sm text-muted">
                {p.programme_date} · {p.classification === "routine" ? "Routine" : "Special event"}
                {p.attendance_records?.[0]?.total_attendance != null &&
                  ` · ${p.attendance_records[0].total_attendance} attended`}
              </p>
            </div>
            <StateBadge state={p.state} />
          </Link>
        ))}
      </div>
    </div>
  );
}
