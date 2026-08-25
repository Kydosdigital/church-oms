/**
 * PLACEHOLDER PRICING — set real numbers before launch.
 *
 * These amounts are structural placeholders so the pricing page has a shape to
 * render. They have NOT been set by the business. Everything the marketing site
 * displays about price reads from this one file, so changing the numbers,
 * currency symbol or billing period here updates the pricing page, the
 * homepage teaser and the pricing JSON-LD together.
 */

export const CURRENCY = "$";
export const CURRENCY_CODE = "USD";
export const BILLING_PERIOD = "month";

export interface Tier {
  id: string;
  name: string;
  price: number | null;
  priceLabel?: string;
  tagline: string;
  bestFor: string;
  featured?: boolean;
  cta: { label: string; href: string };
  features: string[];
  limits: {
    branches: string;
    users: string;
    history: string;
    support: string;
  };
}

export const TIERS: Tier[] = [
  {
    id: "single",
    name: "Single Church",
    price: 0,
    priceLabel: "Free",
    tagline: "Everything one congregation needs to stop recording services on paper.",
    bestFor: "One location, up to about 10 people entering or checking records.",
    cta: { label: "Start free", href: "/signup" },
    features: [
      "Attendance and service outcomes",
      "Offerings by category, physical and online",
      "Two-person verification on every record",
      "Dashboards and trends",
      "CSV and Excel export",
      "Full audit trail",
    ],
    limits: {
      branches: "1 branch",
      users: "Up to 10 users",
      history: "Full history",
      support: "Email support",
    },
  },
  {
    id: "multi",
    name: "Multi-Branch",
    price: 29,
    tagline: "For churches running several locations or services that need separate books.",
    bestFor: "Two or more branches, each with its own ushers and treasurers.",
    featured: true,
    cta: { label: "Start free trial", href: "/signup" },
    features: [
      "Everything in Single Church",
      "Unlimited branches and venues",
      "Branch-scoped roles and permissions",
      "Per-branch and consolidated reporting",
      "Fundraising project tracking",
      "Print-ready service reports",
      "Priority email support",
    ],
    limits: {
      branches: "Unlimited branches",
      users: "Unlimited users",
      history: "Full history",
      support: "Priority email support",
    },
  },
  {
    id: "diocese",
    name: "Network",
    price: null,
    priceLabel: "Talk to us",
    tagline: "For denominations, dioceses and church networks overseeing many churches.",
    bestFor: "Central oversight across independent churches, with onboarding support.",
    cta: { label: "Contact sales", href: "/contact" },
    features: [
      "Everything in Multi-Branch",
      "Network-level rollup reporting",
      "Assisted onboarding and data migration",
      "Custom offering categories and roles",
      "Named point of contact",
    ],
    limits: {
      branches: "Unlimited churches",
      users: "Unlimited users",
      history: "Full history",
      support: "Named contact",
    },
  },
];

export function formatPrice(tier: Tier): string {
  if (tier.price === null) return tier.priceLabel ?? "Talk to us";
  if (tier.price === 0) return tier.priceLabel ?? "Free";
  return `${CURRENCY}${tier.price}`;
}
