import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { fundraisingProjectAcceptsProgrammeDate } from "@/lib/fundraising";
import {
  fundraisingProjectSettingsSchema,
  offeringCategorySchema,
} from "@/lib/validations/revenue";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0036_fundraising_project_windows.sql"),
  "utf8"
);
const revenueData = readFileSync(
  resolve(process.cwd(), "src/lib/data/revenue.ts"),
  "utf8"
);
const revenuePage = readFileSync(
  resolve(process.cwd(), "src/app/(app)/revenue/[programmeId]/page.tsx"),
  "utf8"
);
const categoryForm = readFileSync(
  resolve(process.cwd(), "src/components/forms/category-form.tsx"),
  "utf8"
);
const projectSettingsForm = readFileSync(
  resolve(process.cwd(), "src/components/forms/project-settings-form.tsx"),
  "utf8"
);

const window = {
  start_date: "2026-08-10",
  end_date: "2026-08-20",
  accepting_entries_after_end_override: false,
};

describe("fundraising project programme-date availability", () => {
  it("blocks a programme before the configured start date", () => {
    expect(
      fundraisingProjectAcceptsProgrammeDate(window, "2026-08-09")
    ).toBe(false);
  });

  it("accepts the project start and end dates inclusively", () => {
    expect(
      fundraisingProjectAcceptsProgrammeDate(window, "2026-08-10")
    ).toBe(true);
    expect(
      fundraisingProjectAcceptsProgrammeDate(window, "2026-08-20")
    ).toBe(true);
  });

  it("blocks post-end entries until the explicit override is enabled", () => {
    expect(
      fundraisingProjectAcceptsProgrammeDate(window, "2026-08-21")
    ).toBe(false);
    expect(
      fundraisingProjectAcceptsProgrammeDate(
        { ...window, accepting_entries_after_end_override: true },
        "2026-08-21"
      )
    ).toBe(true);
  });

  it("does not let the after-end override bypass the start date", () => {
    expect(
      fundraisingProjectAcceptsProgrammeDate(
        { ...window, accepting_entries_after_end_override: true },
        "2026-08-09"
      )
    ).toBe(false);
  });

  it("treats a missing project configuration as unavailable", () => {
    expect(
      fundraisingProjectAcceptsProgrammeDate(null, "2026-08-15")
    ).toBe(false);
  });
});

describe("fundraising project settings validation", () => {
  it("rejects an end date before the start date", () => {
    expect(
      fundraisingProjectSettingsSchema.safeParse({
        start_date: "2026-09-10",
        end_date: "2026-09-01",
        accepting_entries_after_end_override: false,
      }).success
    ).toBe(false);
  });

  it("requires an end date before the after-end override can be enabled", () => {
    expect(
      fundraisingProjectSettingsSchema.safeParse({
        start_date: "2026-09-01",
        end_date: "",
        accepting_entries_after_end_override: true,
      }).success
    ).toBe(false);
  });

  it("allows an empty target amount", () => {
    const result = fundraisingProjectSettingsSchema.safeParse({
      target_amount: "",
      start_date: "",
      end_date: "",
      accepting_entries_after_end_override: false,
    });
    expect(result.success).toBe(true);
  });

  it("enforces the same override rule when creating a project category", () => {
    expect(
      offeringCategorySchema.safeParse({
        name: "Building project",
        category_type: "project",
        applies_to_all_service_types: true,
        service_type_ids: [],
        end_date: "",
        accepting_entries_after_end_override: true,
      }).success
    ).toBe(false);
  });
});

describe("fundraising project database boundary", () => {
  it("backfills one project settings row for legacy project categories", () => {
    expect(migration).toContain(
      "insert into public.fundraising_projects (category_id)"
    );
    expect(migration).toContain(
      "c.category_type = 'project'::public.offering_category_type"
    );
  });

  it("enforces date order in Postgres", () => {
    expect(migration).toContain("fundraising_projects_date_order");
    expect(migration).toContain("end_date >= start_date");
  });

  it("checks project windows on new revenue rows", () => {
    expect(migration).toContain("if tg_op = 'INSERT' then");
    expect(migration).toContain(
      "v_programme_date < v_start_date"
    );
    expect(migration).toContain(
      "v_programme_date > v_end_date"
    );
    expect(migration).toContain(
      "v_after_end_override"
    );
  });

  it("mirrors the project window in the revenue INSERT policy", () => {
    expect(migration).toContain(
      "p.programme_date >= fp.start_date"
    );
    expect(migration).toContain(
      "p.programme_date <= fp.end_date"
    );
    expect(migration).toContain(
      "fp.accepting_entries_after_end_override = true"
    );
  });

  it("audits project setting changes including the override", () => {
    expect(migration).toContain(
      "private.audit_fundraising_project_change"
    );
    expect(migration).toContain("'project_config_update'");
    expect(migration).toContain(
      "'accepting_entries_after_end_override'"
    );
  });
});

describe("fundraising project admin and finance UI", () => {
  it("filters new finance categories using the programme date", () => {
    expect(revenuePage).toContain("programme.programme_date");
    expect(revenueData).toContain(
      "fundraisingProjectAcceptsProgrammeDate("
    );
  });

  it("keeps categories with existing programme entries visible for correction", () => {
    expect(revenuePage).toContain(
      "entries.map((entry) => entry.category_id)"
    );
    expect(revenueData).toContain(
      "if (includeSet.has(category.id)) return true"
    );
  });

  it("validates category creation on the server", () => {
    expect(revenueData).toContain(
      "input = offeringCategorySchema.parse(input)"
    );
  });

  it("exposes the audited after-end override on create and edit", () => {
    expect(categoryForm).toContain(
      "Allow new entries after the project end date"
    );
    expect(projectSettingsForm).toContain(
      "Allow new entries after the end date"
    );
    expect(projectSettingsForm).toContain(
      "recorded in the audit log"
    );
  });

  it("saves target, dates and override through the administrator action", () => {
    expect(projectSettingsForm).toContain(
      "updateFundraisingProjectSettings"
    );
    expect(revenueData).toContain(
      "fundraisingProjectSettingsSchema.parse(input)"
    );
    expect(revenueData).toContain(
      "accepting_entries_after_end_override:"
    );
  });
});
