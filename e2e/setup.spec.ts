import { test, expect } from "@playwright/test";

test.describe("Setup wizard", () => {
  test("shows setup UI when app is unconfigured or allows login when configured", async ({
    page,
  }) => {
    await page.goto("/setup");

    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/^\/((en|id|zh-TW)\/)?(setup|login)$/);

    const path = new URL(page.url()).pathname;
    if (path.includes("setup")) {
      await expect(page.getByRole("heading").first()).toBeVisible();
      const authorize = page.getByRole("button", { name: /authorize/i });
      if ((await authorize.count()) > 0) {
        await expect(authorize.first()).toBeVisible();
      }
    } else {
      await expect(
        page
          .getByRole("button", {
            name: /Login with Email|Continue with Google/i,
          })
          .first(),
      ).toBeVisible();
    }
  });
});
