import { z } from "zod";

export const branchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  is_primary: z.boolean().default(false),
});
export type BranchValues = z.infer<typeof branchSchema>;

export const venueSchema = z.object({
  branch_id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  default_capacity: z.coerce.number().int().positive("Capacity must be greater than zero"),
});
export type VenueValues = z.infer<typeof venueSchema>;

export const serviceTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
});
export type ServiceTypeValues = z.infer<typeof serviceTypeSchema>;

export const appRoleValues = [
  "usher",
  "attendance_verifier",
  "treasurer",
  "finance_verifier",
  "pastor",
  "administrator",
] as const;

export const userRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(appRoleValues),
  branch_id: z.string().uuid().optional(), // omitted/empty = all branches
  finance_permission: z.boolean().default(false),
  // Only meaningful when finance_permission is true; defaults to full access
  // so a newly-assigned finance role isn't unexpectedly restricted.
  finance_history_permission: z.boolean().default(true),
});
export type UserRoleValues = z.infer<typeof userRoleSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  full_name: z.string().min(1, "Name is required"),
});
export type InviteUserValues = z.infer<typeof inviteUserSchema>;

export const provisionChurchSchema = z.object({
  name: z.string().min(1, "Church name is required"),
  currency: z.string().min(3, "Use a 3-letter currency code").max(3).toUpperCase(),
  timezone: z.string().min(1, "Timezone is required"),
});
export type ProvisionChurchValues = z.infer<typeof provisionChurchSchema>;

export const churchSettingsSchema = z.object({
  name: z.string().min(1, "Church name is required"),
  currency_code: z.string().min(3, "Use a 3-letter currency code").max(3).toUpperCase(),
  timezone: z.string().min(1, "Timezone is required"),
  reporting_year_start_month: z.coerce.number().int().min(1).max(12),
  finance_requires_independent_verification: z.boolean().default(true),
});
export type ChurchSettingsValues = z.infer<typeof churchSettingsSchema>;
