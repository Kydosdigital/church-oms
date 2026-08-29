import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const adminData = readFileSync(
  resolve(process.cwd(), "src/lib/data/admin.ts"),
  "utf8"
);
const userAccess = readFileSync(
  resolve(process.cwd(), "src/lib/data/user-access.ts"),
  "utf8"
);
const invitations = readFileSync(
  resolve(process.cwd(), "src/lib/data/invitations.ts"),
  "utf8"
);

describe("sensitive admin mutation surface", () => {
  it("does not retain legacy user-role server actions in the general admin module", () => {
    expect(adminData).not.toContain("export async function assignUserRole");
    expect(adminData).not.toContain("export async function removeUserRole");
    expect(adminData).not.toContain("export async function setUserActive");
    expect(adminData).not.toContain("export async function inviteUser");
  });

  it("does not import the service-role admin client into the general admin module", () => {
    expect(adminData).not.toContain(
      'from "@/lib/supabase/admin"'
    );
  });

  it("keeps activation on the actor-aware database RPC", () => {
    expect(userAccess).toContain(
      "export async function setManagedUserActive"
    );
    expect(userAccess).toContain(
      '"set_church_user_active" as never'
    );
  });

  it("keeps role removal on the church-scoped managed-user path", () => {
    expect(userAccess).toContain(
      "export async function removeManagedUserRole"
    );
    expect(userAccess).toContain(
      "await assertTargetInChurch"
    );
  });

  it("keeps invitations on the dedicated guarded invitation path", () => {
    expect(invitations).toContain(
      "export async function inviteUserWithRole"
    );
    expect(invitations).toContain(
      "Only administrators can invite users"
    );
  });
});
