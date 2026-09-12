// Fails CI when the flat set of i18n keys differs between locales.
// Keys (dot-joined) must be identical across en/id/zh-TW.
import { readFileSync } from "node:fs";

const messages = ["en", "id", "zh-TW"].map((locale) => ({
  locale,
  data: JSON.parse(
    readFileSync(
      new URL(`../messages/${locale}.json`, import.meta.url),
      "utf8",
    ),
  ),
}));

const flatten = (obj, prefix = "") =>
  Object.entries(obj)
    .flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "object" && value !== null
        ? flatten(value, path)
        : [path];
    })
    .sort();

messages.forEach((m) => {
  m.keys = flatten(m.data);
});

const [ref, ...others] = messages;
const issues = [];

for (const other of others) {
  for (const key of other.keys) {
    if (!ref.keys.includes(key)) {
      issues.push(
        `extra in "${other.locale}" (missing in "${ref.locale}"): ${key}`,
      );
    }
  }
  for (const key of ref.keys) {
    if (!other.keys.includes(key)) {
      issues.push(
        `missing in "${other.locale}" (present in "${ref.locale}"): ${key}`,
      );
    }
  }
}

if (issues.length > 0) {
  console.error(`❌ i18n key parity mismatch:\n  - ${issues.join("\n  - ")}`);
  process.exit(1);
}

console.log(
  `✅ i18n key parity: ${ref.locale}/${others
    .map((o) => o.locale)
    .join("/")} all match (${ref.keys.length} keys)`,
);
