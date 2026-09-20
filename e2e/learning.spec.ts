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
  await page.goto("/manage");
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
  await expect(page).toHaveURL(/\/learn\/sentences\/\d+/);
  const id = page.url().split("/").at(-1);
  await page.goto(`/manage?resource=sentences&id=${id}`);
  await page.getByLabel("Chinese Text", { exact: true }).fill("更新后的中文。");
  await page.getByRole("button", { name: "Save Card", exact: true }).click();
  const card = page.locator(".card").filter({ hasText: "更新后的中文。" });
  await expect(card).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.goto("/users");
  await expect(
    page.getByRole("heading", { name: "Users", exact: true }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  await page
    .getByLabel("Search (name / username / email)")
    .fill("learner_test");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Full name", { exact: true }).fill("Updated learner");
  await page.getByRole("button", { name: "Save Changes", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Updated learner");
  await page.goto("/admin/users/2/edit?q=no-matching-users");
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(
    "learner_test",
  );
  await page.goto("/users?id=999999");
  await expect(
    page.getByText("User not found.", { exact: true }),
  ).toBeVisible();
});
test("creating a study note opens its card creation form", async ({ page }) => {
  await login(page);
  const session = await (await page.request.get("/api/auth/session")).json();
  const headers = { "X-CSRF-Token": session.csrf_token };
  let noteId: string | null = null;
  try {
    await page.goto("/manage?resource=notes");
    await page
      .getByLabel("Title", { exact: true })
      .fill(`Browser study note ${Date.now()}`);
    await page.getByRole("button", { name: "Save Card", exact: true }).click();
    await expect(page).toHaveURL(/\/manage\?resource=note-items&parent_id=\d+/);
    noteId = new URL(page.url()).searchParams.get("parent_id");
    expect(noteId).not.toBeNull();
    await expect(
      page.getByLabel("Note (for MODULE02)", { exact: true }),
    ).toHaveValue(noteId!);
  } finally {
    if (noteId)
      expect(
        (
          await page.request.delete(`/api/content/notes/${noteId}`, { headers })
        ).ok(),
      ).toBeTruthy();
  }
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
