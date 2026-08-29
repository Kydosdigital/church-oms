import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const inviteForm = readFileSync(
  resolve(process.cwd(), "src/components/forms/invite-user-form.tsx"),
  "utf8"
);
const invitationAction = readFileSync(
  resolve(process.cwd(), "src/lib/data/invitations.ts"),
  "utf8"
);

describe("administrator invite scope", () => {
  it("treats Administrator and Super Admin as church-wide in the UI", () => {
    expect(inviteForm).toContain(
      'const isChurchwideRole = isSuperAdminRole || role === "administrator"'
    );
    expect(inviteForm).toContain("disabled={isChurchwideRole}");
    expect(inviteForm).toContain(
      "branch_id: isChurchwideRole ? undefined : data.branch_id || undefined"
    );
  });

  it("clears a branch selection when switching to a church-wide role", () => {
    expect(inviteForm).toContain(
      'if (isChurchwideRole) setValue("branch_id", undefined)'
    );
  });

  it("forces Administrator and Super Admin branch_id to null on the server", () => {
    expect(invitationAction).toContain(
      'isInvitingSuperAdmin || input.role === "administrator"'
    );
    expect(invitationAction).toContain(
      "const branchId = isChurchwideRole ? null : input.branch_id ?? null"
    );
  });

  it("continues to keep Administrator finance visibility separate", () => {
    expect(inviteForm).toContain(
      "Finance visibility is still granted separately and is not implied by Administrator status."
    );
    expect(invitationAction).toContain(
      "finance_permission: input.finance_permission"
    );
  });
});
