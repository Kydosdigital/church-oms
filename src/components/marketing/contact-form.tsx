"use client";

import { useActionState } from "react";
import { submitEnquiry, type ContactState } from "@/app/(marketing)/contact/actions";
import { Check } from "./ui";

const initial: ContactState = {};

const TOPICS = [
  "Choosing a plan",
  "Multi-branch setup",
  "Migrating our records",
  "Security questions",
  "Something else",
];

const SIZES = ["Under 100", "100 to 300", "300 to 1,000", "Over 1,000"];

function Field({
  label,
  htmlFor,
  error,
  children,
  optional,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1.5 text-ink/40 font-normal">optional</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error && (
        <p className="mt-1.5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-white px-4 py-3 text-[0.95rem] text-ink " +
  "placeholder:text-ink/35 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 " +
  "transition-shadow";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitEnquiry, initial);

  if (state.ok) {
    return (
      <div className="rounded-3xl border border-brand/25 bg-brand-muted p-10 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand text-white">
          <Check className="size-7" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-ink">Message received</h2>
        <p className="mt-3 text-ink/60 leading-relaxed max-w-sm mx-auto">
          Thanks for getting in touch. We read every enquiry ourselves and will reply to the
          address you gave us.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="rounded-3xl border border-ink/10 bg-white p-7 sm:p-9 shadow-xl shadow-ink/5">
      {state.error && (
        <p
          className="mb-6 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" error={state.fieldErrors?.name}>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            className={inputClass}
            placeholder="Grace Adeyemi"
          />
        </Field>

        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            placeholder="you@yourchurch.org"
          />
        </Field>

        <Field label="Church name" htmlFor="church" optional>
          <input id="church" name="church" className={inputClass} placeholder="Grace Chapel" />
        </Field>

        <Field label="Roughly how many attend?" htmlFor="size" optional>
          <select id="size" name="size" className={inputClass} defaultValue="">
            <option value="">Prefer not to say</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="What is this about?" htmlFor="topic" optional>
            <select id="topic" name="topic" className={inputClass} defaultValue="">
              <option value="">Choose a topic</option>
              {TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Your message" htmlFor="message" error={state.fieldErrors?.message}>
            <textarea
              id="message"
              name="message"
              required
              rows={6}
              className={`${inputClass} resize-y`}
              placeholder="Tell us how your church currently records attendance and giving, and what is not working about it."
            />
          </Field>
        </div>
      </div>

      {/* Honeypot — visually and programmatically hidden from real users. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-7 w-full h-13 rounded-full bg-brand text-white font-medium hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand/25"
      >
        {pending ? "Sending…" : "Send message"}
      </button>

      <p className="mt-4 text-center text-xs text-ink/45">
        We use what you send here to reply to you, and nothing else.
      </p>
    </form>
  );
}
