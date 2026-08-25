import { LegalPage } from "@/components/marketing/legal-page";

export const metadata = {
  title: "Terms of use",
  description: "The terms governing use of Church Operations Management System.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use">

        <p>
          This application is provided to your church for internal operations management —
          recording attendance, service outcomes, offerings, and related approvals. By using it,
          you agree to the following.
        </p>

        <h2 className="text-lg font-semibold pt-2">Acceptable use</h2>
        <p>
          Access is granted per person by your church administrator and is not transferable. You
          agree to use your access only for the purposes your role is assigned, to keep your
          credentials confidential, and not to attempt to access records outside your assigned
          branch or permissions.
        </p>

        <h2 className="text-lg font-semibold pt-2">Accuracy of records</h2>
        <p>
          Attendance and financial records submitted through this system are treated as an
          authoritative account of what was recorded, including a timestamp and your identity as
          submitter or verifier. Submitting a record you know to be inaccurate is a misuse of this
          system and a matter for your church&rsquo;s own internal policies.
        </p>

        <h2 className="text-lg font-semibold pt-2">Availability</h2>
        <p>
          This application is provided on an as-available basis. While reasonable efforts are made
          to keep it available and your data intact, no guarantee is made against downtime, data
          loss, or errors, and it should not be relied upon as the sole record of any legally or
          financially significant transaction without your church&rsquo;s own reconciliation
          process.
        </p>

        <h2 className="text-lg font-semibold pt-2">Changes</h2>
        <p>
          These terms may be updated from time to time. Continued use of the application after a
          change constitutes acceptance of the updated terms.
        </p>

        <h2 className="text-lg font-semibold pt-2">Contact</h2>
        <p>Questions about these terms should be directed to your church administrator.</p>
    </LegalPage>
  );
}
