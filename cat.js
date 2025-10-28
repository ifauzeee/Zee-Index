// all_project_code.js
import fs from "fs";
import path from "path";

const OUTPUT_FILE = "all_project_code.txt"; // nama file output

// File extensions yang mau di-include
const INCLUDE_EXTENSIONS = new Set([
  // Web Frontend
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".tsx",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".vue",
  ".svelte",

  // Backend / Server
  ".py",
  ".rb",
  ".php",
  ".java",
  ".go",
  ".rs",
  ".c",
  ".cpp",
  ".cs",
  ".h",
  ".hpp",
  ".pl",
  ".ex",
  ".exs",
  ".kt",
  ".kts",
  ".scala",
  ".r",
  ".jl",
  ".dart",
  ".swift",
  ".m",
  ".mm",

  // Scripting & Shell
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".psm1",
  ".bat",
  ".cmd",
  ".lua",
  ".vbs",
  ".fish",

  // Database / Query
  ".sql",
  ".graphql",
  ".gql",
  ".cypher",
  ".prisma",

  // Data Science / Notebook
  ".ipynb",
  ".rmd",
  ".sas",
  ".jl",
  ".mat",

  // Configuration / Serialization
  ".json",
  ".xml",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".env",
  ".cfg",
  ".properties",
  ".conf",

  // Templating
  ".erb",
  ".ejs",
  ".hbs",
  ".pug",
  ".j2",
  ".jinja2",
  ".twig",
  ".mustache",

  // Documentation / Markup
  ".md",
  ".rst",
  ".adoc",
  ".tex",
  ".txt",
  ".org",
  ".asciidoc",

  // Docker / DevOps / CI / IaC
  "Dockerfile",
  ".dockerfile",
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".travis.yml",
  ".circleci",
  ".gitlab-ci.yml",
  ".k8s.yaml",
  ".tf",
  ".tfvars",
  ".hcl",
  ".bicep",

  // Others
  "Makefile",
  ".makefile",
  ".mk",
  ".gradle",
  ".pom",
  ".psd1",
]);

// Folder yang di-exclude
const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "vendor",
  "__pycache__",
  ".vscode",
  ".idea",
  "venv",
  ".next",
  "out",
  "coverage",
  "logs",
  "tmp",
  "env",
  ".env",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  "target",
  ".DS_Store",
]);

// File extensions yang di-exclude
const EXCLUDE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".ico",
  ".webp",
  ".svg",
  ".mp4",
  ".mp3",
  ".wav",
  ".avi",
  ".mov",
  ".mkv",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".exe",
  ".dll",
  ".bin",
  ".obj",
  ".so",
  ".jar",
  ".class",
  ".pyc",
  ".pyo",
  ".db",
  ".sqlite3",
  ".swp",
  ".swo",
  ".lock",
  ".pdf",
  ".docx",
]);

// File spesifik yang di-exclude
const EXCLUDE_FILES = new Set([
  "package-lock.json",
  "next-env.d.ts",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      if (!EXCLUDE_DIRS.has(file.name)) {
        walkDir(fullPath, callback);
      }
    } else {
      callback(fullPath, file.name);
    }
  }
}

function main() {
  const rootDir = process.cwd();
  let fileCount = 0;

  const outStream = fs.createWriteStream(OUTPUT_FILE, { encoding: "utf-8" });
  console.log(`Starting process, output will be saved as: ${OUTPUT_FILE}\n`);

  walkDir(rootDir, (filePath, filename) => {
    if (EXCLUDE_FILES.has(filename)) return;

    const ext = path.extname(filename);
    if (EXCLUDE_EXTENSIONS.has(ext)) return;

    if (
      ![...INCLUDE_EXTENSIONS].some(
        (e) => filename.endsWith(e) || filename === e,
      )
    ) {
      return;
    }

    try {
      const relativePath = path.relative(rootDir, filePath);
      fileCount++;

      outStream.write("=".repeat(80) + "\n");
      outStream.write(`FILE ${fileCount}: ${relativePath}\n`);
      outStream.write("=".repeat(80) + "\n\n");

      const content = fs.readFileSync(filePath, "utf-8");
      outStream.write(content + "\n\n");

      console.log(`[${fileCount}] Added: ${relativePath}`);
    } catch (err) {
      console.error(`Failed to read file ${filename}: ${err}`);
    }
  });

  outStream.end(() => {
    console.log(
      `\nProcess completed! ${fileCount} files were combined into ${OUTPUT_FILE}`,
    );
  });
}

main();
