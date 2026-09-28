import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
}

test("course development saves an ordered multi-material membership course", async ({
  page,
}) => {
  await login(page);
  const session = await (await page.request.get("/api/auth/session")).json();
  const headers = { "X-CSRF-Token": session.csrf_token };
  const modulesResponse = await page.request.get("/api/learning/modules");
  expect(modulesResponse.ok()).toBeTruthy();
  const moduleId = (await modulesResponse.json()).items[0].id;
  const runId = Date.now();
  const topicTitle = `课程开发专题 ${runId}`;
  const materialOneTitle = `课程教材一 ${runId}`;
  const materialTwoTitle = `课程教材二 ${runId}`;
  const courseTitle = `多教材会员课程 ${runId}`;
  let topicId = 0;
  const materialIds: number[] = [];
  let courseId = 0;

  try {
    const topicResponse = await page.request.post(
      "/api/admin/learning/topics",
      {
        headers,
        data: {
          module_id: moduleId,
          topic_code: `course-development-topic-${runId}`,
          title: topicTitle,
        },
      },
    );
    expect(
      topicResponse.ok(),
      `${topicResponse.status()} ${await topicResponse.text()}`,
    ).toBeTruthy();
    topicId = (await topicResponse.json()).id;

    for (const [index, title] of [
      materialOneTitle,
      materialTwoTitle,
    ].entries()) {
      const materialResponse = await page.request.post(
        "/api/admin/learning-materials",
        {
          headers,
          data: {
            topic_id: topicId,
            material_code: `course-development-material-${runId}-${index + 1}`,
            title,
            material_type: "textbook",
          },
        },
      );
      expect(materialResponse.ok()).toBeTruthy();
      materialIds.push((await materialResponse.json()).id);
    }

    await page.goto("/admin/learning/courses");
    await expect(
      page.getByRole("heading", { name: "课程开发", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "新建课程", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "新建课程", exact: true });
    await expect(dialog).toBeVisible();
    await dialog
      .getByLabel("课程编码", { exact: true })
      .fill(`multi-material-course-${runId}`);
    await dialog.getByLabel("课程名称", { exact: true }).fill(courseTitle);
    await dialog
      .locator(".course-material-options > button")
      .filter({ hasText: materialOneTitle })
      .click();
    await dialog
      .locator(".course-material-options > button")
      .filter({ hasText: materialTwoTitle })
      .click();
    const selectedMaterials = dialog.locator(".course-selected-materials li");
    await expect(selectedMaterials).toHaveCount(2);
    await selectedMaterials.nth(1).dragTo(selectedMaterials.nth(0), {
      targetPosition: { x: 20, y: 3 },
    });
    await expect(selectedMaterials.nth(0)).toContainText(materialTwoTitle);
    await dialog.getByLabel("是否免费", { exact: true }).uncheck();
    await dialog.getByRole("button", { name: "保存课程", exact: true }).click();

    const row = page
      .locator(".course-development-table tbody tr")
      .filter({ hasText: courseTitle });
    await expect(row).toBeVisible();
    await expect(row).toContainText(materialOneTitle);
    await expect(row).toContainText(materialTwoTitle);
    await expect(row).toContainText("会员权益");

    const coursesResponse = await page.request.get(
      `/api/admin/learning-courses?q=${encodeURIComponent(courseTitle)}`,
    );
    expect(coursesResponse.ok()).toBeTruthy();
    const course = (await coursesResponse.json()).items.find(
      (item: { title: string }) => item.title === courseTitle,
    );
    expect(course).toBeTruthy();
    courseId = course.id;
    expect(course.material_ids).toEqual([...materialIds].reverse());
    expect(course.access_policy).toBe("benefit");

    await row.getByRole("button", { name: "编辑", exact: true }).click();
    const editDialog = page.getByRole("dialog", {
      name: `编辑课程：${courseTitle}`,
      exact: true,
    });
    await expect(
      editDialog.getByLabel("是否免费", { exact: true }),
    ).not.toBeChecked();
    await editDialog.getByLabel("是否免费", { exact: true }).check();
    await editDialog
      .getByRole("button", { name: "保存课程", exact: true })
      .click();
    await expect(row).toContainText("免费");

    const updatedCoursesResponse = await page.request.get(
      `/api/admin/learning-courses?q=${encodeURIComponent(courseTitle)}`,
    );
    const updatedCourse = (await updatedCoursesResponse.json()).items.find(
      (item: { id: number }) => item.id === courseId,
    );
    expect(updatedCourse.access_policy).toBe("free");
  } finally {
    if (courseId) {
      await page.request.delete(`/api/admin/learning/courses/${courseId}`, {
        headers,
      });
    }
    for (const materialId of materialIds) {
      await page.request.delete(`/api/admin/learning-materials/${materialId}`, {
        headers,
      });
    }
    if (topicId) {
      await page.request.delete(`/api/admin/learning/topics/${topicId}`, {
        headers,
      });
    }
  }
});
