import { test, expect } from "@playwright/test";

test("homepage has title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Zee|Next.js/);
});

test("has generic heading", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("h1")).toBeVisible();
});
