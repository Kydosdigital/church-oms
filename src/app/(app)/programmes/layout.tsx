import { requireProgrammesAccess } from "@/lib/route-access";

export default async function ProgrammesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireProgrammesAccess();
  return children;
}
