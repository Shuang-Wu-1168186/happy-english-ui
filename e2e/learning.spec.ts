import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { apiItems } from "./opaque";
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
    /\/admin\/content\/notes\?resource=sentences&id=hei1_[A-Za-z0-9_-]+/,
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
  const learner = (await apiItems(page, "/api/admin/users?q=learner_test"))[0];
  if (!learner)
    throw new Error("Learner was not returned by the browser test API");
  await page.goto(`/admin/users/${learner.id}/edit?q=no-matching-users`);
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
    "learner_test",
  );
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
      /\/admin\/content\/notes\?resource=note-items&parent_id=hei1_[A-Za-z0-9_-]+/,
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
      /\/admin\/content\/notes\?resource=note-items&id=hei1_[A-Za-z0-9_-]+$/,
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
test("an expired admin session returns to login and keeps the requested page", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("heading", { name: "用户管理", exact: true }),
  ).toBeVisible();
  const session = await (await page.request.get("/api/auth/session")).json();
  const sessionCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === "happyenglish_session",
  );
  if (!sessionCookie)
    throw new Error("Expected an authenticated browser session cookie.");
  const revoke = await page.request.post("/api/auth/logout", {
    headers: {
      "X-CSRF-Token": session.csrf_token,
    },
  });
  expect(revoke.ok()).toBeTruthy();
  const revokedSession = await (
    await page.request.get("/api/auth/session")
  ).json();
  expect(revokedSession.user).toBeNull();
  // Keep the stale browser cookie so the next in-page request receives the
  // same 401 a user sees after their server-side session has been revoked.
  await page.context().addCookies([sessionCookie]);

  await page.getByLabel("搜索姓名、用户名或邮箱").fill("admin");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page).toHaveURL(
    /\/login\?next=%2Fadmin%2Fusers%3Fq%3Dadmin%26role%3D%26status%3D$/,
  );
  await expect(
    page.getByRole("heading", { name: "Login to your account", exact: true }),
  ).toBeVisible();

  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/users\?q=admin&role=&status=$/);
  await expect(
    page.getByRole("heading", { name: "用户管理", exact: true }),
  ).toBeVisible();
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
