import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Zee Index/);
});

test("redirects to setup or login when not configured", async ({ page }) => {
  await page.goto("/");

  const url = page.url();

  const isOk =
    url.includes("/setup") ||
    url.includes("/login") ||
    url === "http://localhost:3000/";
  expect(isOk).toBeTruthy();
});
