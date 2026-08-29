import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { offeringCategorySchema } from "@/lib/validations/revenue";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0033_reference_scope_integrity.sql"),
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
const revenueData = readFileSync(
  resolve(process.cwd(), "src/lib/data/revenue.ts"),
  "utf8"
);

const scopedBase = {
  name: "Sunday Missions",
  category_type: "special" as const,
  applies_to_all_service_types: false,
  service_type_ids: ["11111111-1111-4111-8111-111111111111"],
};

describe("offering category service scope", () => {
  it("allows a category that applies to every service type", () => {
    expect(
      offeringCategorySchema.safeParse({
        ...scopedBase,
        applies_to_all_service_types: true,
        service_type_ids: [],
      }).success
    ).toBe(true);
  });

  it("requires at least one service type for a scoped category", () => {
    const result = offeringCategorySchema.safeParse({
      ...scopedBase,
      service_type_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts an explicitly scoped category", () => {
    expect(offeringCategorySchema.safeParse(scopedBase).success).toBe(true);
  });

  it("rejects a project end date before its start date", () => {
    const result = offeringCategorySchema.safeParse({
      ...scopedBase,
      category_type: "project",
      start_date: "2026-09-10",
      end_date: "2026-09-01",
    });
    expect(result.success).toBe(false);
  });

  it("filters finance entry categories by the programme service type", () => {
    expect(revenuePage).toContain(
      "listActiveCategories(programme.service_type_id)"
    );
    expect(revenueData).toContain(
      "category.applies_to_all_service_types ||"
    );
    expect(revenueData).toContain(
      "scope.service_type_id === serviceTypeId"
    );
  });

  it("exposes service-type scope in the administrator form", () => {
    expect(categoryForm).toContain("Available for all service types");
    expect(categoryForm).toContain('register("service_type_ids")');
    expect(categoryForm).toContain("Select service types");
  });
});

describe("reference-scope integrity migration", () => {
  it("keeps guest ministers inside the signed-in church", () => {
    expect(migration).toContain(
      "m.church_id = private.current_church_id()"
    );
    expect(migration).toContain("m.active = true");
  });

  it("keeps category-to-service mappings inside the church", () => {
    expect(migration).toContain(
      "s.church_id = private.current_church_id()"
    );
    expect(migration).toContain("s.active = true");
  });

  it("binds revenue categories to the programme church and service type", () => {
    expect(migration).toContain("c.church_id = p.church_id");
    expect(migration).toContain(
      "c.applies_to_all_service_types = true"
    );
    expect(migration).toContain("cs.service_type_id = p.service_type_id");
  });

  it("requires new revenue entries to use active categories", () => {
    const insertStart = migration.indexOf("create policy revenue_insert");
    const updateStart = migration.indexOf("create policy revenue_update");
    const insertPolicy = migration.slice(insertStart, updateStart);
    expect(insertPolicy).toContain("c.active = true");
  });

  it("does not make category deactivation destroy correction access to historic rows", () => {
    const updateStart = migration.indexOf("create policy revenue_update");
    const updatePolicy = migration.slice(updateStart);
    expect(updatePolicy).not.toContain("c.active = true");
    expect(updatePolicy).toContain("c.church_id = p.church_id");
  });

  it("checks child configuration writes instead of silently ignoring failures", () => {
    expect(revenueData).toContain("if (scopeError) throw scopeError");
    expect(revenueData).toContain("if (projectError) throw projectError");
    expect(revenueData).toContain("Could not finish category setup");
  });
});
