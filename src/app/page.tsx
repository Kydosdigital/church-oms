import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-24 text-center outline-none">
      <span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-medium text-brand">
        {process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations"}
      </span>
      <h1 className="text-3xl sm:text-4xl font-semibold max-w-xl">
        One controlled record for every service — attendance, outcomes, offerings and sign-off.
      </h1>
      <p className="max-w-md text-muted">
        Capture service information quickly, verify it responsibly, and turn it into timely
        operational insight.
      </p>
      <div className="flex gap-3">
        <Link href="/login">
          <Button size="lg">Sign in</Button>
        </Link>
      </div>
      <p className="text-xs text-muted mt-8">
        <Link href="/privacy" className="underline">Privacy policy</Link>
        {" · "}
        <Link href="/terms" className="underline">Terms of use</Link>
      </p>
    </main>
  );
}
