import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("direct route access integration", () => {
  it("guards the Admin route group", () => {
    expect(source("src/app/(app)/admin/layout.tsx")).toContain(
      "requireAdminAccess()"
    );
  });

  it("guards the Programmes route group", () => {
    expect(source("src/app/(app)/programmes/layout.tsx")).toContain(
      "requireProgrammesAccess()"
    );
  });

  it("guards the Revenue route group", () => {
    expect(source("src/app/(app)/revenue/layout.tsx")).toContain(
      "requireRevenueAccess()"
    );
  });

  it("guards the Reports landing page without blocking printable programme reports", () => {
    expect(source("src/app/(app)/reports/page.tsx")).toContain(
      "requireReportsAccess()"
    );
    expect(
      source("src/app/(app)/reports/programme/[id]/page.tsx")
    ).not.toContain("requireReportsAccess()");
  });

  it("enforces report permission on the attendance export endpoint", () => {
    const route = source("src/app/(app)/reports/attendance/route.ts");
    expect(route).toContain("canAccessReports(ctx)");
    expect(route).toContain("status: 403");
  });

  it("redirects inactive church users before the app shell renders", () => {
    const layout = source("src/app/(app)/layout.tsx");
    expect(layout).toContain("if (!ctx.user.active)");
    expect(layout).toContain('redirect("/account-inactive")');
  });
});
