import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/marketing/contact-form";
import { Eyebrow } from "@/components/marketing/ui";
import { CONTACT_EMAIL, RESPONSE_TIME, SITE_NAME, SITE_URL } from "@/lib/marketing/site";

const title = "Contact";
const description =
  "Questions about plans, multi-branch setup, migrating your existing records or how access " +
  "control works? Tell us about your church and we will answer plainly.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: { title, description, url: "/contact" },
  twitter: { title, description },
};

const ROUTES = [
  {
    h: "Choosing between plans",
    p: "Tell us how many locations you run and how many people would be entering records, and we will tell you which plan you need. Usually it is the free one.",
  },
  {
    h: "Moving existing records across",
    p: "If you have years of attendance in a spreadsheet, say what shape it is in. We will tell you honestly whether it is worth importing or better to start fresh.",
  },
  {
    h: "Security and data questions",
    p: "Happy to go into detail on how row-level security, verification and the audit log actually work, including for a trustee or finance committee that needs convincing.",
  },
  {
    h: "Something that does not fit",
    p: "If your church runs in a way this software does not handle, that is useful to know. We would rather hear about the gap than have you work around it quietly.",
  },
];

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${SITE_NAME}`,
    url: `${SITE_URL}/contact`,
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales and support",
        email: CONTACT_EMAIL,
        availableLanguage: "English",
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero — short ink band, then the layout immediately splits */}
      <section className="bg-ink pt-32 pb-20 sm:pt-40 sm:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <Eyebrow tone="dark">Contact</Eyebrow>
            <h1 className="mt-5 text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-[1.08] text-balance">
              Talk to the people who built it.
            </h1>
            <p className="mt-6 text-lg text-ink-muted leading-relaxed">
              No sales team, no qualification call, no sequence of follow-up emails. Send a
              message and you will get a straight answer {RESPONSE_TIME}.
            </p>
          </div>
        </div>
      </section>

      {/* Split — form on the left, context on the right (inverted from other pages) */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16 items-start">
            <ContactForm />

            <div className="lg:pt-4">
              <h2 className="text-xl font-semibold text-ink">What people usually ask about</h2>
              <dl className="mt-7 space-y-7">
                {ROUTES.map((route) => (
                  <div key={route.h} className="border-l-2 border-brand/30 pl-5">
                    <dt className="font-medium text-ink">{route.h}</dt>
                    <dd className="mt-1.5 text-[0.93rem] text-ink/55 leading-relaxed">
                      {route.p}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-10 rounded-2xl bg-[#f6f8fa] border border-ink/10 p-6">
                <h3 className="font-medium text-ink">Prefer email?</h3>
                <p className="mt-2 text-[0.93rem] text-ink/60 leading-relaxed">
                  Write to{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-brand underline underline-offset-2 break-all"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  . It reaches the same place as the form.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-ink/10 p-6">
                <h3 className="font-medium text-ink">Already using Church OMS?</h3>
                <p className="mt-2 text-[0.93rem] text-ink/60 leading-relaxed">
                  For help inside the app, your church administrator can usually sort it fastest.
                  Signed-in users can also read the{" "}
                  <Link href="/login" className="text-brand underline underline-offset-2">
                    per-role guides
                  </Link>{" "}
                  in the help section.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing reassurance band — full width, single line of type */}
      <section className="bg-ink py-16">
        <div className="mx-auto max-w-4xl px-5 sm:px-8 text-center">
          <p className="text-xl sm:text-2xl text-white font-medium leading-snug text-balance">
            You do not need to be ready to buy anything to get in touch.
          </p>
          <p className="mt-4 text-ink-muted">
            If Church OMS is the wrong fit for your church, we will say so.
          </p>
        </div>
      </section>
    </>
  );
}
