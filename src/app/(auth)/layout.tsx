import Image from "next/image";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center px-4 py-12 outline-none">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Image
            src="/brand/church-oms-logo-primary-transparent.png"
            alt={process.env.NEXT_PUBLIC_APP_NAME ?? "Church Operations"}
            width={180}
            height={40}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
        {children}
      </div>
    </main>
  );
}
