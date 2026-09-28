import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
}

test("admin can preview note cards in the course classroom layout", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin");
  await page.getByRole("link", { name: "课程预览", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content\/course-preview$/);

  await expect(
    page.getByRole("heading", {
      name: "学习笔记 · 单词卡片课程",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .locator(".note-course-hero")
      .getByText("Daily practice", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Good morning", { exact: true })).toBeVisible();
  await expect(page.getByText("早上好", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "隐藏英文", exact: true }).click();
  await expect(page.getByText("点击显示英文", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "显示英文", exact: true }).click();
  await expect(page.getByText("Good morning", { exact: true })).toBeVisible();
});
