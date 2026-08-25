"use server";

import { z } from "zod";
import { CONTACT_EMAIL } from "@/lib/marketing/site";

const enquirySchema = z.object({
  name: z.string().trim().min(1, "Please tell us your name").max(120),
  email: z.email("That does not look like an email address").max(200),
  church: z.string().trim().max(160).optional(),
  size: z.string().trim().max(60).optional(),
  topic: z.string().trim().max(60).optional(),
  message: z.string().trim().min(10, "A little more detail would help").max(4000),
  // Honeypot: real people never fill this in, bots usually do.
  website: z.string().max(0).optional(),
});

export interface ContactState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
}

/**
 * Contact enquiries are forwarded to CONTACT_WEBHOOK_URL, which can be any
 * endpoint that accepts a JSON POST — Formspree, a Zapier/Make catch hook, a
 * Slack incoming webhook, or your own handler. It is deliberately not tied to
 * one email provider, and adds no dependency to this project.
 *
 * With no webhook configured, the form fails honestly and points the visitor
 * at the published email address rather than silently swallowing the message.
 */
export async function submitEnquiry(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const parsed = enquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    church: formData.get("church"),
    size: formData.get("size"),
    topic: formData.get("topic"),
    message: formData.get("message"),
    website: formData.get("website"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors };
  }

  // Silently accept honeypot hits so bots get no signal either way.
  if (parsed.data.website) return { ok: true };

  const webhook = process.env.CONTACT_WEBHOOK_URL;
  if (!webhook) {
    return {
      error: `Our contact form is not accepting messages right now. Please email ${CONTACT_EMAIL} directly and we will pick it up from there.`,
    };
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: parsed.data.name,
        email: parsed.data.email,
        church: parsed.data.church || null,
        size: parsed.data.size || null,
        topic: parsed.data.topic || null,
        message: parsed.data.message,
        submittedAt: new Date().toISOString(),
        source: "church-oms marketing contact form",
      }),
    });

    if (!response.ok) throw new Error(`Webhook responded ${response.status}`);
    return { ok: true };
  } catch {
    return {
      error: `We could not send that just now. Please email ${CONTACT_EMAIL} directly and we will make sure it reaches us.`,
    };
  }
}
