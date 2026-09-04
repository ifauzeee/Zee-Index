// Fails CI when lib/env.ts defines keys missing from .env.example.
// One direction only: schema -> example (example may hold extra Docker-only keys).
import { readFileSync } from "node:fs";

const schemaSrc = readFileSync(
  new URL("../lib/env.ts", import.meta.url),
  "utf8",
);
const exampleSrc = readFileSync(
  new URL("../.env.example", import.meta.url),
  "utf8",
);

const start = schemaSrc.indexOf("const envSchema = z.object({");
const end = schemaSrc.indexOf("});", start);
const schemaBlock = schemaSrc.slice(start, end);

const keys = [
  ...new Set(
    [...schemaBlock.matchAll(/^\s{2}([A-Z][A-Z0-9_]*)\s*:/gm)].map((m) => m[1]),
  ),
];

const missing = keys.filter(
  (k) => !new RegExp(`^\\s*#?\\s*${k}\\s*=`, "m").test(exampleSrc),
);

if (missing.length > 0) {
  console.error(
    `❌ .env.example is missing keys from lib/env.ts:\n  - ${missing.join("\n  - ")}`,
  );
  process.exit(1);
}

console.log(`✅ .env.example covers all ${keys.length} keys from lib/env.ts`);
