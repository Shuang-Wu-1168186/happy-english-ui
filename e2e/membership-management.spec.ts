import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
}

test("administrator can open a benefit's course authorization editor", async ({
  page,
}) => {
  await login(page);

  const session = await (await page.request.get("/api/auth/session")).json();
  const headers = { "X-CSRF-Token": session.csrf_token };
  const suffix = Date.now();
  const courseTitle = `会员授权课程 ${suffix}`;
  const courseResponse = await page.request.post(
    "/api/admin/learning/courses",
    {
      headers,
      data: {
        topic_id: 1,
        course_code: `membership-course-${suffix}`,
        title: courseTitle,
        access_policy: "benefit",
        sort_order: 1,
      },
    },
  );
  expect(courseResponse.ok()).toBeTruthy();

  const benefitTitle = `会员课程权益 ${suffix}`;
  const benefitResponse = await page.request.post(
    "/api/admin/membership-benefits",
    {
      headers,
      data: {
        benefit_code: `membership-access-${suffix}`,
        name: benefitTitle,
        benefit_type: "content_access",
        value_type: "boolean",
        default_value: true,
        status: "active",
      },
    },
  );
  expect(benefitResponse.ok()).toBeTruthy();

  await page.goto("/admin/membership");
  await expect(
    page.getByRole("heading", { name: "会员管理", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "会员权益", exact: true }).click();

  const row = page.locator(".membership-table tbody tr").filter({
    hasText: benefitTitle,
  });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "授权课程", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "选择需要授权的课程", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("无法读取当前课程授权，请关闭后重试。", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(courseTitle, { exact: true })).toBeVisible();
});
