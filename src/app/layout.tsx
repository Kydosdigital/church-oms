import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations",
  description: "Attendance, service outcomes, offerings, approvals, analytics and reporting.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${brandSans.variable}`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
