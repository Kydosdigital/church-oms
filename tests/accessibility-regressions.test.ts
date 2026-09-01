import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

function tsxFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...tsxFiles(path));
    } else if (entry.isFile() && path.endsWith(".tsx")) {
      files.push(path);
    }
  }
  return files;
}

describe("accessibility regressions", () => {
  it("does not nest Button controls directly inside Next links", () => {
    const offenders = tsxFiles(resolve(process.cwd(), "src"))
      .filter((path) => /<Link\b[^>]*>\s*<Button\b/.test(readFileSync(path, "utf8")))
      .map((path) => path.replace(process.cwd(), ""));

    expect(offenders).toEqual([]);
  });

  it("keeps accessible names on inline venue edit fields", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/forms/venue-list-item.tsx"),
      "utf8"
    );

    expect(source).toContain('aria-label="Venue name"');
    expect(source).toContain('aria-label="Default capacity"');
  });

  it("marks the active item in both desktop and mobile marketing navigation", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/marketing/site-header.tsx"),
      "utf8"
    );

    expect(source.match(/aria-current=/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
