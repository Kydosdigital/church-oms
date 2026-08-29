import { z } from "zod";

const nonNegativeInt = z.coerce.number().int().min(0, "Must be zero or greater");

const optionalUuid = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().uuid().optional()
);

export const serviceDetailsSchema = z.object({
  branch_id: z.string().uuid("Select a branch"),
  service_type_id: z.string().uuid("Select a service type"),
  venue_id: z.string().uuid("Select a venue"),
  programme_date: z.string().min(1, "Date is required"),
  programme_name: z.string().min(1, "Programme name is required"),
  classification: z.enum(["routine", "special_event"]),
  preacher_type: z.enum(["none", "existing", "guest"]).default("none"),
  preacher_id: optionalUuid,
  guest_preacher_name: z.string().trim().max(120, "Guest preacher name is too long").optional(),
  guest_minister_ids: z.array(z.string().uuid()).default([]),
  sermon_topic: z.string().optional(),
});

export const attendanceSchema = z.object({
  men_count: nonNegativeInt,
  women_count: nonNegativeInt,
  teenagers_count: nonNegativeInt,
  children_count: nonNegativeInt,
  first_timers_count: nonNegativeInt,
  converts_count: nonNegativeInt,
  new_births_count: nonNegativeInt,
  weddings_count: nonNegativeInt,
  capacity_exception_note: z.string().optional(),
  outcome_exception_note: z.string().optional(),
});

export const notesSchema = z.object({
  notes: z.string().optional(),
});

/** SRV-08: a client-side check (src/lib/data/programmes.ts#checkDuplicateService)
 * warns when another occurrence already exists for the same branch/service
 * type/date. Not hard-blocked — duplicate_override records the acknowledgement
 * and duplicate_override_reason why (e.g. "second Sunday service", "make-up
 * midweek service"). The database backstops this with a partial unique index
 * that only allows a silent (non-overridden) duplicate to not exist. */
export const duplicateOverrideSchema = z.object({
  duplicate_override: z.boolean().default(false),
  duplicate_override_reason: z.string().optional(),
});

/** Full programme entry form, combining all wizard sections
 * (Service details, Attendance, Outcomes, Notes — section 8.1). */
export const programmeEntrySchema = serviceDetailsSchema
  .merge(attendanceSchema)
  .merge(notesSchema)
  .merge(duplicateOverrideSchema)
  .superRefine((values, ctx) => {
    if (values.preacher_type === "existing" && !values.preacher_id) {
      ctx.addIssue({
        code: "custom",
        path: ["preacher_id"],
        message: "Select the preacher",
      });
    }
    if (values.preacher_type === "guest" && !values.guest_preacher_name?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["guest_preacher_name"],
        message: "Enter the guest preacher's name",
      });
    }
  });

export const programmeCorrectionSchema = z
  .object({
    programme_name: z.string().min(1, "Programme name is required"),
    classification: z.enum(["routine", "special_event"]),
    preacher_type: z.enum(["none", "existing", "guest"]).default("none"),
    preacher_id: optionalUuid,
    guest_preacher_name: z
      .string()
      .trim()
      .max(120, "Guest preacher name is too long")
      .optional(),
    sermon_topic: z.string().optional(),
  })
  .merge(attendanceSchema)
  .merge(notesSchema)
  .superRefine((values, ctx) => {
    if (values.preacher_type === "existing" && !values.preacher_id) {
      ctx.addIssue({
        code: "custom",
        path: ["preacher_id"],
        message: "Select the preacher",
      });
    }
    if (
      values.preacher_type === "guest" &&
      !values.guest_preacher_name?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["guest_preacher_name"],
        message: "Enter the guest preacher's name",
      });
    }
  });

export type ProgrammeCorrectionValues = z.infer<
  typeof programmeCorrectionSchema
>;

export type ProgrammeEntryValues = z.infer<typeof programmeEntrySchema>;
export type ServiceDetailsValues = z.infer<typeof serviceDetailsSchema>;
export type AttendanceValues = z.infer<typeof attendanceSchema>;

export const returnRecordSchema = z.object({
  reason: z.string().min(3, "A reason is required to return a record"),
});

export const reopenRecordSchema = z.object({
  reason: z.string().min(3, "A reason is required to reopen a record"),
});
