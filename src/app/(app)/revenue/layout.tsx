import { requireRevenueAccess } from "@/lib/route-access";

export default async function RevenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRevenueAccess();
  return children;
}
