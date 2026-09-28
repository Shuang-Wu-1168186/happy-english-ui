import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
}

test("admin can open the put aside mini-program preview", async ({ page }) => {
  await login(page);
  await page.goto("/admin");
  await page.getByRole("link", { name: "小程序样稿", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content\/put-aside-mini-program$/);

  await expect(page.locator(".mini-course-phone")).toBeVisible();
  await expect(page.locator("#mini-put-aside-title")).toHaveText("put aside");
  await expect(
    page.getByText("把……放到一边；暂时不考虑；留出 / 存下", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Let’s put aside the UI issue and focus on the API first.", {
      exact: true,
    }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator(".mini-course-phone")).toBeVisible();
  expect(
    await page.locator(".mini-course-scroll").evaluate((element) => {
      element.scrollTo({ top: element.scrollHeight });
      return element.scrollTop;
    }),
  ).toBeGreaterThan(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
