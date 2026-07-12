import { test, expect } from "@playwright/test";

test.describe("Share pages", () => {
  test("invalid share id without token does not crash", async ({ page }) => {
    await page.goto("/share/invalid-share-id-for-e2e");

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/\/((en|id|zh-TW)\/)?(share|login|setup)/);

    // Page should render something (error empty state, login, or setup)
    await expect(page.locator("body")).toBeVisible();
  });

  test("share with bad token stays on share or auth flow", async ({ page }) => {
    await page.goto("/share/x?share_token=not-a-valid-jwt");

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/\/((en|id|zh-TW)\/)?(share|login|setup)/);
  });
});
