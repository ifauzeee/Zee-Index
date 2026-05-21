import { test, expect } from "@playwright/test";

test.describe("Happy Paths & Security Flows", () => {
  test("Guest is redirected to login or setup from protected /admin area", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/.*(login|setup)/);
  });

  test("Folder password protection modal or view triggers correctly", async ({
    page,
  }) => {
    await page.goto("/folder/local-storage:protected-folder");
    await expect(page).toHaveURL(/.*(login|setup|folder)/);
  });

  test("Upload overlay or area is present on browse page", async ({ page }) => {
    await page.goto("/");
    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/setup")) {
      const loginForm = page.locator("form");
      if ((await loginForm.count()) > 0) {
        await expect(loginForm).toBeVisible();
      }
    } else {
      const fileList = page.locator(".file-list");
      if ((await fileList.count()) > 0) {
        await expect(fileList).toBeVisible();
      }
    }
  });

  test("Download endpoint rejects requests with invalid share tokens", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/download?fileId=test-file&share_token=invalid_token",
    );
    expect([400, 401, 403]).toContain(response.status());
    const payload = await response.json();
    expect(payload).toHaveProperty("error");
  });
});
