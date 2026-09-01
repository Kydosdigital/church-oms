import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8")
);
const ci = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8"
);

describe("Node runtime alignment", () => {
  it("pins the supported application runtime to Node 24", () => {
    expect(packageJson.engines.node).toBe(">=24 <25");
  });

  it("runs CI on the same major version as production", () => {
    expect(ci).toContain("node-version: 24");
    expect(ci).not.toContain("node-version: 20");
  });
});
