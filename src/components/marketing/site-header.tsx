"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Scroll position as an external store rather than effect-driven state — this
 * gets the correct value on the very first client render (including when the
 * page loads already scrolled, e.g. an anchor link or a restored position)
 * without a synchronous setState inside an effect.
 */
function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function useScrolled(threshold: number) {
  return useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > threshold,
    () => false // server render: always treat as at-top
  );
}

const NAV = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ overHero = false }: { overHero?: boolean }) {
  const pathname = usePathname();
  const scrolled = useScrolled(24);
  const [open, setOpen] = useState(false);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Over the hero the header floats transparently; everywhere else (and once
  // scrolled) it becomes an opaque blurred bar so text stays readable.
  const solid = scrolled || !overHero || open;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        solid
          ? "bg-ink/85 backdrop-blur-xl border-b border-white/10"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-16 sm:h-18 items-center justify-between gap-6">
          <Link href="/" className="flex items-center shrink-0" aria-label="Church OMS home">
            <Image
              src="/brand/church-oms-logo-white-transparent.png"
              alt="Church OMS"
              width={150}
              height={33}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>

          <nav aria-label="Main" className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-4 py-2 text-sm rounded-full transition-colors",
                    active
                      ? "text-white bg-white/10"
                      : "text-ink-muted hover:text-white hover:bg-white/5"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm text-ink-muted hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm font-medium rounded-full bg-white text-ink hover:bg-ink-muted/90 transition-colors"
            >
              Start free
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="md:hidden -mr-2 p-2 text-white"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="md:hidden border-t border-white/10 bg-ink px-5 pb-8 pt-4"
        >
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="py-3.5 text-lg text-ink-text border-b border-white/5"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="w-full text-center px-5 py-3.5 text-sm font-medium rounded-full bg-white text-ink"
            >
              Start free
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="w-full text-center px-5 py-3.5 text-sm rounded-full border border-white/20 text-ink-text"
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
