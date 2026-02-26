import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./test/setup.ts",
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
    exclude: ["node_modules", ".next/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "hooks/**/*.ts", "components/**/*.tsx"],
      exclude: [
        "lib/db.ts",
        "lib/env.ts",
        "lib/kv.ts",
        "lib/store.ts",
        "lib/logger.ts",
        "lib/drive/index.ts",
        "**/*.d.ts",
        "**/*.test.*",
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
});
