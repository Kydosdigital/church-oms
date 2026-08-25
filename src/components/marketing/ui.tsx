import Link from "next/link";
import { cn } from "@/lib/cn";

export function Eyebrow({
  children,
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.18em]",
        tone === "dark" ? "text-brand" : "text-brand",
        className
      )}
    >
      {children}
    </p>
  );
}

export function CTA({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "light" | "outline" | "ghost";
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all",
        size === "lg" ? "h-13 px-8 text-base" : "h-11 px-6 text-sm",
        variant === "primary" && "bg-brand text-white hover:brightness-110 shadow-lg shadow-brand/25",
        variant === "light" && "bg-white text-ink hover:bg-white/90",
        variant === "outline" && "border border-white/25 text-white hover:bg-white/10",
        variant === "ghost" && "border border-ink/15 text-ink hover:bg-ink/5",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Check({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
    >
      <circle cx="10" cy="10" r="10" className="fill-current opacity-15" />
      <path
        d="M6 10.4l2.6 2.6L14.2 7.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={cn("size-4", className)}>
      <path
        d="M3 8h10m0 0l-4-4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
