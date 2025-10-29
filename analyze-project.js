#!/usr/bin/env node

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "analysis_results";

const logFile = path.join(OUTPUT_DIR, "analysis-log.txt");
const reportFile = path.join(OUTPUT_DIR, "analysis-report.html");
const jsonReport = path.join(OUTPUT_DIR, "analysis-report.json");
const lighthouseReportPath = path.join(OUTPUT_DIR, "lighthouse-report.html");

const depsToInstall = [
  "eslint",
  "@typescript-eslint/parser",
  "@typescript-eslint/eslint-plugin",
  "prettier",
  "eslint-config-prettier",
  "eslint-plugin-security",
  "husky",
  "lint-staged",
  "lighthouse",
  "snyk",
  "commander",
  "chalk",
  "jsdom",
  "dotenv-cli",
];

const timestamp = new Date().toISOString();
let results = [];

const args = process.argv.slice(2);
const isFix = args.includes("--fix");
const isReport = args.includes("--report");
const isHooks = args.includes("--hooks");
const isPerf = args.includes("--perf");
const forcedPM = args.find((arg) => arg.startsWith("--pm="));
const pmType = forcedPM ? forcedPM.split("=")[1] : null;
const maxWarningsArg = args.find((arg) => arg.startsWith("--max-warnings="));
const maxWarnings = maxWarningsArg
  ? parseInt(maxWarningsArg.split("=")[1], 10)
  : 0;

let logFunction = (message, type = "info") => {
  const prefix =
    type === "error"
      ? "❌"
      : type === "success"
      ? "✅"
      : type === "warn"
      ? "⚠️"
      : "ℹ️";
  const fullMsg = `${prefix} ${message}`;
  console.log(fullMsg);
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  try {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    fs.appendFileSync(logFile, logEntry);
  } catch (logErr) {
    console.error(
      `[analyze-project.js] Failed to write to log file: ${logErr.message}`,
    );
  }
  if (isReport) results.push({ type, message });
};

function log(message, type = "info") {
  logFunction(message, type);
}

function detectPackageManager(forcedPM) {
  const hasPnpmLock = fs.existsSync("pnpm-lock.yaml");
  const hasNpmLock = fs.existsSync("package-lock.json");
  if (forcedPM) {
    log(`🔧 Forced PM: ${forcedPM}`);
    return forcedPM;
  }
  if (hasPnpmLock && !hasNpmLock) {
    log("📦 Detected: pnpm");
    return "pnpm";
  }
  if (hasNpmLock && !hasPnpmLock) {
    log("📦 Detected: npm");
    return "npm";
  }
  if (hasPnpmLock && hasNpmLock) {
    log("⚠️ Mixed locks. Default npm. Use --pm=pnpm.", "warn");
    return "npm";
  }
  log("⚠️ No lock. Default npm.", "warn");
  return "npm";
}

function isCommandAvailable(cmd) {
  try {
    const checkCmd = process.platform === "win32" ? "where" : "which";
    execSync(`${checkCmd} ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function getRunCommand(script, pm) {
  return pm === "pnpm" ? `pnpm ${script}` : `npm run ${script}`;
}

function installDependencies(pm) {
  log("🔍 Installing deps...");
  const missingDeps = [];
  depsToInstall.forEach((dep) => {
    try {
      require.resolve(dep);
    } catch (e) {
      const commandName = dep.split("/")[0];
      if (
        [
          "husky",
          "lighthouse",
          "snyk",
          "commander",
          "dotenv-cli",
          "eslint",
          "prettier",
          "tsc",
        ].includes(commandName)
      ) {
        log(`ℹ️ Assuming CLI tool '${dep}' is available via npx or globally.`);
      } else {
        missingDeps.push(dep);
        log(`⚠️ Need dependency: ${dep}`);
      }
    }
  });

  if (missingDeps.length > 0) {
    try {
      const installCmd =
        pm === "pnpm"
          ? `pnpm add --save-dev ${missingDeps.join(" ")}`
          : `npm install --save-dev ${missingDeps.join(" ")}`;
      log(`Running installation: ${installCmd}`);
      execSync(installCmd, { stdio: "inherit" });
      log("✅ Missing library dependencies installed!", "success");
    } catch (e) {
      log(`❌ Installation failed: ${e.message}`, "error");
      process.exit(1);
    }
  } else log("✅ All required library dependencies seem available.", "success");
}

let chalk;
let JSDOM;
let chalkFailedCheck = false;

function loadAdvancedDeps() {
  try {
    chalk = require("chalk");
    const chalkInstance = chalk.default || chalk;
    logFunction = (message, type = "info") => {
      let colorFunc;
      switch (type) {
        case "error":
          colorFunc = chalkInstance.red;
          break;
        case "success":
          colorFunc = chalkInstance.green;
          break;
        case "warn":
          colorFunc = chalkInstance.yellow;
          break;
        case "info":
        default:
          colorFunc = chalkInstance.blue;
          break;
      }
      if (typeof colorFunc === "function") {
        console.log(colorFunc(message));
      } else {
        const prefix =
          type === "error"
            ? "❌"
            : type === "success"
            ? "✅"
            : type === "warn"
            ? "⚠️"
            : "ℹ️";
        console.log(`${prefix} ${message}`);
        if (
          !chalkFailedCheck &&
          (typeof chalkInstance !== "object" ||
            typeof chalkInstance.red !== "function")
        ) {
          console.warn(
            "[analyze-project.js] Warning: Chalk functions not found. Using plain logs.",
          );
          chalkFailedCheck = true;
        }
      }
      const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
      try {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        fs.appendFileSync(logFile, logEntry);
      } catch (logErr) {
        console.error(
          `[analyze-project.js] Failed to write to log file: ${logErr.message}`,
        );
      }
      if (isReport) results.push({ type, message });
    };
  } catch (e) {
    log(`⚠️ Chalk load failed (minor): ${e.message}`, "warn");
  }

  try {
    const jsdomModule = require("jsdom");
    JSDOM = jsdomModule.JSDOM;
  } catch (e) {
    log(`⚠️ JSDOM load failed: ${e.message}`, "warn");
  }
}

function createEsLintConfig() {
  const configPath = ".eslintrc.json";
  try {
    if (fs.existsSync(configPath)) {
      JSON.parse(fs.readFileSync(configPath, "utf-8"));
      log("✅ ESLint config exists and seems valid.");
    } else {
      log("ℹ️ .eslintrc.json not found. Creating a basic one...");
      const config = {
        extends: [
          "eslint:recommended",
          "plugin:@typescript-eslint/recommended",
          "plugin:security/recommended",
          "prettier",
        ],
        parser: "@typescript-eslint/parser",
        parserOptions: {
          ecmaVersion: 2020,
          sourceType: "module",
        },
        plugins: ["@typescript-eslint", "security"],
        rules: {
          "security/detect-unsafe-regex": "off",
          "@typescript-eslint/no-explicit-any": "off",
        },
        env: {
          browser: true,
          node: true,
        },
        ignorePatterns: ["node_modules/", "build/", ".next/"],
      };
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      log(
        "📝 Basic .eslintrc.json created! Please review and customize.",
        "success",
      );
    }
  } catch (e) {
    log(
      `❌ Error processing .eslintrc.json: ${e.message}. Please fix the file manually.`,
      "error",
    );
  }
}

function setupGitHooks(pm) {
  if (!isHooks) return;
  log("🔧 Setting up Husky...");
  try {
    if (!fs.existsSync(".git")) {
      log("⚠️ No .git directory found. Skipping Husky setup.", "warn");
      return;
    }
    if (!isCommandAvailable("husky")) {
      log("⚠️ Husky command not found. Skipping Husky setup.", "warn");
      return;
    }
    execSync(getRunCommand("exec husky install", pm), { stdio: "inherit" });
    log("ℹ️ Husky hooks enabled/installed.");
    log("ℹ️ Setting up pre-commit hook...");
    fs.writeFileSync(
      ".husky/pre-commit",
      `#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\necho "Running Zee-Analyze pre-commit hook..."\nnode analyze-project.js --max-warnings=0\nEXIT_CODE=$?\nif [ $EXIT_CODE -ne 0 ]; then\n  echo "❌ Pre-commit hook failed due to errors/warnings (Exit Code: $EXIT_CODE)."\n  exit 1\nfi\necho "✅ Analysis passed."\necho "Running lint-staged..."\npnpm exec lint-staged\nLINT_STAGED_EXIT_CODE=$?\nif [ $LINT_STAGED_EXIT_CODE -ne 0 ]; then\n    echo "❌ lint-staged failed (Exit Code: $LINT_STAGED_EXIT_CODE)."\n    exit 1\nfi\necho "✅ lint-staged passed."\nexit 0\n`,
    );
    execSync("chmod +x .husky/pre-commit", { stdio: "inherit" });
    log("ℹ️ Configuring lint-staged in package.json...");
    const pkgPath = "package.json";
    let pkg = {};
    if (fs.existsSync(pkgPath)) {
      pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    } else {
      log("⚠️ package.json not found, cannot configure lint-staged.", "warn");
      return;
    }
    pkg["lint-staged"] = {
      "*.{js,ts,jsx,tsx}": ["eslint --fix", "prettier --write"],
    };
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    log("✅ Husky hooks and lint-staged setup successfully!", "success");
    log(
      "ℹ️ On commit, analysis will run first. If it passes, staged files will be linted/formatted.",
      "info",
    );
  } catch (e) {
    log(
      `❌ Husky setup failed: ${e.message}\n${e.stderr || ""}${e.stdout || ""}`,
      "error",
    );
  }
}

function runCommand(command, description, pm) {
  let fullCmd = command;
  if (command.startsWith("npx eslint") && !fullCmd.includes("--fix")) {
    fullCmd += ` --max-warnings=${maxWarnings}`;
  }

  try {
    log(`\n=== ${description} ===`);
    const output = execSync(fullCmd, { encoding: "utf8", stdio: "pipe" });
    if (output.trim()) {
      if (description.startsWith("Prettier") && command.includes("--write")) {
        log(`ℹ️ Prettier formatted files:\n${output.trim()}`, "info");
        if (isReport)
          results.push({
            section: description,
            status: "pass",
            output: `Formatted files:\n${output.trim()}`,
          });
      } else {
        log(output.trim(), "warn");
        const status = description.startsWith("ESLint")
          ? "pass_with_warnings"
          : "pass";
        if (isReport)
          results.push({
            section: description,
            status: status,
            output: output.trim(),
          });
      }
    } else {
      log("✅ Clean!", "success");
      if (isReport)
        results.push({
          section: description,
          status: "pass",
          output: "No issues / No changes",
        });
    }
  } catch (error) {
    const output = error.stdout || error.stderr || "";
    const message = error.message || "";
    let actualErrorsFound = false;
    let failureMessage = output || message;

    if (description.startsWith("ESLint")) {
      const match = failureMessage.match(/✖ \d+ problems? \((\d+) errors?/);
      if (match && match[1]) {
        actualErrorsFound = parseInt(match[1], 10) > 0;
      } else if (
        /\d+ errors?/i.test(failureMessage) &&
        !/problems? \(0 errors?/i.test(failureMessage)
      ) {
        actualErrorsFound = true;
      } else if (
        /\berror\b/i.test(failureMessage) &&
        !/problems? \(0 errors?/i.test(failureMessage)
      ) {
        log(
          `[Debug] ESLint output contains 'error' but couldn't parse count. Assuming error failure.`,
          "warn",
        );
        actualErrorsFound = true;
      }

      if (actualErrorsFound) {
        log(
          `❌ ${description} failed with errors:\n${failureMessage}`,
          "error",
        );
        if (isReport)
          results.push({
            section: description,
            status: "fail",
            output: failureMessage,
          });
        if (maxWarnings === 0) {
          log("Exiting due to ESLint errors and --max-warnings=0.", "error");
          process.exit(1);
        }
      } else if (failureMessage.trim() !== "") {
        log(
          `⚠️ ${description} completed with warnings:\n${failureMessage}`,
          "warn",
        );
        if (isReport)
          results.push({
            section: description,
            status: "pass_with_warnings",
            output: failureMessage,
          });
      } else {
        log(`❌ ${description} failed unexpectedly:\n${message}`, "error");
        if (isReport)
          results.push({
            section: description,
            status: "fail",
            output: message,
          });
        if (maxWarnings === 0) {
          process.exit(1);
        }
      }
    } else if (
      description.startsWith("Prettier") &&
      command.includes("--check")
    ) {
      log(
        `❌ ${description} failed: Files need formatting.\n${failureMessage}`,
        "error",
      );
      if (isReport)
        results.push({
          section: description,
          status: "fail",
          output: `Files need formatting:\n${failureMessage}`,
        });
      if (maxWarnings === 0) {
        log(
          `Exiting due to ${description} failure and --max-warnings=0 setting. Run 'pnpm format:fix'.`,
          "error",
        );
        process.exit(1);
      }
    } else {
      log(`❌ ${description} failed:\n${failureMessage}`, "error");
      if (isReport)
        results.push({
          section: description,
          status: "fail",
          output: failureMessage,
        });
      if (maxWarnings === 0) {
        log(
          `Exiting due to ${description} failure and --max-warnings=0 setting.`,
          "error",
        );
        process.exit(1);
      }
    }
  }
}

function generateReports() {
  if (!isReport) return;
  log("📊 Generating reports...");
  try {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  } catch (dirErr) {
    log(
      `❌ Could not create report directory ${OUTPUT_DIR}: ${dirErr.message}`,
      "error",
    );
    return;
  }
  const summary = {};
  try {
    summary.totalChecks = results.filter((r) => r.section).length;
    summary.passes = results.filter((r) => r.status === "pass").length;
    summary.warnings = results.filter(
      (r) => r.status === "pass_with_warnings",
    ).length;
    summary.failures = results.filter((r) => r.status === "fail").length;
    summary.skipped = results.filter((r) => r.status === "skipped").length;
    summary.generated = results.filter((r) => r.status === "generated").length;
    summary.logs = results.filter((r) => !r.section).length;
    fs.writeFileSync(
      jsonReport,
      JSON.stringify({ timestamp, results, summary }, null, 2),
    );
    log("✅ JSON report generated: analysis-report.json", "success");
  } catch (e) {
    log(`❌ Failed to write JSON report: ${e.message}`, "error");
  }

  if (JSDOM) {
    try {
      const dom = new JSDOM(
        `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Analysis Report</title><style>body{font-family:sans-serif;margin:20px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background-color:#f2f2f2}.status{padding:3px 6px;border-radius:3px;font-weight:700}.pass{background-color:#d4edda;color:#155724}.fail{background-color:#f8d7da;color:#721c24}.pass_with_warnings{background-color:#fff3cd;color:#856404}.skipped{background-color:#f0f0f0;color:#6c757d}.generated{background-color:#cce5ff;color:#004085}pre{background-color:#f8f9fa;padding:10px;border-radius:4px;overflow-x:auto}</style></head><body><h1>Code Analysis Report</h1><div class="summary"></div><table><thead><tr><th>Section</th><th>Status</th><th>Details</th></tr></thead><tbody></tbody></table></body></html>`,
      );
      const tableBody = dom.window.document.querySelector("tbody");
      const summaryDiv = dom.window.document.querySelector(".summary");
      if (summaryDiv) {
        summaryDiv.innerHTML = `<h2>Summary</h2><p>Generated: ${new Date(
          timestamp,
        ).toLocaleString()}</p><p>Total Checks: <strong class="info status">${
          summary.totalChecks
        }</strong></p><p>Passed: <strong class="pass status">${
          summary.passes
        }</strong></p><p>Passed with Warnings: <strong class="pass_with_warnings status">${
          summary.warnings
        }</strong></p><p>Failed: <strong class="fail status">${
          summary.failures
        }</strong></p><p>Skipped: <strong class="skipped status">${
          summary.skipped
        }</strong></p><p>Generated Reports: <strong class="generated status">${
          summary.generated
        }</strong></p>`;
      }
      if (tableBody) {
        results.forEach((r) => {
          const row = dom.window.document.createElement("tr");
          const status = r.status || r.type || "info";
          const statusClass = status.toLowerCase().replace(/[^a-z0-9_]/g, "_");
          const outputText = (r.output || r.message || "(No details)")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          const usePre =
            status === "fail" ||
            status === "pass_with_warnings" ||
            (outputText && outputText.includes("\n"));
          const detailContent = usePre
            ? `<pre>${outputText}</pre>`
            : outputText.substring(0, 500) +
              (outputText.length > 500 ? "..." : "");
          row.innerHTML = `<td>${r.section || r.type || "Log"}</td><td><span class="status ${statusClass}">${status.toUpperCase()}</span></td><td>${detailContent}</td>`;
          tableBody.appendChild(row);
        });
      }
      fs.writeFileSync(reportFile, dom.serialize());
      log(
        `✅ HTML report generated: ${reportFile} (open in browser)`,
        "success",
      );
    } catch (e) {
      log(`❌ Failed to generate HTML report: ${e.message}`, "error");
      fs.writeFileSync(
        reportFile,
        `<pre>${JSON.stringify({ timestamp, results, summary }, null, 2)}</pre>`,
      );
      log(`ℹ️ Wrote JSON data to ${reportFile} as fallback.`, "info");
    }
  } else {
    log("⚠️ HTML report skipped (JSDOM not loaded).", "warn");
  }
}

if (require.main === module) {
  console.log("🚀 Zee-Analyze: Next.js Code Analyzer v2.1 (Fixed)");

  if (!fs.existsSync("package.json")) {
    log(
      "❌ No package.json found in the current directory. Please run this script from the root of your Node.js project.",
      "error",
    );
    process.exit(1);
  }

  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
      log(`📁 Created output directory: ${OUTPUT_DIR}`);
    }
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
    if (fs.existsSync(reportFile)) fs.unlinkSync(reportFile);
    if (fs.existsSync(jsonReport)) fs.unlinkSync(jsonReport);
    if (fs.existsSync(lighthouseReportPath))
      fs.unlinkSync(lighthouseReportPath);
  } catch (dirErr) {
    log(
      `❌ Failed to prepare output directory ${OUTPUT_DIR}: ${dirErr.message}. Check permissions.`,
      "error",
    );
    process.exit(1);
  }

  const pm = detectPackageManager(pmType);
  log(`📦 Using package manager: ${pm}`);

  installDependencies(pm);
  loadAdvancedDeps();

  createEsLintConfig();
  if (isHooks) {
    setupGitHooks(pm);
  }

  runCommand(
    "npx eslint . --ext .js,.jsx,.ts,.tsx",
    "ESLint (Linting & Security)",
    pm,
  );
  if (fs.existsSync("tsconfig.json"))
    runCommand("npx tsc --noEmit", "TypeScript Check", pm);
  else log("ℹ️ No tsconfig.json found, skipping TypeScript check.", "info");

  const prettierCmd = isFix
    ? "npx prettier --write ."
    : "npx prettier --check .";
  const prettierDesc = isFix
    ? "Prettier Formatting (Fixing)"
    : "Prettier Formatting (Checking)";
  runCommand(prettierCmd, prettierDesc, pm);

  const auditCmd = pm === "pnpm" ? "pnpm audit --prod" : "npm audit --omit=dev";
  runCommand(auditCmd, "Security Audit (Production Deps)", pm);
  runCommand(getRunCommand("build", pm), "Next.js Build", pm);

  try {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    if (pkg.scripts?.test)
      runCommand(getRunCommand("test", pm), "Unit Tests", pm);
    else
      log("ℹ️ No test script found in package.json, skipping tests.", "info");
  } catch (e) {
    log(`⚠️ Error reading package.json for tests: ${e.message}`, "warn");
  }

  if (isPerf) {
    if (isCommandAvailable("lighthouse")) {
      log("⚡ Running Lighthouse...");
      try {
        execSync(
          `npx lighthouse . --output=html --output-path=${lighthouseReportPath} --only-categories=performance,accessibility --view`,
          { stdio: "inherit" },
        );
        log(
          `✅ Lighthouse report generated: ${lighthouseReportPath} (Opening in browser...)`,
          "success",
        );
        if (isReport)
          results.push({
            section: "Lighthouse",
            status: "generated",
            output: `See ${lighthouseReportPath}`,
          });
      } catch (e) {
        log(
          `⚠️ Lighthouse failed: ${e.message}\n${e.stderr || ""}${e.stdout || ""}`,
          "warn",
        );
        if (isReport)
          results.push({
            section: "Lighthouse",
            status: "fail",
            output: e.message,
          });
      }
    } else {
      log(
        "⚠️ Lighthouse command not found, skipping performance check.",
        "warn",
      );
      if (isReport)
        results.push({
          section: "Lighthouse",
          status: "skipped",
          output: "Lighthouse not found",
        });
    }
  }

  if (isCommandAvailable("snyk")) {
    try {
      log("\n=== Snyk Security Scan ===");
      const snykCmd =
        pm === "pnpm"
          ? "pnpm snyk test --severity-threshold=high"
          : "npx snyk test --severity-threshold=high";
      const snykOutput = execSync(snykCmd, { stdio: "pipe", encoding: "utf8" });
      log(snykOutput.trim(), "info");
      log("✅ Snyk: No high/critical vulnerabilities found!", "success");
      if (isReport)
        results.push({
          section: "Snyk Scan",
          status: "pass",
          output: snykOutput.trim() || "No high/critical vulnerabilities",
        });
    } catch (e) {
      const errorOutput = e.stdout || e.stderr || e.message;
      log(
        `❌ Snyk vulnerabilities found (>= high) or scan failed:\n${errorOutput}`,
        "error",
      );
      if (isReport)
        results.push({
          section: "Snyk Scan",
          status: "fail",
          output: errorOutput,
        });
      if (maxWarnings === 0) {
        log(
          "Exiting due to Snyk failure and --max-warnings=0 setting.",
          "error",
        );
        process.exit(1);
      }
    }
  } else {
    log(
      '⚠️ Snyk command not found, skipping Snyk scan. Install with "npm i -g snyk" or "pnpm add -D snyk".',
      "warn",
    );
    if (isReport)
      results.push({
        section: "Snyk Scan",
        status: "skipped",
        output: "Snyk not found",
      });
  }

  generateReports();

  const finalPassCount = results.filter((r) => r.status === "pass").length;
  const finalWarningCount = results.filter(
    (r) => r.status === "pass_with_warnings",
  ).length;
  const finalFailCount = results.filter((r) => r.status === "fail").length;
  const finalSkippedCount = results.filter(
    (r) => r.status === "skipped",
  ).length;
  const finalTotalChecks = results.filter((r) => r.section).length;

  log("\n🏁 Analysis Complete!", "success");
  log(`➡️  Log file saved to: ${logFile}`);
  if (isReport) {
    log(`➡️  JSON report saved to: ${jsonReport}`);
    log(`➡️  HTML report saved to: ${reportFile}`);
    log(
      `📊 Summary: ${finalPassCount} passed, ${finalWarningCount} with warnings, ${finalFailCount} failed, ${finalSkippedCount} skipped (out of ${finalTotalChecks} checks).`,
    );
  }

  if (finalFailCount > 0 && maxWarnings === 0) {
    log(
      "\n❌ Exiting with error code due to failures and --max-warnings=0 setting.",
      "error",
    );
    process.exit(1);
  } else {
    log("\n✅ Script finished successfully.", "success");
    process.exit(0);
  }
} else {
  module.exports = { log, runCommand };
}