import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";

// Brand font (21st.dev palette specifies Open Sans). Loaded once here and
// exposed as a CSS variable that globals.css's --font-sans points at — if
// branding changes again, swap the import + variable here and the hex values
// in globals.css; nothing else in the app needs to change.
const brandSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://church-oms.vercel.app";
const description =
  "Church Operations Management System: attendance, service outcomes, and offerings, each " +
  "recorded and independently verified before it's treated as final, with role-based " +
  "dashboards, exports, and audit history built in.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: appName,
    template: `%s · ${appName}`,
  },
  description,
  applicationName: appName,
  keywords: [
    "church management software",
    "church attendance software",
    "church attendance tracking",
    "church offering and giving software",
    "church operations management",
    "church administration system",
  ],
  authors: [{ name: appName }],
  // Sensible default: index the public marketing/legal pages. Anything
  // behind auth overrides this to noindex in its own layout/page metadata
  // (see (app)/layout.tsx, (auth)/layout.tsx, onboarding/page.tsx) — this
  // is a second line of defence alongside robots.ts's Disallow rules.
  robots: { index: true, follow: true },
  // icon.png / apple-icon.png in this directory already register themselves
  // via Next's file-convention metadata — no manual `icons` field needed.
  openGraph: {
    type: "website",
    siteName: appName,
    title: appName,
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1419",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${brandSans.variable}`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-brand focus:bg-brand focus:text-brand-foreground focus:px-4 focus:py-2"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
