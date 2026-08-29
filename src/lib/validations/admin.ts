import { z } from "zod";
import { isValidTimeZone } from "@/lib/timezones";

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

/** Roles that an ordinary Administrator may manage. */
export const ordinaryAppRoleValues = [
  "usher",
  "attendance_verifier",
  "treasurer",
  "finance_verifier",
  "pastor",
  "administrator",
] as const;

/** Complete church role list. Super Admin is only assignable by Super Admin. */
export const appRoleValues = [...ordinaryAppRoleValues, "super_admin"] as const;

const optionalBranchId = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().uuid().optional()
);

// Keep the legacy admin action limited to ordinary roles. Super Admin flows
// use managedUserRoleSchema and the guarded user-access server actions.
export const userRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(ordinaryAppRoleValues),
  branch_id: optionalBranchId, // omitted/empty = all branches
  finance_permission: z.boolean().default(false),
  finance_history_permission: z.boolean().default(true),
});
export type UserRoleValues = z.infer<typeof userRoleSchema>;

export const managedUserRoleSchema = userRoleSchema.extend({
  role: z.enum(appRoleValues),
});
export type ManagedUserRoleValues = z.infer<typeof managedUserRoleSchema>;

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

const timeZoneSchema = z
  .string()
  .min(1, "Timezone is required")
  .refine(isValidTimeZone, "Select a valid timezone");

export const provisionChurchSchema = z.object({
  name: z.string().min(1, "Church name is required"),
  currency: z.string().min(3, "Use a 3-letter currency code").max(3).toUpperCase(),
  timezone: timeZoneSchema,
});
export type ProvisionChurchValues = z.infer<typeof provisionChurchSchema>;

export const churchSettingsSchema = z.object({
  name: z.string().min(1, "Church name is required"),
  currency_code: z.string().min(3, "Use a 3-letter currency code").max(3).toUpperCase(),
  timezone: timeZoneSchema,
  reporting_year_start_month: z.coerce.number().int().min(1).max(12),
  finance_requires_independent_verification: z.boolean().default(true),
});
export type ChurchSettingsValues = z.infer<typeof churchSettingsSchema>;
