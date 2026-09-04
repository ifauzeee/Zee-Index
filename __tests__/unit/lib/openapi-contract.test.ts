import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { getOpenApiDocument } from "@/lib/openapi";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
] as const;

/** Collect every $ref value from a nested object (OpenAPI schema tree). */
function collectRefs(obj: unknown): string[] {
  if (obj === null || obj === undefined || typeof obj !== "object") return [];

  if (Array.isArray(obj)) return obj.flatMap(collectRefs);

  const refs: string[] = [];
  const record = obj as Record<string, unknown>;

  if (typeof record.$ref === "string") {
    refs.push(record.$ref);
  }

  for (const value of Object.values(record)) {
    refs.push(...collectRefs(value));
  }
  return refs;
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe("OpenAPI contract", () => {
  const doc = getOpenApiDocument();

  it("every registered path has at least one operation with responses", () => {
    const pathEntries = Object.entries(doc.paths ?? {});

    expect(pathEntries.length).toBeGreaterThan(0);

    for (const [path, pathItem] of pathEntries) {
      const operations = HTTP_METHODS.filter(
        (m) => pathItem && m in pathItem,
      ).map((m) => ({
        method: m,
        op: (pathItem as Record<string, unknown>)[m] as Record<string, unknown>,
      }));

      expect(
        operations.length,
        `${path} has no HTTP operations`,
      ).toBeGreaterThan(0);

      for (const { method, op } of operations) {
        expect(
          op.responses,
          `${method.toUpperCase()} ${path} is missing responses`,
        ).toBeTruthy();
      }
    }
  });

  it("every $ref resolves to a defined component schema", () => {
    const schemaNames = Object.keys(doc.components?.schemas ?? {});

    // The zod-to-openapi generator inlines schemas, so $refs are normally
    // absent. Guard anyway so any future $ref that appears must resolve.
    const allRefs = collectRefs(doc);
    const componentRefs = allRefs.filter((r) =>
      r.startsWith("#/components/schemas/"),
    );

    for (const ref of componentRefs) {
      const name = ref.replace("#/components/schemas/", "");
      expect(
        schemaNames,
        `$ref "${ref}" resolves to an undefined schema`,
      ).toContain(name);
    }
  });

  it("document exposes reusable component schemas", () => {
    const schemaNames = Object.keys(doc.components?.schemas ?? {});

    expect(schemaNames.length).toBeGreaterThan(0);
    // Core schemas the API relies on must always be present.
    expect(schemaNames).toContain("ZeeFile");
    expect(schemaNames).toContain("HealthResponse");
    expect(schemaNames).toContain("ErrorResponse");
  });
});
