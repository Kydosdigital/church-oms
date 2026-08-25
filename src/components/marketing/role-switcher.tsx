"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { Check } from "./ui";

const ROLES = [
  {
    id: "usher",
    name: "Usher",
    headline: "Record the service before you leave the building.",
    body:
      "A phone-first wizard walks through service details, attendance counts, outcomes and notes, then asks you to sign off. If a number looks wrong, it says so at the point of entry rather than three weeks later.",
    points: [
      "Counts for men, women, teenagers and children",
      "First-timers, converts, new births and weddings",
      "Warns on capacity overruns and impossible totals",
      "Locked to your own branch, so you can't file to the wrong one",
    ],
  },
  {
    id: "treasurer",
    name: "Treasurer",
    headline: "Enter the offering once, in the categories you actually use.",
    body:
      "Offering categories are yours to define — general, project, special, whatever your church calls them. Record physical and online giving separately, and watch fundraising projects move against target.",
    points: [
      "Configurable offering categories",
      "Physical and online giving recorded separately",
      "Fundraising project progress against target",
      "Your entry stays yours until someone verifies it",
    ],
  },
  {
    id: "verifier",
    name: "Verifier",
    headline: "Check someone else's work, then lock it.",
    body:
      "Verification is a real second pair of eyes, not a checkbox. You can lock a record, or send it back with a reason for correction. What you cannot do is verify something you submitted yourself.",
    points: [
      "Review submitted records with full context",
      "Return with a reason instead of silently editing",
      "Locking is final until someone reopens it, with a reason",
      "Self-verification is blocked in the database, not the interface",
    ],
  },
  {
    id: "pastor",
    name: "Pastor",
    headline: "See the trend without chasing anyone for a number.",
    body:
      "Dashboards show attendance and giving over any period you choose, plus what's still waiting on verification. No data entry, no spreadsheets, no waiting until the end of the month.",
    points: [
      "Attendance and revenue trends over any date range",
      "Outstanding approvals at a glance",
      "Giving split by physical and online channel",
      "Financial visibility only if it's been explicitly granted",
    ],
  },
  {
    id: "admin",
    name: "Administrator",
    headline: "Set up the church once, then manage who can do what.",
    body:
      "Branches, venues, service types, offering categories, currency, timezone and reporting year all live in settings. Roles and permissions are assigned per person, per branch.",
    points: [
      "Full CRUD on branches, venues and service types",
      "Invite people by email",
      "Grant finance access explicitly, per person",
      "Read the audit log of every change ever made",
    ],
  },
];

export function RoleSwitcher() {
  const [active, setActive] = useState(ROLES[0].id);
  const role = ROLES.find((r) => r.id === active) ?? ROLES[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Choose a role"
        className="flex flex-wrap gap-2 justify-center"
      >
        {ROLES.map((r) => (
          <button
            key={r.id}
            role="tab"
            type="button"
            id={`role-tab-${r.id}`}
            aria-selected={r.id === active}
            aria-controls={`role-panel-${r.id}`}
            onClick={() => setActive(r.id)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-medium transition-all",
              r.id === active
                ? "bg-ink text-white shadow-lg shadow-ink/20"
                : "bg-white text-ink/70 border border-ink/10 hover:border-ink/25 hover:text-ink"
            )}
          >
            {r.name}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`role-panel-${role.id}`}
        aria-labelledby={`role-tab-${role.id}`}
        className="mt-10 rounded-3xl bg-white border border-ink/10 shadow-xl shadow-ink/5 p-8 sm:p-12"
      >
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
              {role.name}
            </p>
            <h3 className="mt-3 text-2xl sm:text-3xl font-semibold text-ink leading-tight text-balance">
              {role.headline}
            </h3>
            <p className="mt-4 text-ink/60 leading-relaxed">{role.body}</p>
          </div>
          <ul className="space-y-3.5">
            {role.points.map((point) => (
              <li key={point} className="flex gap-3 text-ink/75">
                <Check className="text-brand mt-0.5" />
                <span className="text-[0.95rem] leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
