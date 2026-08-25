import type { Metadata } from "next";
import Image from "next/image";
import { CTA, Arrow, Eyebrow } from "@/components/marketing/ui";

const title = "About";
const description =
  "Why Church OMS exists, the principles it is built on, and the deliberate decisions behind " +
  "how it handles verification, money and access.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { title, description, url: "/about" },
  twitter: { title, description },
};

const PRINCIPLES = [
  {
    n: "01",
    h: "Trust is a workflow, not a feature",
    p: "You cannot bolt confidence onto a number after the fact. It comes from a process where a second person had to agree, and from a history nobody can quietly rewrite. That is why verification is not optional and not configurable away.",
  },
  {
    n: "02",
    h: "Access is a decision, never an assumption",
    p: "A lot of software decides that whoever is most senior should see the most. Churches do not work like that, and money in particular does not work like that. Financial visibility here is something a person is explicitly given, never something a job title implies.",
  },
  {
    n: "03",
    h: "Enforce it where it cannot be argued with",
    p: "Rules that live in the interface stop applying the moment something talks to the system a different way. Every access rule in Church OMS is enforced by the database itself, which means there is no route in that skips it.",
  },
  {
    n: "04",
    h: "Warn, do not block",
    p: "Real services produce odd numbers. Sometimes attendance really did exceed capacity. The system flags what looks wrong and asks for an explanation rather than refusing the entry and forcing somebody to lie to it.",
  },
  {
    n: "05",
    h: "The data belongs to the church",
    p: "Export to CSV or Excel from any report, at any time, without asking permission and without paying for the privilege. Software that holds records hostage is not serving the organisation using it.",
  },
];

const DECISIONS = [
  {
    q: "Why is verification mandatory?",
    a: "Because an optional control is not a control. If a busy church can switch off the second pair of eyes on a hard week, it will, and that is exactly the week the mistake happens.",
  },
  {
    q: "Why can an administrator not see giving by default?",
    a: "Administration and finance are different responsibilities. Bundling them means the person who sets up venues also sees every offering ever recorded, which is not a decision anybody consciously made.",
  },
  {
    q: "Why keep records that were reopened?",
    a: "A correction is information. Knowing a figure changed, who changed it and why they said they changed it is often more useful than the figure itself.",
  },
  {
    q: "Why branches from day one?",
    a: "Because churches plant. Building single-site software and retrofitting branches later means a painful migration at exactly the moment a church is busiest. Every record has carried a branch since the first version.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero — statement type over a photo, distinct from other page heroes */}
      <section className="relative pt-32 pb-24 sm:pt-48 sm:pb-32 overflow-hidden bg-ink">
        <Image
          src="/images/pews.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink/90 to-ink/70" />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <Eyebrow tone="dark">About</Eyebrow>
            <h1 className="mt-5 text-4xl sm:text-6xl font-semibold text-white tracking-tight leading-[1.05] text-balance">
              Built because the spreadsheet kept winning arguments it should not have been in.
            </h1>
          </div>
        </div>
      </section>

      {/* Story — narrow single column of real prose, no cards, no grid */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <div className="space-y-6 text-lg text-ink/70 leading-relaxed">
            <p className="text-2xl text-ink font-medium leading-snug">
              Church OMS started with a question that sounds simple and is not: how many people
              were here on Sunday?
            </p>
            <p>
              Ask three people in most churches and you will get three answers, all given
              confidently. Not because anybody is careless, but because the count was made quickly,
              remembered approximately, written down later, and then typed into something that
              nobody else could check.
            </p>
            <p>
              Offerings are worse. Money gets counted by whoever is free, recorded on whatever is
              to hand, and reconciled at some point in the following fortnight. When two figures
              disagree there is usually no record of who counted what, so the conversation becomes
              about people rather than about process. That is a bad position to put volunteers in.
            </p>
            <p>
              What churches were missing was not a better spreadsheet. It was the thing every
              organisation handling other people&rsquo;s money eventually adopts: a record that one
              person creates, a different person checks, and neither can quietly alter afterwards.
            </p>
            <p>
              So that is what this is. Attendance, outcomes and offerings, captured on a phone
              while the details are fresh, verified by someone who was not the person recording,
              and then locked, with every change since kept on the record.
            </p>
          </div>
        </div>
      </section>

      {/* Principles — numbered rows on ink, generous vertical rhythm */}
      <section className="bg-ink py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight text-balance">
            Five things this software refuses to compromise on.
          </h2>

          <div className="mt-14 divide-y divide-ink-line">
            {PRINCIPLES.map((p) => (
              <div
                key={p.n}
                className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-10 py-9 reveal"
              >
                <span className="font-mono text-sm text-brand sm:pt-1.5">{p.n}</span>
                <div>
                  <h3 className="text-xl sm:text-2xl font-semibold text-white leading-snug">
                    {p.h}
                  </h3>
                  <p className="mt-3 text-ink-muted leading-relaxed max-w-2xl">{p.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decisions — Q&A pairs in two columns, quiet and text-led */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow>Deliberate choices</Eyebrow>
            <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-ink tracking-tight leading-[1.15] text-balance">
              Things people ask us to change, and why we have not.
            </h2>
          </div>

          <dl className="mt-12 grid gap-x-14 gap-y-10 sm:grid-cols-2">
            {DECISIONS.map((d) => (
              <div key={d.q}>
                <dt className="text-lg font-semibold text-ink leading-snug">{d.q}</dt>
                <dd className="mt-3 text-[0.95rem] text-ink/60 leading-relaxed">{d.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Who builds it — short, honest, no invented team bios */}
      <section className="bg-[#f6f8fa] border-y border-ink/8 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <Eyebrow>Who builds it</Eyebrow>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold text-ink tracking-tight leading-[1.15] text-balance">
            A small team, working closely with the churches using it.
          </h2>
          <p className="mt-6 text-lg text-ink/60 leading-relaxed">
            Church OMS is built by{" "}
            <a
              href="https://github.com/Kydosdigital"
              target="_blank"
              rel="noreferrer noopener"
              className="text-brand underline underline-offset-2"
            >
              Kydos Digital
            </a>
            . It is developed alongside real churches rather than in a vacuum, which is why the
            feature list is shorter than most and the parts that exist are the parts that get used
            every week.
          </p>
          <p className="mt-5 text-ink/50">
            If your church runs differently and something here does not fit, we would rather hear
            it than not.
          </p>
          <div className="mt-9 flex justify-center">
            <CTA href="/contact" variant="ghost">
              Tell us what is missing <Arrow />
            </CTA>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-ink py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 text-center">
          <h2 className="text-2xl sm:text-4xl font-semibold text-white tracking-tight text-balance">
            See whether it fits how your church already works.
          </h2>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <CTA href="/signup" size="lg" variant="primary">
              Start free <Arrow />
            </CTA>
            <CTA href="/features" size="lg" variant="outline">
              Read the detail
            </CTA>
          </div>
        </div>
      </section>
    </>
  );
}
