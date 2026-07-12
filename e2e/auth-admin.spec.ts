import { test, expect } from "@playwright/test";

const adminEmail =
  process.env.E2E_ADMIN_EMAIL || process.env.ADMIN_EMAILS || "";
const adminPassword =
  process.env.E2E_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";

test.describe("Credentials admin login", () => {
  test.skip(
    !adminEmail || !adminPassword || !process.env.GOOGLE_REFRESH_TOKEN,
    "Requires configured app + ADMIN_EMAILS/ADMIN_PASSWORD for credentials login",
  );

  test("admin can sign in with email/password and open dashboard", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/^\/((en|id|zh-TW)\/)?login$/);

    await page.locator("#email").fill(adminEmail.split(",")[0].trim());
    await page.locator("#password").fill(adminPassword);
    await page.getByRole("button", { name: /Login with Email/i }).click();

    // After login we should leave the login page (home/folder or 2FA).
    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
      .not.toMatch(/\/login$/);

    await page.goto("/admin");

    await expect
      .poll(() => new URL(page.url()).pathname, { timeout: 30_000 })
      .toMatch(/\/((en|id|zh-TW)\/)?admin/);

    await expect(
      page.getByRole("heading", { name: /Admin Dashboard|Dasbor Admin/i }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test("wrong password stays on login flow", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(adminEmail.split(",")[0].trim());
    await page.locator("#password").fill("definitely-wrong-password-xyz");
    await page.getByRole("button", { name: /Login with Email/i }).click();

    // Credentials failure should not land on admin.
    await page.waitForTimeout(1500);
    await page.goto("/admin");
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/^\/((en|id|zh-TW)\/)?(login|setup)$/);
  });
});
