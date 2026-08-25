import { getCurrentUserContext } from "@/lib/data/current-user";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { AppRole } from "@/types/domain";

const GUIDES: { role: string; summary: string; steps: string[] }[] = [
  {
    role: "Usher",
    summary: "Records each service's attendance and outcomes right after it happens.",
    steps: [
      "Go to Programmes → New programme.",
      "Fill in the service details (branch is locked to your assignment, so you'll only see venues for it), then attendance counts, then outcomes (first-timers, converts, new births, weddings).",
      "If a note about a duplicate service appears, confirm it's intentional (e.g. a second Sunday service) and add a short reason — otherwise double-check the date and service type.",
      "If attendance exceeds the venue's usual capacity, or outcomes exceed total attendance, add a one-line explanation when prompted.",
      "Review the summary, then Sign & submit. This records your name, the time, and locks the record for an attendance verifier to review — you can no longer edit it unless it's returned to you.",
      "You can also Save draft to come back to a record before submitting it.",
    ],
  },
  {
    role: "Attendance verifier",
    summary: "Independently checks a submitted attendance record before it's treated as final.",
    steps: [
      "Open Programmes and find records in the \"submitted\" state.",
      "Compare the recorded counts against whatever your church uses to cross-check (headcount sheets, greeters' tallies, etc.).",
      "If everything looks right, Verify it — this locks the record. If something looks off, Return it with a reason so the usher can correct and resubmit.",
      "You can't verify a record you submitted yourself — a different person always has to check it.",
    ],
  },
  {
    role: "Treasurer",
    summary: "Records what was given at a service, by category and by physical/online channel.",
    steps: [
      "Open the programme for the service, then go to its Revenue section.",
      "Enter physical and online amounts for each offering category that applies (tithe, general offering, project giving, etc.) — categories are set up by your administrator under Offering categories.",
      "If you don't have \"view past financial records\" permission, you'll only see the current service's entry, not other services' history or totals — that's expected, not a bug.",
      "Submit once entered. A finance verifier (a different person) checks it before it locks.",
    ],
  },
  {
    role: "Finance verifier",
    summary: "Independently checks a submitted offering record before it locks.",
    steps: [
      "Open the programme's Revenue section for records in the \"submitted\" state.",
      "Cross-check the amounts against whatever your church's counting process produced.",
      "Verify if correct, or Return with a reason if something needs correcting.",
      "You can't verify an entry you submitted yourself.",
    ],
  },
  {
    role: "Pastor",
    summary: "Views dashboards and trends across branches — no data entry required.",
    steps: [
      "Dashboard shows attendance and (if you have finance visibility) revenue trends, pending approvals, and project fundraising progress, for whatever date range you pick.",
      "Reports lets you download the underlying data as CSV or Excel, and print a single programme's report.",
      "Being a pastor doesn't automatically grant finance visibility — that's a separate permission your administrator sets, by design (so church finances stay need-to-know).",
    ],
  },
  {
    role: "Administrator",
    summary: "Sets up the church, its branches, service types, offering categories, and everyone's access.",
    steps: [
      "Branches & venues: add branches and their venues, each with a default capacity used for the capacity-exceeded warning.",
      "Offering categories: configure general, project and special giving categories.",
      "Users & roles: invite people by email, assign roles per branch (or church-wide), and independently toggle finance access and \"view past financial records\" per person.",
      "Church settings: currency, timezone, the month your reporting year starts, and whether finance records require a second, independent verifier.",
      "Audit log: a read-only, unchangeable trail of every create/edit/verify/reopen action, for accountability.",
      "As administrator you don't automatically see finance data — assign yourself finance_permission explicitly if you need it, same as anyone else.",
    ],
  },
];

export default async function HelpPage() {
  const ctx = await getCurrentUserContext();
  const myRoles = new Set((ctx?.roles ?? []).map((r) => r.role));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Help & role guides</h1>
        <p className="text-sm text-muted">
          A short guide for each role in the system. Guides for roles assigned to you are shown
          first.
        </p>
      </div>

      {GUIDES.slice()
        .sort((a, b) => {
          const aMine = myRoles.has(a.role.toLowerCase().replace(" ", "_") as AppRole) ? 0 : 1;
          const bMine = myRoles.has(b.role.toLowerCase().replace(" ", "_") as AppRole) ? 0 : 1;
          return aMine - bMine;
        })
        .map((guide) => (
          <Card key={guide.role}>
            <CardHeader>
              <CardTitle>{guide.role}</CardTitle>
              <CardDescription>{guide.summary}</CardDescription>
            </CardHeader>
            <ol className="list-decimal list-inside space-y-1.5 text-sm">
              {guide.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </Card>
        ))}

      <Card>
        <CardHeader>
          <CardTitle>Legal</CardTitle>
        </CardHeader>
        <p className="text-sm">
          <a href="/privacy" className="text-brand underline">Privacy policy</a>
          {" · "}
          <a href="/terms" className="text-brand underline">Terms of use</a>
        </p>
      </Card>
    </div>
  );
}
