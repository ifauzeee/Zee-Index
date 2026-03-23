import { test, expect } from "@playwright/test";

test("health endpoint returns a structured payload", async ({ request }) => {
  const response = await request.get("/api/health");

  expect([200, 503]).toContain(response.status());

  const payload = await response.json();
  expect(payload).toHaveProperty("status");
  expect(payload).toHaveProperty("timestamp");
  expect(payload).toHaveProperty("services");
  expect(payload.services).toHaveProperty("database");
  expect(payload.services).toHaveProperty("cache");
  expect(payload.services).toHaveProperty("google_drive");
});

test("login route is reachable or redirects to setup when the app is not configured", async ({
  page,
}) => {
  await page.goto("/login");

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toMatch(/^\/((en|id)\/)?(login|setup)$/);
});

test("admin route redirects unauthenticated visitors away from the admin area", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect
    .poll(() => new URL(page.url()).pathname)
    .toMatch(/^\/((en|id)\/)?(login|setup)$/);
});
