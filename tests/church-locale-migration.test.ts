import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/0029_church_locale.sql"),
  "utf8"
);

describe("church locale migration", () => {
  it("adds a default locale without changing existing behaviour", () => {
    expect(migration).toContain(
      "add column if not exists locale_code text not null default 'en-GB'"
    );
  });

  it("validates the stored locale shape", () => {
    expect(migration).toContain("churches_locale_code_format_check");
    expect(migration).toContain("[A-Za-z]{2,3}");
  });

  it("extends transactional onboarding with locale", () => {
    expect(migration).toContain(
      "complete_church_onboarding(\n  p_user_id uuid,\n  p_name text,\n  p_currency text,\n  p_timezone text,\n  p_locale text"
    );
    expect(migration).toContain("set locale_code = v_locale");
  });

  it("keeps the four-argument onboarding RPC as a compatibility wrapper", () => {
    expect(migration).toContain("'en-GB'");
    expect(migration).toContain(
      "complete_church_onboarding(uuid, text, text, text)"
    );
  });

  it("keeps both onboarding signatures server-only", () => {
    expect(migration).toContain(
      "complete_church_onboarding(uuid, text, text, text, text)"
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
