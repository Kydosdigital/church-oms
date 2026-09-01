export const MIN_PASSWORD_LENGTH = 12;

export const PASSWORD_REQUIREMENTS =
  "Use at least 12 characters with uppercase, lowercase, a number and a symbol.";

export function getPasswordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return PASSWORD_REQUIREMENTS;
  if (!/[a-z]/.test(password)) return PASSWORD_REQUIREMENTS;
  if (!/[A-Z]/.test(password)) return PASSWORD_REQUIREMENTS;
  if (!/[0-9]/.test(password)) return PASSWORD_REQUIREMENTS;
  if (!/[^A-Za-z0-9\s]/.test(password)) return PASSWORD_REQUIREMENTS;
  return null;
}
