import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted">
          The page you&rsquo;re looking for doesn&rsquo;t exist or you don&rsquo;t have access to it.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-brand bg-brand text-brand-foreground px-4 h-10 text-sm font-medium"
        >
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
