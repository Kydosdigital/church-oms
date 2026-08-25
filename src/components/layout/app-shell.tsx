"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  show: boolean;
}

interface AppShellContext {
  user: {
    full_name: string;
  };
  canViewFinance: boolean;
  canViewProgrammes: boolean;
  canViewReports: boolean;
  isAdministrator: boolean;
}

export function AppShell({
  ctx,
  children,
}: {
  ctx: AppShellContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/programmes", label: "Programmes", show: ctx.canViewProgrammes },
    { href: "/revenue", label: "Revenue", show: ctx.canViewFinance },
    { href: "/reports", label: "Reports", show: ctx.canViewReports },
    { href: "/admin/categories", label: "Offering categories", show: ctx.isAdministrator },
    { href: "/admin/branches", label: "Branches & venues", show: ctx.isAdministrator },
    { href: "/admin/users", label: "Users & roles", show: ctx.isAdministrator },
    { href: "/admin/audit", label: "Audit log", show: ctx.isAdministrator },
    { href: "/admin/settings", label: "Church settings", show: ctx.isAdministrator },
    { href: "/help", label: "Help", show: true },
  ];

  return (
    <div className="flex-1 flex flex-col sm:flex-row min-h-0">
      <aside className="sm:w-60 shrink-0 border-b sm:border-b-0 sm:border-r border-surface-border bg-surface">
        <div className="p-4 flex items-center justify-between sm:block">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-brand">
            <Image
              src="/brand/church-oms-icon-primary-transparent.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
              priority
            />
            <span>{process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations"}</span>
          </Link>
        </div>
        <nav aria-label="Main navigation" className="flex sm:flex-col overflow-x-auto sm:overflow-visible px-2 sm:px-0 pb-2 sm:pb-0">
          {navItems
            .filter((i) => i.show)
            .map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "whitespace-nowrap px-4 py-2.5 text-sm rounded-brand sm:rounded-none",
                    isActive
                      ? "bg-brand-muted text-brand sm:border-l-2 sm:border-brand"
                      : "text-foreground hover:bg-surface-border/40"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>
        <div className="hidden sm:block p-4 mt-auto border-t border-surface-border">
          <p className="text-sm font-medium">{ctx.user.full_name}</p>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="mt-2 px-0">
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <div id="main-content" tabIndex={-1} className="flex-1 min-w-0 outline-none">
        {children}
      </div>
    </div>
  );
}
