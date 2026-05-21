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
      include: [
        "lib/utils.ts",
        "lib/app-config.ts",
        "lib/services/download.ts",
        "lib/services/health-service.ts",
        "lib/securityUtils.ts",
        "lib/memory-cache.ts",
        "lib/incident-monitor.ts",
        "lib/link-payloads.ts",
        "lib/manual-drives.ts",
        "lib/telemetry.ts",
        "lib/drive/auth.ts",
        "lib/drive/client.ts",
        "app/api/download/route.ts",
        "app/api/share/route.ts",
        "app/api/admin/cache-stats/route.ts",
        "app/api/admin/logs/route.ts",
        "app/api/admin/system-health/route.ts",
        "app/api/admin/stats/route.ts",
        "app/api/admin/users/route.ts",
        "app/api/admin/protected-folders/route.ts",
        "components/file-browser/ViewToggle.tsx",
        "components/file-browser/EmptyState.tsx",
        "components/file-browser/FileItem.tsx",
      ],
      exclude: [
        "lib/db.ts",
        "lib/env.ts",
        "lib/kv.ts",
        "lib/store.ts",
        "lib/logger.ts",
        "lib/drive/index.ts",
        "app/api/auth/[...nextauth]/route.ts",
        "**/*.d.ts",
        "**/*.test.*",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 50,
        statements: 60,
      },
    },
  },
});
