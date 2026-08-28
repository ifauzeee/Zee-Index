import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// LICENSE (GNU AGPL-3.0 + additional terms under Section 7) mandates that the
// attribution notice "© 2025-2026 All rights reserved - Muhammad Ibnu Fauzi"
// stays on all user-facing pages and cannot be removed or altered.
// This guard fails the CI build if any required file drops or renames it.

const ROOT = path.resolve(__dirname, "../..");

// Files whose source must still reference the required attribution string.
const REQUIRED_FILES = [
  "app/[locale]/layout.tsx", // metadata.authors
  "app/[locale]/(main)/layout.tsx", // footer
  "app/[locale]/admin/layout.tsx", // footer
  "app/[locale]/login/page.tsx", // footer
  "app/[locale]/setup/page.tsx", // footer
];

const REQUIRED_ATTRIBUTION = "Muhammad Ibnu Fauzi";

describe("license attribution guard", () => {
  it.each(REQUIRED_FILES)("keeps author attribution in %s", (file) => {
    const abs = path.join(ROOT, file);
    const source = readFileSync(abs, "utf8");
    expect(
      source.includes(REQUIRED_ATTRIBUTION),
      `${file} must keep "${REQUIRED_ATTRIBUTION}" (LICENSE Section 7 attribution).`,
    ).toBe(true);
  });
});
