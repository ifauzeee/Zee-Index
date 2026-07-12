import { test, expect } from "@playwright/test";

test.describe("Happy Paths & Security Flows", () => {
  test("Guest is redirected to login or setup from protected /admin area", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/^\/((en|id|zh-TW)\/)?(login|setup)$/);
  });

  test("protected folder path redirects to auth or stays on folder flow", async ({
    page,
  }) => {
    await page.goto("/folder/local-storage:protected-folder");
    await expect
      .poll(() => new URL(page.url()).pathname)
      .toMatch(/\/((en|id|zh-TW)\/)?(login|setup|folder)/);
  });

  test("home lands on setup, login, or app shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Zee Index/i);

    const path = new URL(page.url()).pathname;
    const isOk =
      path === "/" ||
      /\/((en|id|zh-TW)\/)?(setup|login|folder)/.test(path) ||
      path.startsWith("/en") ||
      path.startsWith("/id");
    expect(isOk).toBeTruthy();

    // Prefer stable chrome when app shell is shown
    const search = page.locator("#header-search-bar");
    if ((await search.count()) > 0) {
      await expect(search.first()).toBeVisible();
    }
  });
});
