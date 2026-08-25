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
  "super_admin",
] as const;

const optionalBranchId = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().uuid().optional()
);

export const userRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(appRoleValues),
  branch_id: optionalBranchId, // omitted/empty = all branches
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

/**
 * Administrator invitation flow for an existing church. The user's first
 * role is created before the invitation is considered complete, so accepting
 * the invite never drops a staff member into an unconfigured account.
 */
export const inviteUserWithRoleSchema = inviteUserSchema.extend({
  role: z.enum(appRoleValues),
  branch_id: optionalBranchId,
  finance_permission: z.boolean().default(false),
  finance_history_permission: z.boolean().default(true),
});
export type InviteUserWithRoleValues = z.infer<typeof inviteUserWithRoleSchema>;

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
