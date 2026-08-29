import { describe, it, expect } from "vitest";
import { programmeEntrySchema } from "@/lib/validations/programme";

const base = {
  branch_id: "11111111-1111-4111-8111-111111111111",
  service_type_id: "22222222-2222-4222-8222-222222222222",
  venue_id: "33333333-3333-4333-8333-333333333333",
  programme_date: "2026-08-23",
  programme_name: "Sunday Service",
  classification: "routine" as const,
  guest_minister_ids: [],
  men_count: 10,
  women_count: 10,
  teenagers_count: 5,
  children_count: 5,
  first_timers_count: 0,
  converts_count: 0,
  new_births_count: 0,
  weddings_count: 0,
};

describe("programmeEntrySchema", () => {
  it("accepts a valid minimal submission with duplicate_override defaulting to false", () => {
    const result = programmeEntrySchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.duplicate_override).toBe(false);
    }
  });

  it("rejects a missing branch_id", () => {
    const result = programmeEntrySchema.safeParse({ ...base, branch_id: "" });
    expect(result.success).toBe(false);
  });

  it("allows an override with a reason (SRV-08)", () => {
    const result = programmeEntrySchema.safeParse({
      ...base,
      duplicate_override: true,
      duplicate_override_reason: "Second Sunday service",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative attendance counts", () => {
    const result = programmeEntrySchema.safeParse({ ...base, men_count: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts a guest preacher with a free-text name", () => {
    const result = programmeEntrySchema.safeParse({
      ...base,
      preacher_type: "guest",
      guest_preacher_name: "Pastor Jane Smith",
    });
    expect(result.success).toBe(true);
  });

  it("requires a name when guest preacher is selected", () => {
    const result = programmeEntrySchema.safeParse({
      ...base,
      preacher_type: "guest",
      guest_preacher_name: "",
    });
    expect(result.success).toBe(false);
  });

  it("requires an existing preacher id when existing preacher is selected", () => {
    const result = programmeEntrySchema.safeParse({
      ...base,
      preacher_type: "existing",
      preacher_id: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows no preacher without tripping over an empty select value", () => {
    const result = programmeEntrySchema.safeParse({
      ...base,
      preacher_type: "none",
      preacher_id: "",
    });
    expect(result.success).toBe(true);
  });
});
