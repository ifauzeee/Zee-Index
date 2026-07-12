import { test, expect } from "@playwright/test";

test.describe("Public API security contracts", () => {
  test("health endpoint returns structured payload", async ({ request }) => {
    const response = await request.get("/api/health");
    expect([200, 503]).toContain(response.status());
    const payload = await response.json();
    expect(payload).toHaveProperty("status");
    expect(payload).toHaveProperty("services");
  });

  test("public config endpoint returns JSON or setup-related error", async ({
    request,
  }) => {
    const response = await request.get("/api/config/public");
    expect([200, 401, 403, 500, 503]).toContain(response.status());
    const contentType = response.headers()["content-type"] || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      expect(payload).toBeTruthy();
    }
  });

  test("download rejects invalid share token", async ({ request }) => {
    const response = await request.get(
      "/api/download?fileId=test-file&share_token=invalid_token",
    );
    expect([400, 401, 403]).toContain(response.status());
    const payload = await response.json();
    expect(payload).toHaveProperty("error");
  });

  test("download rejects missing fileId", async ({ request }) => {
    const response = await request.get("/api/download");
    expect([400, 401, 403, 404]).toContain(response.status());
  });

  test("admin stats rejects unauthenticated access", async ({ request }) => {
    const response = await request.get("/api/admin/stats");
    // 401/403 when configured without session; 503 when app still in setup mode
    expect([401, 403, 503]).toContain(response.status());
    const contentType = response.headers()["content-type"] || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      expect(payload).toHaveProperty("error");
    }
  });
});
