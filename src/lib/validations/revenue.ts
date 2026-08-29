import { z } from "zod";

const nonNegativeAmount = z.coerce.number().min(0, "Amount cannot be negative");

const optionalPositiveAmount = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().positive("Target amount must be greater than zero").optional()
);

export const revenueEntrySchema = z.object({
  category_id: z.string().uuid(),
  physical_amount: nonNegativeAmount,
  online_amount: nonNegativeAmount,
  notes: z.string().optional(),
});

export const revenueFormSchema = z.object({
  programme_id: z.string().uuid(),
  entries: z.array(revenueEntrySchema).min(1, "Enter at least one category amount"),
});

export type RevenueFormValues = z.infer<typeof revenueFormSchema>;

export const fundraisingProjectSettingsSchema = z
  .object({
    target_amount: optionalPositiveAmount,
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    accepting_entries_after_end_override: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (
      values.start_date &&
      values.end_date &&
      values.end_date < values.start_date
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "End date cannot be before the start date",
      });
    }

    if (values.accepting_entries_after_end_override && !values.end_date) {
      ctx.addIssue({
        code: "custom",
        path: ["accepting_entries_after_end_override"],
        message: "Set an end date before allowing entries after the end date",
      });
    }
  });

export type FundraisingProjectSettingsValues = z.infer<
  typeof fundraisingProjectSettingsSchema
>;

export const offeringCategorySchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    category_type: z.enum(["general", "project", "special"]),
    applies_to_all_service_types: z.boolean().default(true),
    service_type_ids: z.array(z.string().uuid()).default([]),
    target_amount: optionalPositiveAmount,
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    accepting_entries_after_end_override: z.boolean().default(false),
  })
  .superRefine((values, ctx) => {
    if (
      !values.applies_to_all_service_types &&
      values.service_type_ids.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["service_type_ids"],
        message: "Select at least one service type",
      });
    }

    if (
      values.start_date &&
      values.end_date &&
      values.end_date < values.start_date
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "End date cannot be before the start date",
      });
    }

    if (
      values.category_type === "project" &&
      values.accepting_entries_after_end_override &&
      !values.end_date
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["accepting_entries_after_end_override"],
        message: "Set an end date before allowing entries after the end date",
      });
    }
  });

export type OfferingCategoryValues = z.infer<typeof offeringCategorySchema>;
