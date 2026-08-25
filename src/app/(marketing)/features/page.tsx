import type { Metadata } from "next";
import Image from "next/image";
import { CTA, Check, Arrow, Eyebrow } from "@/components/marketing/ui";

const title = "Features";
const description =
  "Attendance capture, two-person verification, offerings and giving, branch-scoped permissions, " +
  "dashboards, exports and a full audit trail. Every feature in Church OMS, explained.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/features" },
  openGraph: { title, description, url: "/features" },
  twitter: { title, description },
};

/** Deep-dive blocks, alternating image side. */
const DEEP_DIVES = [
  {
    id: "capture",
    eyebrow: "Capture",
    heading: "Recording a service takes about ninety seconds",
    body: "The entry wizard is built for the person actually doing it: standing at the back of a hall, on a phone, straight after the service. It moves through service details, attendance counts, outcomes, notes, then a review screen where they sign off.",
    points: [
      "Counts split by men, women, teenagers and children",
      "Outcomes for first-timers, converts, new births and weddings",
      "Warns when a count exceeds venue capacity",
      "Warns when outcomes exceed total attendance",
      "Both warnings require a note rather than blocking the entry",
      "Branch is locked to the usher's own assignment",
    ],
    image: "/images/congregation-seated.jpg",
    alt: "A congregation seated in a church during a service",
  },
  {
    id: "verification",
    eyebrow: "Verification",
    heading: "A second person has to agree before it counts",
    body: "This is the part most church software leaves out. A submitted record is not final: it waits for someone else to check it. That person can lock it, or return it with a reason so the original person fixes their own entry.",
    points: [
      "The submitter's identity, timestamp and record version are stamped on submit",
      "Verification is refused if the verifier is the submitter",
      "Returning a record requires a written reason",
      "Reopening a locked record requires a reason and is logged",
      "The same workflow applies to attendance and to offerings",
      "Independent finance verification can be toggled per church",
    ],
    image: "/images/team-table.jpg",
    alt: "Three people reviewing documents together around a table",
  },
  {
    id: "giving",
    eyebrow: "Giving",
    heading: "Offerings recorded in the categories your church actually uses",
    body: "Nobody wants their giving forced into someone else's chart of accounts. Offering categories are configurable, split across general, project and special types, and each entry records physical and online giving separately.",
    points: [
      "Configurable offering categories per church",
      "Physical and online giving totals kept apart",
      "Fundraising projects tracked against a target",
      "Giving-channel breakdown on the dashboard",
      "Currency and reporting year start are church settings",
      "Finance exports respect the viewer's permissions",
    ],
    image: "/images/pews.jpg",
    alt: "Empty wooden church pews in warm light",
  },
];

const PERMISSION_MATRIX = [
  { capability: "Record attendance", usher: true, treasurer: false, pastor: false, admin: false },
  { capability: "Record offerings", usher: false, treasurer: true, pastor: false, admin: false },
  { capability: "Verify someone else's record", usher: false, treasurer: false, pastor: true, admin: true },
  { capability: "See giving history", usher: false, treasurer: false, pastor: false, admin: false },
  { capability: "Manage branches and roles", usher: false, treasurer: false, pastor: false, admin: true },
  { capability: "Read the audit log", usher: false, treasurer: false, pastor: false, admin: true },
];

const REPORTING = [
  {
    h: "Dashboards",
    p: "Attendance and revenue trends, pending approvals, project progress and giving-channel split, over any date range you choose.",
  },
  {
    h: "CSV export",
    p: "Every report screen exports to CSV, so the numbers land in whatever spreadsheet your finance team already uses.",
  },
  {
    h: "Excel export",
    p: "The same reports as a formatted .xlsx workbook when a CSV would lose too much for the finance committee.",
  },
  {
    h: "Print-ready service report",
    p: "A single-service summary formatted for paper, for board packs and denominational returns.",
  },
  {
    h: "Audit log",
    p: "A filterable record of every create, edit, verify and reopen, with who did it and when. Administrators only.",
  },
  {
    h: "Branch reporting",
    p: "Report per branch or consolidated across the whole church, with the same permission rules applied either way.",
  },
];

export default function FeaturesPage() {
  return (
    <>
      {/* Hero — compact dark, left-aligned with a rule */}
      <section className="bg-ink pt-32 pb-20 sm:pt-44 sm:pb-28 relative overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute -top-40 right-0 size-[36rem] rounded-full bg-brand/10 blur-[130px]"
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <Eyebrow tone="dark">Features</Eyebrow>
          <h1 className="mt-5 max-w-3xl text-4xl sm:text-6xl font-semibold text-white tracking-tight leading-[1.05] text-balance">
            Everything a church needs to record a service properly.
          </h1>
          <p className="mt-7 max-w-xl text-lg text-ink-muted leading-relaxed">
            No modules to buy, no upsells for the parts that matter. Every plan gets the full
            workflow; the paid tiers add scale, not safety.
          </p>
        </div>
      </section>

      {/* Deep dives — alternating full-width image/text rows */}
      {DEEP_DIVES.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={index % 2 === 1 ? "bg-[#f6f8fa] border-y border-ink/8" : ""}
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 py-20 sm:py-28">
            <div
              className={`grid gap-12 lg:grid-cols-2 lg:gap-20 items-center ${
                index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="reveal">
                <Eyebrow>{section.eyebrow}</Eyebrow>
                <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-ink tracking-tight leading-[1.15] text-balance">
                  {section.heading}
                </h2>
                <p className="mt-5 text-lg text-ink/55 leading-relaxed">{section.body}</p>
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-2.5 text-[0.93rem] text-ink/70">
                      <Check className="text-brand mt-0.5 size-4" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl shadow-ink/10">
                <Image
                  src={section.image}
                  alt={section.alt}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Permissions — a real table, a pattern used nowhere else on the site */}
      <section id="permissions" className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Permissions</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-ink tracking-tight leading-[1.15] text-balance">
              Roles describe the job, not the access.
            </h2>
            <p className="mt-5 text-lg text-ink/55 leading-relaxed">
              Notice the row that is empty across the board. Seeing giving history is never granted
              by a role, not even to an administrator. It is a separate permission somebody has to
              turn on deliberately, per person.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto rounded-2xl border border-ink/10">
            <table className="w-full text-sm min-w-[36rem]">
              <caption className="sr-only">
                Which capabilities each role has by default
              </caption>
              <thead>
                <tr className="bg-[#f6f8fa] border-b border-ink/10">
                  <th scope="col" className="text-left font-medium text-ink px-5 py-4">
                    Capability
                  </th>
                  {["Usher", "Treasurer", "Pastor", "Admin"].map((role) => (
                    <th
                      key={role}
                      scope="col"
                      className="text-center font-medium text-ink px-4 py-4 w-24"
                    >
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/8">
                {PERMISSION_MATRIX.map((row) => (
                  <tr key={row.capability}>
                    <th scope="row" className="text-left font-normal text-ink/75 px-5 py-4">
                      {row.capability}
                    </th>
                    {([row.usher, row.treasurer, row.pastor, row.admin] as boolean[]).map(
                      (allowed, i) => (
                        <td key={i} className="text-center px-4 py-4">
                          {allowed ? (
                            <Check className="text-brand inline-block size-5" />
                          ) : (
                            <span className="text-ink/20" aria-label="No">
                              —
                            </span>
                          )}
                        </td>
                      )
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-sm text-ink/45">
            Roles are assigned per person, per branch. Somebody can be an usher at one branch and a
            verifier at another.
          </p>
        </div>
      </section>

      {/* Reporting — dense three-column list on ink */}
      <section id="reporting" className="bg-ink py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
            <div className="max-w-xl">
              <Eyebrow tone="dark">Reporting</Eyebrow>
              <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-white tracking-tight leading-[1.15] text-balance">
                Getting the numbers back out again.
              </h2>
            </div>
            <p className="text-ink-muted max-w-sm text-[0.95rem] leading-relaxed">
              Your data is yours. Every report exports without asking us, and there is no fee for
              leaving.
            </p>
          </div>

          <dl className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {REPORTING.map((item, i) => (
              <div key={item.h} className="border-t border-ink-line pt-6 reveal">
                <span className="font-mono text-xs text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <dt className="mt-3 text-lg font-semibold text-white">{item.h}</dt>
                <dd className="mt-2 text-[0.93rem] text-ink-muted leading-relaxed">{item.p}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Security — centred, narrow, quiet. Different rhythm to everything above. */}
      <section id="security" className="py-20 sm:py-28 bg-[#f6f8fa] border-y border-ink/8">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <Eyebrow>Security</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-ink tracking-tight leading-[1.15] text-balance">
            The rules live in the database, not the interface.
          </h2>
          <p className="mt-6 text-lg text-ink/55 leading-relaxed">
            Church OMS runs on Postgres with row-level security enabled on every table. Access is
            evaluated by the database on every single query, which means the rules hold no matter
            how a request arrives. Hiding a button is a convenience for the user, not a security
            control, and this system does not treat it as one.
          </p>

          <div className="mt-12 grid gap-4 sm:grid-cols-3 text-left">
            {[
              {
                h: "Row-level",
                p: "Every query is scoped by church and branch inside Postgres.",
              },
              {
                h: "Column-level",
                p: "Users cannot write fields they have no business writing.",
              },
              {
                h: "Append-only",
                p: "The audit log records changes; it does not let you erase them.",
              },
            ].map((item) => (
              <div key={item.h} className="rounded-2xl bg-white border border-ink/10 p-6">
                <p className="font-mono text-xs text-brand">{item.h}</p>
                <p className="mt-2.5 text-[0.93rem] text-ink/65 leading-relaxed">{item.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA — compact ink band, no photo (differs from home's photo CTA) */}
      <section className="bg-ink ink-grid py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight text-balance">
                Try it against one real service.
              </h2>
              <p className="mt-3 text-ink-muted max-w-lg leading-relaxed">
                The fastest way to judge this is to record last Sunday and see whether the workflow
                fits how your church already works.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <CTA href="/signup" size="lg" variant="primary">
                Start free <Arrow />
              </CTA>
              <CTA href="/pricing" size="lg" variant="outline">
                See pricing
              </CTA>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
