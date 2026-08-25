import Link from "next/link";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1 px-6 py-16 max-w-2xl mx-auto space-y-6 outline-none">
      <div>
        <Link href="/" className="text-sm text-brand underline">
          ← Back
        </Link>
      </div>
      <h1 className="text-2xl font-semibold">Privacy policy</h1>
      <p className="text-sm text-muted">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          This application is operated on behalf of your church to record attendance, service
          outcomes, and giving/offering information as part of normal church operations
          management. This policy explains what information is stored and how it&rsquo;s used.
        </p>

        <h2 className="text-lg font-semibold pt-2">What we store</h2>
        <p>
          Account information (name, email address) for anyone with sign-in access; attendance
          counts recorded per service (not attached to individual attendee names); giving/offering
          amounts recorded per service and category (not attached to individual givers&rsquo;
          names unless your church separately records that information outside this system); and
          an audit trail of who created, edited, verified, or reopened each record and when.
        </p>

        <h2 className="text-lg font-semibold pt-2">Who can see what</h2>
        <p>
          Access is role- and branch-scoped. Financial data additionally requires an explicit,
          independently-grantable permission — having an administrator or pastor role does not by
          itself grant access to giving records. The audit log is visible to administrators only,
          and cannot be edited or deleted by anyone, including administrators.
        </p>

        <h2 className="text-lg font-semibold pt-2">Data retention and deletion</h2>
        <p>
          Records are retained for as long as your church chooses to operate this system, in line
          with its own record-keeping practices. To request deletion or export of your personal
          account information, contact your church administrator, who can action this directly or
          escalate to the platform operator on your behalf.
        </p>

        <h2 className="text-lg font-semibold pt-2">Security</h2>
        <p>
          Access is enforced at the database level (row-level security), not just in this
          application&rsquo;s interface, so the same rules apply regardless of how data is
          accessed. Passwords are never stored by this application directly — authentication is
          handled by Supabase Auth.
        </p>

        <h2 className="text-lg font-semibold pt-2">Contact</h2>
        <p>Questions about this policy should be directed to your church administrator.</p>
      </div>
    </main>
  );
}
