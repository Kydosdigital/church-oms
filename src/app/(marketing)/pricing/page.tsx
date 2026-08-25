import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { CTA, Check, Arrow, Eyebrow } from "@/components/marketing/ui";
import { TIERS, formatPrice, BILLING_PERIOD, CURRENCY_CODE } from "@/lib/marketing/pricing";

const title = "Pricing";
const description =
  "Free for a single church, with paid plans for multi-branch churches and networks. " +
  "Every plan includes the full verification workflow, dashboards, exports and audit trail.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/pricing" },
  openGraph: { title, description, url: "/pricing" },
  twitter: { title, description },
};

const COMPARISON: { group: string; rows: { label: string; values: string[] }[] }[] = [
  {
    group: "Scale",
    rows: [
      { label: "Branches", values: ["1", "Unlimited", "Unlimited churches"] },
      { label: "Users", values: ["Up to 10", "Unlimited", "Unlimited"] },
      { label: "Venues per branch", values: ["Unlimited", "Unlimited", "Unlimited"] },
    ],
  },
  {
    group: "Recording",
    rows: [
      { label: "Attendance and outcomes", values: ["Yes", "Yes", "Yes"] },
      { label: "Offerings and giving", values: ["Yes", "Yes", "Yes"] },
      { label: "Configurable offering categories", values: ["Yes", "Yes", "Custom setup"] },
      { label: "Fundraising projects", values: ["Yes", "Yes", "Yes"] },
      { label: "Duplicate-service detection", values: ["Yes", "Yes", "Yes"] },
    ],
  },
  {
    group: "Controls",
    rows: [
      { label: "Two-person verification", values: ["Yes", "Yes", "Yes"] },
      { label: "Branch-scoped roles", values: ["Yes", "Yes", "Yes"] },
      { label: "Separate finance permission", values: ["Yes", "Yes", "Yes"] },
      { label: "Audit log", values: ["Yes", "Yes", "Yes"] },
    ],
  },
  {
    group: "Reporting",
    rows: [
      { label: "Dashboards and trends", values: ["Yes", "Yes", "Yes"] },
      { label: "CSV and Excel export", values: ["Yes", "Yes", "Yes"] },
      { label: "Print-ready service report", values: ["Yes", "Yes", "Yes"] },
      { label: "Consolidated multi-branch reporting", values: ["—", "Yes", "Yes"] },
      { label: "Network rollup reporting", values: ["—", "—", "Yes"] },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Support", values: ["Email", "Priority email", "Named contact"] },
      { label: "Assisted onboarding", values: ["—", "—", "Yes"] },
      { label: "Data migration help", values: ["—", "—", "Yes"] },
    ],
  },
];

const PRICING_FAQ = [
  {
    q: "Is the free plan a trial?",
    a: "No. A single church with up to ten users can stay on the free plan indefinitely. It includes the full verification workflow, dashboards, exports and audit log, because those are the parts that make the records trustworthy and it would be strange to charge for trust.",
  },
  {
    q: "What counts as a branch?",
    a: "A distinct location that keeps its own attendance and offering records. Running three services on a Sunday at one site is one branch. Running services at two sites is two branches.",
  },
  {
    q: "Do you charge per user?",
    a: "No. Paid plans are per church, with unlimited users. Charging per usher would push churches toward sharing logins, which would defeat the entire point of recording who submitted and who verified.",
  },
  {
    q: "What happens if we outgrow the free plan?",
    a: "Nothing breaks and nothing is deleted. You will be prompted to move to a paid plan when you add an eleventh user or a second branch, and your existing records carry over untouched.",
  },
  {
    q: "Can we cancel?",
    a: "Yes, at any time, and you can export everything to CSV or Excel first. There is no minimum term and no export fee.",
  },
];

export default function PricingPage() {
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Church OMS",
    description:
      "Church operations management software for attendance, service outcomes and offerings, " +
      "with mandatory two-person verification.",
    offers: TIERS.filter((t) => t.price !== null).map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: String(t.price),
      priceCurrency: CURRENCY_CODE,
      availability: "https://schema.org/InStock",
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PRICING_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Hero — centred, tight, sets up the cards that overlap it */}
      <section className="bg-ink pt-32 pb-40 sm:pt-44 sm:pb-52 text-center relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute left-1/2 -translate-x-1/2 top-10 w-[50rem] h-[26rem] bg-brand/12 blur-[120px] rounded-full"
        />
        <div className="relative mx-auto max-w-3xl px-5 sm:px-8">
          <Eyebrow tone="dark">Pricing</Eyebrow>
          <h1 className="mt-5 text-4xl sm:text-6xl font-semibold text-white tracking-tight leading-[1.05] text-balance">
            Priced so the small church is not the one that suffers.
          </h1>
          <p className="mt-7 text-lg text-ink-muted leading-relaxed max-w-xl mx-auto">
            The full workflow is free for one church. You pay when you grow, not for the features
            that keep your records honest.
          </p>
        </div>
      </section>

      {/* Tier cards — pulled up to overlap the hero */}
      <section className="relative -mt-28 sm:-mt-36 pb-20 sm:pb-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-3 items-stretch">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-3xl p-8 flex flex-col ${
                  tier.featured
                    ? "bg-ink text-white shadow-2xl shadow-ink/25 ring-1 ring-brand/40"
                    : "bg-white border border-ink/10 shadow-xl shadow-ink/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className={`font-semibold ${tier.featured ? "text-white" : "text-ink"}`}>
                    {tier.name}
                  </h2>
                  {tier.featured && (
                    <span className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-white">
                      Most churches
                    </span>
                  )}
                </div>

                <p className="mt-5 flex items-baseline gap-1.5">
                  <span
                    className={`text-5xl font-semibold tracking-tight ${
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

                <p
                  className={`mt-5 rounded-xl px-4 py-3 text-xs leading-relaxed ${
                    tier.featured ? "bg-white/5 text-ink-text" : "bg-[#f6f8fa] text-ink/60"
                  }`}
                >
                  <span className="font-medium">Best for:</span> {tier.bestFor}
                </p>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className={`flex gap-2.5 text-sm ${
                        tier.featured ? "text-ink-text" : "text-ink/70"
                      }`}
                    >
                      <Check className="text-brand mt-0.5 size-4" />
                      <span className="leading-relaxed">{f}</span>
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
        </div>
      </section>

      {/* Full comparison — grouped table with sticky header */}
      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
            Compare every plan
          </h2>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-ink/10">
            <table className="w-full text-sm min-w-[40rem]">
              <caption className="sr-only">Feature comparison across all plans</caption>
              <thead className="sticky top-16 z-10">
                <tr className="bg-white border-b border-ink/10">
                  <th scope="col" className="text-left font-medium text-ink px-5 py-4 w-2/5">
                    Feature
                  </th>
                  {TIERS.map((tier) => (
                    <th
                      key={tier.id}
                      scope="col"
                      className="text-center font-medium text-ink px-4 py-4"
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((group) => (
                  <Fragment key={group.group}>
                    <tr className="bg-[#f6f8fa]">
                      <th
                        scope="colgroup"
                        colSpan={4}
                        className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-ink/45"
                      >
                        {group.group}
                      </th>
                    </tr>
                    {group.rows.map((row) => (
                      <tr key={group.group + row.label} className="border-b border-ink/8">
                        <th scope="row" className="text-left font-normal text-ink/75 px-5 py-3.5">
                          {row.label}
                        </th>
                        {row.values.map((value, i) => (
                          <td key={i} className="text-center px-4 py-3.5 text-ink/70">
                            {value === "Yes" ? (
                              <Check className="text-brand inline-block size-5" />
                            ) : value === "—" ? (
                              <span className="text-ink/20">—</span>
                            ) : (
                              value
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing FAQ — stacked cards rather than the home page's accordion */}
      <section className="bg-[#f6f8fa] border-y border-ink/8 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight text-center">
            Pricing questions
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {PRICING_FAQ.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl bg-white border border-ink/10 p-7 reveal"
              >
                <h3 className="font-semibold text-ink leading-snug">{faq.q}</h3>
                <p className="mt-3 text-[0.93rem] text-ink/60 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-ink/55">
            Still unsure which plan fits?{" "}
            <Link href="/contact" className="text-brand underline underline-offset-2">
              Tell us about your church
            </Link>{" "}
            and we will say plainly which one you need.
          </p>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-ink py-20 sm:py-24 text-center">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <h2 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight text-balance">
            Start on the free plan. Decide later.
          </h2>
          <p className="mt-5 text-ink-muted leading-relaxed">
            No card, no trial countdown, no feature held back to force an upgrade.
          </p>
          <div className="mt-9 flex justify-center">
            <CTA href="/signup" size="lg" variant="primary">
              Create your church <Arrow />
            </CTA>
          </div>
        </div>
      </section>
    </>
  );
}
