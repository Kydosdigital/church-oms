"use client";

import { useState } from "react";
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
  canUseLiveCounter: boolean;
  isAdministrator: boolean;
  isPlatformAdmin: boolean;
}

export function AppShell({
  ctx,
  children,
}: {
  ctx: AppShellContext;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/programmes", label: "Programmes", show: ctx.canViewProgrammes },
    { href: "/counter", label: "Live counter", show: ctx.canUseLiveCounter },
    { href: "/revenue", label: "Revenue", show: ctx.canViewFinance },
    { href: "/reports", label: "Reports", show: ctx.canViewReports },
    { href: "/admin/categories", label: "Offering categories", show: ctx.isAdministrator },
    { href: "/admin/branches", label: "Branches & venues", show: ctx.isAdministrator },
    { href: "/admin/users", label: "Users & roles", show: ctx.isAdministrator },
    { href: "/admin/audit", label: "Audit log", show: ctx.isAdministrator },
    { href: "/admin/settings", label: "Church settings", show: ctx.isAdministrator },
    { href: "/platform", label: "Platform Owner", show: ctx.isPlatformAdmin },
    { href: "/help", label: "Help", show: true },
  ];

  const visibleNavItems = navItems.filter((item) => item.show);

  function navLink(item: NavItem, mobile = false) {
    const isActive = pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={mobile ? () => setMobileMenuOpen(false) : undefined}
        className={cn(
          "text-sm transition-colors",
          mobile
            ? "flex min-h-11 items-center rounded-brand px-3 py-2.5"
            : "px-4 py-2.5",
          isActive
            ? mobile
              ? "bg-brand-muted font-medium text-brand"
              : "bg-brand-muted text-brand border-l-2 border-brand"
            : "text-foreground hover:bg-surface-border/40"
        )}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 flex-col sm:flex-row">
      {/* Mobile app bar. Desktop keeps the existing persistent sidebar. */}
      <header className="sticky top-0 z-40 border-b border-surface-border bg-surface sm:hidden">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex min-w-0 items-center gap-2 font-semibold text-brand"
          >
            <Image
              src="/brand/church-oms-icon-primary-transparent.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
              priority
            />
            <span className="truncate">
              {process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations"}
            </span>
          </Link>

          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-app-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="shrink-0"
          >
            {mobileMenuOpen ? "Close" : "Menu"}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div
            id="mobile-app-navigation"
            className="border-t border-surface-border px-3 pb-4 pt-3"
          >
            <nav aria-label="Main navigation" className="grid gap-1">
              {visibleNavItems.map((item) => navLink(item, true))}
            </nav>

            <div className="mt-3 border-t border-surface-border pt-3">
              <p className="px-3 text-sm font-medium">{ctx.user.full_name}</p>
              <form action={signOut} className="mt-2">
                <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
        )}
      </header>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-border bg-surface sm:flex">
        <div className="p-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold text-brand">
            <Image
              src="/brand/church-oms-icon-primary-transparent.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 shrink-0 object-contain"
              priority
            />
            <span className="truncate">
              {process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations"}
            </span>
          </Link>
        </div>

        <nav aria-label="Main navigation" className="flex flex-1 flex-col">
          {visibleNavItems.map((item) => navLink(item))}
        </nav>

        <div className="border-t border-surface-border p-4">
          <p className="text-sm font-medium">{ctx.user.full_name}</p>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="mt-2 px-0">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {children}
      </div>
    </div>
  );
}
