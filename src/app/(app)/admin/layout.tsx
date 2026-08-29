import { requireAdminAccess } from "@/lib/route-access";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminAccess();
  return children;
}
