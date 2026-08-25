/**
 * Public-facing contact details for the marketing site.
 *
 * CONTACT_EMAIL defaults to the account email on the project. Change it here
 * to a dedicated support address before any real traffic arrives — it is
 * rendered publicly on the contact page and in the contact JSON-LD.
 */
export const CONTACT_EMAIL = "kydosdigital@gmail.com";

export const SITE_NAME = "Church OMS";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://church-oms.vercel.app";

/** Roughly how quickly enquiries are answered. Keep this honest. */
export const RESPONSE_TIME = "within two working days";
