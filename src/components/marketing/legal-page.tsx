/**
 * Shared shell for the legal pages (privacy, terms) inside the marketing site.
 *
 * The marketing layout supplies <main>, so these pages must not render their
 * own. They also need a dark band at the top, because the site header floats
 * transparently over the first section of every marketing page.
 */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const updated = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="bg-ink pt-32 pb-16 sm:pt-40 sm:pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight">{title}</h1>
          <p className="mt-4 text-sm text-ink-muted">Last updated: {updated}</p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-16 sm:py-20">
        <div className="space-y-4 text-[0.95rem] leading-relaxed text-ink/70 [&_h2]:text-ink [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:pt-4">
          {children}
        </div>
      </div>
    </>
  );
}
