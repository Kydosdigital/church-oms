const FALLBACK_TIMEZONES = [
  "UTC",
  "Africa/Accra",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Kampala",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/New_York",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
] as const;

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getSupportedTimeZones(current?: string) {
  const supported =
    (Intl as IntlWithSupportedValues).supportedValuesOf?.("timeZone") ??
    [...FALLBACK_TIMEZONES];

  const zones = new Set<string>(["UTC", ...supported]);
  if (current && isValidTimeZone(current)) zones.add(current);

  return Array.from(zones).sort((a, b) => a.localeCompare(b));
}
