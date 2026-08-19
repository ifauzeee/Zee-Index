import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";

import { registry } from "./schemas";

import "./paths-health";
import "./paths-files";
import "./paths-share";
import "./paths-auth";
import "./paths-download";
import "./paths-config";
import "./paths-setup";
import "./paths-misc";
import "./paths-trash";
import "./paths-search";
import "./paths-file-request";
import "./paths-request-access";
import "./paths-cron";
import "./paths-admin";
import "./paths-admin-settings";

/* ------------------------------------------------------------------ */
/*  Generate document                                                  */
/* ------------------------------------------------------------------ */

export function getOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Zee-Index API",
      version: "1.0.0",
      description:
        "REST API for Zee-Index — a self-hosted Google Drive Explorer, CMS & streaming platform. All authenticated routes use NextAuth.js JWT sessions. Admin routes require ADMIN or EDITOR role.",
    },
    servers: [
      {
        url: "/",
        description: "Same-origin (use relative paths)",
      },
    ],
    tags: [
      { name: "Health", description: "Service health checks" },
      { name: "Files", description: "File and folder operations" },
      { name: "Download", description: "File download and streaming" },
      { name: "Share", description: "Share link management" },
      { name: "Trash", description: "Trash management" },
      { name: "Search", description: "File search" },
      { name: "Auth", description: "Authentication & 2FA" },
      { name: "Config", description: "Application configuration" },
      { name: "Setup", description: "Initial setup wizard" },
      { name: "Misc", description: "Miscellaneous endpoints" },
      { name: "Admin", description: "Administration endpoints" },
      { name: "File Request", description: "Public file upload requests" },
      { name: "Request Access", description: "Folder access requests" },
      { name: "Cron", description: "Scheduled task endpoints" },
    ],
  });
}
