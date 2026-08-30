import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/forms/revenue-entry-form.tsx"),
  "utf8"
);

describe("finance entry guidance", () => {
  it("explains physical and online giving without guessing category allocation", () => {
    expect(source).toContain("Physical</strong> is the amount from the in-person");
    expect(source).toContain("Online</strong> is money");
    expect(source).toContain("Do not guess a category from an unexplained bank total");
    expect(source).toContain("unallocated reconciliation category");
  });

  it("makes the digital sign-off and verification workflow explicit", () => {
    expect(source).toContain("Sign &amp; submit creates a digital sign-off");
    expect(source).toContain("independent finance verification is enabled");
    expect(source).toContain("Verify and lock");
    expect(source).toContain("Reopen for correction");
  });

  it("keeps guidance role and state aware", () => {
    expect(source).toContain("financeWorkflowMessage(");
    expect(source).toContain("waiting for an authorised Finance Verifier");
    expect(source).toContain("waiting for an authorised finance editor");
    expect(source).toContain("verified and locked against normal edits");
  });
});
