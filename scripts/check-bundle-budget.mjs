// Fails CI when the client bundle exceeds budget. Run after `pnpm build`.
// Baseline (2026-09): ~3.9 MB total .next/static JS → budget 5 MB (~25% headroom).
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BUDGET_MB = 5;
const DIR = fileURLToPath(new URL("../.next/static", import.meta.url));

function sumJs(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) total += sumJs(p);
    else if (entry.name.endsWith(".js")) total += statSync(p).size;
  }
  return total;
}

let total;
try {
  total = sumJs(DIR);
} catch {
  console.error("❌ .next/static not found — run `pnpm build` first.");
  process.exit(1);
}

const mb = total / 1024 / 1024;
console.log(`📦 static JS total: ${mb.toFixed(2)} MB (budget ${BUDGET_MB} MB)`);
if (mb > BUDGET_MB) {
  console.error(
    `❌ Bundle budget exceeded by ${(mb - BUDGET_MB).toFixed(2)} MB.`,
  );
  process.exit(1);
}
console.log("✅ Bundle budget OK");
