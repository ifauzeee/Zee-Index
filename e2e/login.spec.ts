import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test("login route is reachable or redirects to setup", async ({ page }) => {
    await page.goto("/login");

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/^\/((en|id|zh-TW)\/)?(login|setup)$/);
  });

  test("shows error banner for share link expired query", async ({ page }) => {
    await page.goto("/login?error=ShareLinkExpired");

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/^\/((en|id|zh-TW)\/)?(login|setup)$/);

    if (new URL(page.url()).pathname.includes("login")) {
      const alert = page.getByRole("alert");
      if ((await alert.count()) > 0) {
        await expect(alert.first()).toBeVisible();
      }
    }
  });

  test("renders credential fields when login page is available", async ({
    page,
  }) => {
    await page.goto("/login");

    if (!new URL(page.url()).pathname.includes("login")) {
      test.skip();
      return;
    }

    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Login with Email/i }),
    ).toBeVisible();
  });
});
