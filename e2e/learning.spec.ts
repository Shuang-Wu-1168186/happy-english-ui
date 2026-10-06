import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".module-groups")).toBeVisible();
}
test("original content editor preview and API create, edit, delete", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/content");
  await page.getByLabel("Module", { exact: true }).selectOption("sentences");
  await page
    .getByLabel("English Text", { exact: true })
    .fill("A browser test sentence.");
  await page
    .getByLabel("Chinese Text", { exact: true })
    .fill("浏览器测试句子。");
  await expect(page.locator(".preview-panel .cn")).toHaveText(
    "浏览器测试句子。",
  );
  await page.getByRole("button", { name: "Save Card", exact: true }).click();
  await expect(page).toHaveURL(
    /\/admin\/content\/notes\?resource=sentences&id=\d+/,
  );
  const id = new URL(page.url()).searchParams.get("id");
  expect(id).not.toBeNull();
  await page.getByLabel("Chinese Text", { exact: true }).fill("更新后的中文。");
  await page.getByRole("button", { name: "Save Card", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/content/notes\\?resource=sentences&id=${id}`),
  );
  await expect(page.locator(".preview-panel .cn")).toHaveText("更新后的中文。");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content\/notes\?resource=sentences$/);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("heading", { name: "用户管理", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page.getByLabel("搜索姓名、用户名或邮箱").fill("learner_test");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Updated learner");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Updated learner");
  await page.goto("/admin/users/2/edit?q=no-matching-users");
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
    "learner_test",
  );
  await page.goto("/admin/users?id=999999");
  await expect(
    page.getByText("该用户不存在。", { exact: true }),
  ).toBeVisible();
});
test("creating a study note opens its card creation form", async ({ page }) => {
  await login(page);
  const session = await (await page.request.get("/api/auth/session")).json();
  const headers = { "X-CSRF-Token": session.csrf_token };
  let noteId: string | null = null;
  try {
    await page.goto("/admin/content?resource=notes");
    await page
      .getByLabel("Title", { exact: true })
      .fill(`Browser study note ${Date.now()}`);
    await page.getByRole("button", { name: "Save Card", exact: true }).click();
    await expect(page).toHaveURL(
      /\/admin\/content\/notes\?resource=note-items&parent_id=\d+/,
    );
    noteId = new URL(page.url()).searchParams.get("parent_id");
    expect(noteId).not.toBeNull();
    await expect(
      page.getByLabel("Note (for MODULE02)", { exact: true }),
    ).toHaveValue(noteId!);
    const saveCard = page.getByRole("button", {
      name: "Save Card",
      exact: true,
    });
    await expect(saveCard).toBeDisabled();
    await page.getByLabel("Item Title", { exact: true }).fill("Picture note");
    await page.getByLabel("Raw Text", { exact: true }).fill("Picture note");
    await page
      .getByLabel("English Text", { exact: true })
      .fill("A note needs an image.");
    await page
      .getByLabel("Chinese Text", { exact: true })
      .fill("笔记需要一张图片。");
    await page
      .getByLabel("Example Image URL", { exact: true })
      .fill("/static/uploads/browser-note.webp");
    await expect(saveCard).toBeEnabled();
    await saveCard.click();
    await expect(page).toHaveURL(
      /\/admin\/content\/notes\?resource=note-items&id=\d+$/,
    );
  } finally {
    if (noteId)
      expect(
        (
          await page.request.delete(`/api/content/notes/${noteId}`, { headers })
        ).ok(),
      ).toBeTruthy();
  }
});
test("administrators can review login monitoring", async ({ page }) => {
  await login(page);
  await page.goto("/admin/login-monitor");
  await expect(
    page.getByRole("heading", { name: "登录监控", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "登录 IP", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody")).toContainText("admin_test");
  await expect(page.locator("tbody")).toContainText("成功");
});
test("signup, profile and password retain API flows", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name", { exact: true }).fill("New Learner");
  await page
    .getByLabel("Username", { exact: true })
    .fill(`browser_${Date.now()}`);
  await page.getByLabel("Password", { exact: true }).fill("BrowserTest123!");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.locator(".module-groups")).toBeVisible();
  await page.goto("/profile");
  await page.getByLabel("Full name", { exact: true }).fill("Updated Learner");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Profile saved");
  await page
    .getByRole("link", { name: "Change password", exact: true })
    .click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("BrowserTest123!");
  await page.getByLabel("New password", { exact: true }).fill("BrowserNew123!");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("BrowserNew123!");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  await page.goto("/manage");
  await expect(page.locator(".module-groups")).toBeVisible();
});
