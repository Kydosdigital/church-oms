import Image from "next/image";
import Link from "next/link";

const COLUMNS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/features#verification", label: "Verification workflow" },
      { href: "/features#security", label: "Security" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create an account" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of use" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-ink-muted">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Image
              src="/brand/church-oms-logo-white-transparent.png"
              alt="Church OMS"
              width={160}
              height={35}
              className="h-8 w-auto object-contain"
            />
            <p className="mt-5 text-sm leading-relaxed">
              Church operations software for the part nobody enjoys: counting, recording,
              checking and reporting what happened at every service.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/70">
                {column.heading}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <p className="text-xs">© {year} Church OMS. All rights reserved.</p>
          <p className="text-xs">
            Built by{" "}
            <a
              href="https://github.com/Kydosdigital"
              className="underline hover:text-white transition-colors"
              rel="noreferrer noopener"
              target="_blank"
            >
              Kydos Digital
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
