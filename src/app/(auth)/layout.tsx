export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 flex items-center justify-center px-4 py-12 outline-none">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
