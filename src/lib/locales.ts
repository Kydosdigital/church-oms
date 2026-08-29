export interface LocaleOption {
  value: string;
  label: string;
}

const COMMON_LOCALES: LocaleOption[] = [
  { value: "en-GB", label: "United Kingdom (English)" },
  { value: "en-US", label: "United States (English)" },
  { value: "en-NG", label: "Nigeria (English)" },
  { value: "en-GH", label: "Ghana (English)" },
  { value: "en-KE", label: "Kenya (English)" },
  { value: "en-ZA", label: "South Africa (English)" },
  { value: "en-CA", label: "Canada (English)" },
  { value: "en-AU", label: "Australia (English)" },
  { value: "en-IE", label: "Ireland (English)" },
  { value: "fr-FR", label: "France (French)" },
  { value: "de-DE", label: "Germany (German)" },
  { value: "es-ES", label: "Spain (Spanish)" },
  { value: "pt-PT", label: "Portugal (Portuguese)" },
  { value: "pt-BR", label: "Brazil (Portuguese)" },
  { value: "nl-NL", label: "Netherlands (Dutch)" },
];

export function isValidLocale(value: string) {
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([value]).length === 1;
  } catch {
    return false;
  }
}

export function getLocaleOptions(current?: string): LocaleOption[] {
  const options = [...COMMON_LOCALES];
  if (
    current &&
    isValidLocale(current) &&
    !options.some((option) => option.value === current)
  ) {
    options.push({ value: current, label: current });
  }
  return options;
}

export function formatChurchDate(
  value: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }
) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(value + "T12:00:00")
    : new Date(value);

  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function formatChurchDateTime(
  value: string,
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }
) {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone,
  }).format(new Date(value));
}
