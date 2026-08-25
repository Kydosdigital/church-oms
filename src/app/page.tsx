import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://church-oms.vercel.app";

const pageTitle = "Church Attendance, Outcomes & Giving Software";
const pageDescription =
  "Record attendance, service outcomes, and offerings for every service, with a required " +
  "second-person verification before any record locks. Role-based dashboards, exports, and a " +
  "full audit trail included.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/" },
  // Layout-level openGraph/twitter don't inherit a page's own title/description
  // automatically — restate them here so shared links show this page's copy.
  openGraph: { title: pageTitle, description: pageDescription, url: "/" },
  twitter: { title: pageTitle, description: pageDescription },
};

const FEATURES: { title: string; body: string }[] = [
  {
    title: "Attendance & outcomes, captured in seconds",
    body:
      "A phone-first entry wizard for attendance counts, first-timers, converts, new births and " +
      "weddings — with live warnings if a count looks off, not a silent accept or a hard block.",
  },
  {
    title: "Two-person verification, enforced by the database",
    body:
      "Every attendance and offering record is submitted by one person and locked by a different, " +
      "independently authorised one — separation of duties that holds even if someone bypasses the UI.",
  },
  {
    title: "Giving visibility, on your terms",
    body:
      "Finance access is its own explicit permission, never assumed from an admin or pastor role — " +
      "and a second flag controls who can see past giving history versus just today's entry.",
  },
  {
    title: "Dashboards, exports and an audit log",
    body:
      "Attendance and revenue trends, pending approvals, and fundraising progress, with CSV/Excel " +
      "export, a print-ready service report, and a full audit trail of every submit/verify/reopen.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: appName,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description:
    "Church operations management software for attendance, service outcomes, and offerings, " +
    "with mandatory two-person verification, role-based dashboards, and exports.",
};

export default function Home() {
  return (
    <>
      {/* Static, hand-authored JSON-LD — no user input reaches this. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 flex flex-col items-center gap-6 px-6 py-24 text-center outline-none"
      >
        <Image
          src="/brand/church-oms-logo-primary-transparent.png"
          alt={appName}
          width={220}
          height={48}
          className="h-11 w-auto object-contain"
          priority
        />
        <h1 className="text-3xl sm:text-4xl font-semibold max-w-xl">
          One controlled record for every service — attendance, outcomes, offerings and sign-off.
        </h1>
        <p className="max-w-md text-muted">
          Capture service information quickly, verify it responsibly, and turn it into timely
          operational insight.
        </p>
        <div className="flex gap-3">
          <Link href="/login">
            <Button size="lg">Sign in</Button>
          </Link>
        </div>

        <section aria-labelledby="features-heading" className="max-w-3xl mt-16 text-left">
          <h2 id="features-heading" className="text-xl font-semibold text-center mb-8">
            What {appName} does
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <h3 className="font-medium">{feature.title}</h3>
                <p className="text-sm text-muted mt-1">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted mt-16">
          <Link href="/privacy" className="underline">Privacy policy</Link>
          {" · "}
          <Link href="/terms" className="underline">Terms of use</Link>
        </p>
      </main>
    </>
  );
}
