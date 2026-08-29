import { z } from "zod";

const nonNegativeAmount = z.coerce.number().min(0, "Amount cannot be negative");

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

export const offeringCategorySchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    category_type: z.enum(["general", "project", "special"]),
    applies_to_all_service_types: z.boolean().default(true),
    service_type_ids: z.array(z.string().uuid()).default([]),
    target_amount: z.coerce.number().positive().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
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
  });

export type OfferingCategoryValues = z.infer<typeof offeringCategorySchema>;
