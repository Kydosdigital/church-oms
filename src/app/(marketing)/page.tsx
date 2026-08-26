import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ParticleField } from "@/components/marketing/particle-field";
import { RoleSwitcher } from "@/components/marketing/role-switcher";
import { CTA, Check, Arrow, Eyebrow } from "@/components/marketing/ui";
import { TIERS, formatPrice, BILLING_PERIOD } from "@/lib/marketing/pricing";

const title = "Church Attendance, Giving & Reporting Software";
const description =
  "Record attendance, service outcomes and offerings for every service, with a second person " +
  "required to verify before anything is final. Dashboards, exports and a full audit trail included.";

export const metadata: Metadata = {
  // `absolute` so the root layout's "%s · <app name>" template doesn't append
  // the app name here. This title already carries the product category, and
  // with a long NEXT_PUBLIC_APP_NAME the templated version ran past 70
  // characters and repeated the word "software".
  title: { absolute: title },
  description,
  alternates: { canonical: "/" },
  openGraph: { title, description, url: "/" },
  twitter: { title, description },
};

const FAQS = [
  {
    q: "Do we need to be technical to run this?",
    a: "No. One person signs up, answers a few questions about the church, and the system creates your branch, service types and offering categories with sensible defaults. From there it's a web page on a phone. There is nothing to install and no server to look after.",
  },
  {
    q: "What if someone records the wrong number?",
    a: "That is exactly what verification is for. A second person reviews the record and can send it back with a reason instead of quietly editing it. Even a locked record can be reopened later, but the reopen and the reason are both written to the audit log, so the history is never lost.",
  },
  {
    q: "Can our pastor or admin see the giving figures?",
    a: "Only if you explicitly grant it. Finance access is a separate permission that is never implied by someone's role or admin status. There is a second permission on top of that controlling whether a person can see past giving history or only the entry in front of them.",
  },
  {
    q: "We have more than one branch. Does that work?",
    a: "Yes. Every record carries a branch from day one, even for a single-location church, so adding branches later never requires a migration. Roles are assigned per person per branch, and reporting works per branch or consolidated across the church.",
  },
  {
    q: "What happens to our data if we leave?",
    a: "You can export everything as CSV or Excel at any time, from any report screen, without asking us. There is no lock-in period and no export fee.",
  },
  {
    q: "Is our giving data actually secure?",
    a: "Access rules are enforced in the database itself using Postgres row-level security, not just hidden in the interface. That means a request that skips the app entirely still cannot read rows it has no right to. Every state change is written to an append-only audit log.",
  },
];

const TRUST = [
  { stat: "Row-level", label: "security enforced in Postgres" },
  { stat: "Two-person", label: "sign-off on every record" },
  { stat: "Full", label: "audit trail, append-only" },
  { stat: "CSV + Excel", label: "export, whenever you want" },
];

export default function HomePage() {
  const teaser = TIERS;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ─── 1. Hero — full-bleed dark, WebGL particle field ─────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-ink">
        <Image
          src="/images/congregation-hands.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/85 via-ink/70 to-ink" />
        <ParticleField className="absolute inset-0" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent"
        />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 w-full pt-28 pb-20">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs text-ink-text backdrop-blur-sm">
              <span className="size-1.5 rounded-full bg-brand" />
              Built for churches that count carefully
            </p>

            <h1 className="mt-7 text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl font-semibold text-white tracking-tight text-balance">
              Every service, recorded once and checked by someone else.
            </h1>

            <p className="mt-7 text-lg sm:text-xl text-ink-muted leading-relaxed max-w-xl">
              Church OMS replaces the notebook, the group chat and the spreadsheet that never
              quite reconciles. Attendance, outcomes and offerings go in on a phone, get verified
              by a second person, and lock.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3 sm:items-center">
              <CTA href="/signup" size="lg" variant="primary">
                Start free <Arrow />
              </CTA>
              <CTA href="/features" size="lg" variant="outline">
                See how it works
              </CTA>
            </div>

            <p className="mt-6 text-sm text-ink-muted/80">
              Free for a single church. No card required.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 2. Trust strip — thin horizontal band, divided ──────────────── */}
      <section className="bg-ink-soft border-y border-ink-line">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <dl className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-ink-line/70">
            {TRUST.map((item, i) => (
              <div
                key={item.stat}
                className={`py-8 px-5 sm:px-8 ${i === 0 ? "lg:pl-0" : ""} ${
                  i % 2 === 0 ? "border-r-0 lg:border-r" : ""
                }`}
              >
                <dt className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                  {item.stat}
                </dt>
                <dd className="mt-1 text-sm text-ink-muted leading-snug">{item.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ─── 3. Problem — asymmetric split with overlapping accent card ──── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1fr] lg:gap-20 items-center">
            <div className="relative reveal">
              <div className="relative aspect-[3/4] rounded-3xl overflow-hidden">
                <Image
                  src="/images/calculator.jpg"
                  alt="A desk covered in loose paperwork, bank forms and a calculator"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute -bottom-8 -right-4 sm:right-8 lg:-right-10 w-56 rounded-2xl bg-ink p-6 shadow-2xl shadow-ink/25">
                <p className="text-3xl font-semibold text-white">Sunday</p>
                <p className="mt-1 text-sm text-ink-muted leading-snug">
                  is not the problem. The four weeks after it are.
                </p>
              </div>
            </div>

            <div>
              <Eyebrow>The current state</Eyebrow>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-ink tracking-tight leading-[1.12] text-balance">
                The numbers exist. They are just in six different places.
              </h2>
              <p className="mt-5 text-lg text-ink/55 leading-relaxed">
                Most churches are not short of information. They are short of one version of it
                that everyone trusts.
              </p>

              <ul className="mt-9 space-y-5">
                {[
                  {
                    h: "The count lives in someone's head until Tuesday",
                    p: "By the time it is written down, it is an estimate of an estimate.",
                  },
                  {
                    h: "Two people remember the offering differently",
                    p: "With no record of who counted what, the conversation gets awkward fast.",
                  },
                  {
                    h: "Corrections overwrite the original silently",
                    p: "Nobody can answer what the figure was before, or who changed it.",
                  },
                  {
                    h: "Everyone with the spreadsheet sees everything",
                    p: "Including giving totals that were never meant to be that widely shared.",
                  },
                ].map((item) => (
                  <li key={item.h} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-danger/70"
                    />
                    <div>
                      <p className="font-medium text-ink">{item.h}</p>
                      <p className="mt-0.5 text-[0.95rem] text-ink/50 leading-relaxed">{item.p}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. How it works — dark, connected 3-step timeline ───────────── */}
      <section className="relative bg-ink ink-grid py-24 sm:py-32 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 -translate-x-1/2 w-[70rem] h-[30rem] bg-brand/12 blur-[120px] rounded-full"
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow tone="dark">The workflow</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-white tracking-tight leading-[1.12] text-balance">
              Submit. Verify. Lock.
            </h2>
            <p className="mt-5 text-lg text-ink-muted leading-relaxed">
              The same three steps for attendance and for money. One person records, a different
              person checks, and only then does it count.
            </p>
          </div>

          <ol className="mt-16 relative grid gap-12 md:grid-cols-3 md:gap-8">
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-7 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-brand/20 via-brand/60 to-brand/20"
            />
            {[
              {
                n: "01",
                h: "Submit",
                p: "An usher or treasurer records the service and signs off. Their name, the timestamp and the version are all stamped onto the record.",
                tag: "Draft → Submitted",
              },
              {
                n: "02",
                h: "Verify",
                p: "A different authorised person reviews it. They can lock it, or return it with a reason for correction. They cannot verify their own submission.",
                tag: "Submitted → Verified",
              },
              {
                n: "03",
                h: "Lock",
                p: "The record is final and reporting picks it up. Reopening it later is possible, requires a reason, and is written to the audit log.",
                tag: "Verified → Locked",
              },
            ].map((step) => (
              <li key={step.n} className="relative reveal">
                <div className="relative z-10 size-14 rounded-full bg-ink border border-brand/40 flex items-center justify-center">
                  <span className="text-sm font-semibold text-brand tracking-wider">{step.n}</span>
                </div>
                <h3 className="mt-6 text-2xl font-semibold text-white">{step.h}</h3>
                <p className="mt-3 text-ink-muted leading-relaxed">{step.p}</p>
                <p className="mt-5 inline-block rounded-md bg-white/5 border border-white/10 px-2.5 py-1 font-mono text-xs text-brand">
                  {step.tag}
                </p>
              </li>
            ))}
          </ol>

          <p className="mt-16 max-w-2xl text-sm text-ink-muted/80 leading-relaxed border-l-2 border-brand/40 pl-5">
            Separation of duties is enforced inside the database function that performs the
            verification, not by hiding a button. A request that bypasses the interface entirely
            still gets refused.
          </p>
        </div>
      </section>

      {/* ─── 5. Bento feature grid — asymmetric mosaic ───────────────────── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>What you get</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-ink tracking-tight leading-[1.12] text-balance">
              Built around how a church actually runs.
            </h2>
          </div>

          <div className="mt-14 grid gap-4 sm:gap-5 md:grid-cols-3 md:auto-rows-[13rem]">
            {/* Big feature cell */}
            <div className="md:col-span-2 md:row-span-2 rounded-3xl bg-ink p-8 sm:p-10 flex flex-col justify-between overflow-hidden relative reveal">
              <div
                aria-hidden="true"
                className="absolute -right-16 -top-16 size-64 rounded-full bg-brand/20 blur-3xl"
              />
              <div className="relative">
                <h3 className="text-2xl sm:text-3xl font-semibold text-white leading-tight">
                  Attendance capture that fits in a pocket
                </h3>
                <p className="mt-4 text-ink-muted leading-relaxed max-w-md">
                  Service details, counts, outcomes, notes, sign-off. Five steps, designed for a
                  phone held one-handed at the back of a hall, not a desktop spreadsheet.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {[
                    "Men",
                    "Women",
                    "Teenagers",
                    "Children",
                    "First-timers",
                    "Converts",
                    "New births",
                    "Weddings",
                  ].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-ink-text"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>

              {/* The five wizard steps, rendered as a progress rail. */}
              <div className="relative mt-10">
                <div className="flex items-center gap-2">
                  {["Service", "Counts", "Outcomes", "Notes", "Sign-off"].map((step, i) => (
                    <div key={step} className="flex-1 min-w-0">
                      <div
                        className={`h-1 rounded-full ${i < 4 ? "bg-brand" : "bg-white/15"}`}
                        aria-hidden="true"
                      />
                      <p className="mt-2.5 text-[0.68rem] leading-tight text-ink-muted">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-ink/10 p-7 flex flex-col justify-between reveal">
              <div className="size-10 rounded-xl bg-brand-muted flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="size-5 text-brand" aria-hidden="true">
                  <path d="M4 19V9m5 10V5m5 14v-7m5 7V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-ink">Dashboards and trends</h3>
                <p className="mt-1.5 text-sm text-ink/50 leading-relaxed">
                  Attendance and giving over any date range you pick, not a fixed window.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-ink/10 p-7 flex flex-col justify-between reveal">
              <div className="size-10 rounded-xl bg-brand-muted flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" className="size-5 text-brand" aria-hidden="true">
                  <path
                    d="M12 3l7 3v6c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6l7-3z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-ink">Permissions that hold</h3>
                <p className="mt-1.5 text-sm text-ink/50 leading-relaxed">
                  Enforced in the database, so the rules apply to every route in.
                </p>
              </div>
            </div>

            <div className="md:col-span-1 rounded-3xl bg-brand-muted p-7 flex flex-col justify-between reveal">
              <p className="text-4xl font-semibold text-brand tracking-tight">2</p>
              <div>
                <h3 className="font-semibold text-ink">People per record</h3>
                <p className="mt-1.5 text-sm text-ink/55 leading-relaxed">
                  One to submit, one to verify. Never the same person twice.
                </p>
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-ink/10 overflow-hidden flex flex-col sm:flex-row reveal">
              <div className="p-7 flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-ink">Reports people can actually use</h3>
                <p className="mt-1.5 text-sm text-ink/50 leading-relaxed">
                  CSV for the spreadsheet, Excel for the finance committee, a print-ready service
                  report for the board pack.
                </p>
              </div>
              <div className="relative sm:w-48 h-32 sm:h-auto shrink-0">
                <Image
                  src="/images/pews.jpg"
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. Role switcher — interactive tabs on grey ─────────────────── */}
      <section className="bg-[#f6f8fa] border-y border-ink/8 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow>Made for everyone involved</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-ink tracking-tight leading-[1.12] text-balance">
              Five people, five different jobs, one record.
            </h2>
            <p className="mt-5 text-lg text-ink/55 leading-relaxed">
              Pick a role to see what that person sees.
            </p>
          </div>

          <div className="mt-12">
            <RoleSwitcher />
          </div>
        </div>
      </section>

      {/* ─── 7. Security — dark split with a mono enforcement panel ──────── */}
      <section className="bg-ink py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20 items-center">
            <div>
              <Eyebrow tone="dark">Security</Eyebrow>
              <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-white tracking-tight leading-[1.12] text-balance">
                Hiding a button is not access control.
              </h2>
              <p className="mt-5 text-lg text-ink-muted leading-relaxed">
                Most software decides what you can see in the interface. If something bypasses the
                interface, the rules are gone. Church OMS pushes every rule down into the database,
                where it applies to every possible route in.
              </p>
              <ul className="mt-9 space-y-4">
                {[
                  "Row-level security scopes every query by church and branch",
                  "Column-level grants stop users editing fields they shouldn't",
                  "Verification functions refuse the original submitter",
                  "Every state change is written to an append-only audit log",
                ].map((point) => (
                  <li key={point} className="flex gap-3 text-ink-text">
                    <Check className="text-brand mt-0.5" />
                    <span className="text-[0.95rem] leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-ink-line bg-ink-soft overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 border-b border-ink-line px-5 py-3.5">
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="size-2.5 rounded-full bg-white/15" />
                <span className="ml-3 font-mono text-xs text-ink-muted">
                  enforcement · database layer
                </span>
              </div>
              <div className="p-6 sm:p-7 font-mono text-[0.78rem] leading-[1.9] text-ink-muted overflow-x-auto">
                <p>
                  <span className="text-ink-muted/50"># a treasurer requests another branch</span>
                </p>
                <p className="text-ink-text">select * from revenue_entries;</p>
                <p className="text-brand">→ 1 row (their own, current service)</p>
                <p className="mt-4">
                  <span className="text-ink-muted/50"># the same person tries to self-verify</span>
                </p>
                <p className="text-ink-text">select verify_revenue(entry_id);</p>
                <p className="text-danger">→ error: submitter cannot verify</p>
                <p className="mt-4">
                  <span className="text-ink-muted/50"># a user edits their own church_id</span>
                </p>
                <p className="text-ink-text">update app_users set church_id = ...;</p>
                <p className="text-danger">→ error: permission denied for column</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. Pricing teaser — three cards, middle raised ──────────────── */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-ink tracking-tight leading-[1.12] text-balance">
              Free for one church. Fair after that.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3 items-stretch">
            {teaser.map((tier) => (
              <div
                key={tier.id}
                className={
                  tier.featured
                    ? "rounded-3xl bg-ink text-white p-8 shadow-2xl shadow-ink/20 lg:-my-4 lg:py-12 relative flex flex-col"
                    : "rounded-3xl border border-ink/10 p-8 flex flex-col"
                }
              >
                {tier.featured && (
                  <span className="absolute top-6 right-6 rounded-full bg-brand px-3 py-1 text-xs font-medium">
                    Most churches
                  </span>
                )}
                <h3
                  className={`font-semibold ${tier.featured ? "text-white" : "text-ink"}`}
                >
                  {tier.name}
                </h3>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span
                    className={`text-4xl font-semibold tracking-tight ${
                      tier.featured ? "text-white" : "text-ink"
                    }`}
                  >
                    {formatPrice(tier)}
                  </span>
                  {tier.price !== null && tier.price > 0 && (
                    <span className={tier.featured ? "text-ink-muted" : "text-ink/45"}>
                      /{BILLING_PERIOD}
                    </span>
                  )}
                </p>
                <p
                  className={`mt-4 text-sm leading-relaxed ${
                    tier.featured ? "text-ink-muted" : "text-ink/55"
                  }`}
                >
                  {tier.tagline}
                </p>
                <ul className="mt-6 space-y-2.5 flex-1">
                  {tier.features.slice(0, 4).map((f) => (
                    <li
                      key={f}
                      className={`flex gap-2.5 text-sm ${
                        tier.featured ? "text-ink-text" : "text-ink/70"
                      }`}
                    >
                      <Check className="text-brand mt-0.5 size-4" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <CTA
                  href={tier.cta.href}
                  variant={tier.featured ? "light" : "ghost"}
                  className="mt-8 w-full"
                >
                  {tier.cta.label}
                </CTA>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline"
            >
              Compare every plan in detail <Arrow />
            </Link>
          </p>
        </div>
      </section>

      {/* ─── 9. FAQ — sticky heading beside a native accordion ───────────── */}
      <section className="bg-[#f6f8fa] border-y border-ink/8 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <Eyebrow>Questions</Eyebrow>
              <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-ink tracking-tight leading-[1.12] text-balance">
                The things churches ask first.
              </h2>
              <p className="mt-5 text-ink/55 leading-relaxed">
                Something not covered here?{" "}
                <Link href="/contact" className="text-brand underline underline-offset-2">
                  Ask us directly
                </Link>
                .
              </p>
            </div>

            <div className="divide-y divide-ink/10 border-t border-ink/10">
              {FAQS.map((faq) => (
                <details key={faq.q} className="group py-6">
                  <summary className="flex cursor-pointer items-start justify-between gap-6 list-none">
                    <span className="text-lg font-medium text-ink leading-snug">{faq.q}</span>
                    <span
                      aria-hidden="true"
                      className="mt-1 shrink-0 text-ink/40 transition-transform group-open:rotate-45"
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="size-5">
                        <path
                          d="M10 4v12M4 10h12"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-4 pr-10 text-ink/60 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 10. Final CTA — full-bleed photo with ink overlay ───────────── */}
      <section className="relative py-28 sm:py-36 overflow-hidden">
        <Image
          src="/images/worship-crowd.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-ink/85" />
        <div className="relative mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.1] text-balance">
            Start with this Sunday.
          </h2>
          <p className="mt-6 text-lg text-ink-muted leading-relaxed">
            Set up your church in a few minutes, record one service, and see what having a verified
            record actually feels like. Free for a single church, for as long as you want.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <CTA href="/signup" size="lg" variant="primary">
              Create your church <Arrow />
            </CTA>
            <CTA href="/contact" size="lg" variant="outline">
              Talk to us first
            </CTA>
          </div>
        </div>
      </section>
    </>
  );
}
