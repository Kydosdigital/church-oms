import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Public marketing site shell.
 *
 * Every page in this group opens with a dark section, which is what lets the
 * header float transparently at the top of the page and turn solid on scroll.
 * If you add a page here, give it a dark hero or pass the header a solid
 * variant, otherwise white-on-white nav links.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-root flex-1 flex flex-col">
      <SiteHeader overHero />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
