import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
}

test("administrator can open topic maintenance from the content menu", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin");
  await page.getByRole("link", { name: "专题维护", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content\/topics$/);
  await expect(
    page.getByRole("heading", { name: "专题维护", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".topic-pagination")).toContainText(
    /共 \d+ 个专题，第 \d+ \/ \d+ 页/,
  );

  await page.getByLabel("搜索专题", { exact: true }).fill("英文课本");
  await page.getByRole("button", { name: "查询", exact: true }).click();
  await expect(page.locator(".topic-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await expect(page.locator(".topic-table tbody tr")).toHaveCount(8);

  const title = `浏览器专题 ${Date.now()}`;
  await page.getByRole("button", { name: "新建专题", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "新建专题", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".topic-editor-card")).toHaveCount(0);
  await page
    .getByLabel("所属学习区域", { exact: true })
    .selectOption({ index: 1 });
  await page
    .getByLabel("专题编码", { exact: true })
    .fill(`browser-topic-${Date.now()}`);
  await page.getByLabel("专题名称", { exact: true }).fill(title);
  await page.getByRole("button", { name: "保存专题", exact: true }).click();
  const row = page.locator(".topic-table tbody tr").filter({ hasText: title });
  await expect(row).toBeVisible();

  const session = await (await page.request.get("/api/auth/session")).json();
  const headers = { "X-CSRF-Token": session.csrf_token };
  /*
  const topicResponse = await page.request.get(
    \`/api/admin/learning-topics?q=\${encodeURIComponent(title)}\`,
  );
  expect(topicResponse.ok()).toBeTruthy();
  const createdTopic = (await topicResponse.json()).items.find(
    (topic: { topic_code: string }) =>
      topic.topic_code.startsWith("browser-topic-"),
  );
  expect(createdTopic).toBeTruthy();
  const associatedCourseTitle = \`浏览器待关联课程 \${Date.now()}\`;
  const associatedCourseResponse = await page.request.post(
    "/api/admin/learning/courses",
    {
      headers,
      data: {
        topic_id: 2,
        course_code: \`browser-association-\${Date.now()}\`,
        title: associatedCourseTitle,
        sort_order: 10,
      },
    },
  );
  expect(associatedCourseResponse.ok()).toBeTruthy();
  */
  const topicResponse = await page.request.get(
    "/api/admin/learning-topics?q=" + encodeURIComponent(title),
  );
  expect(topicResponse.ok()).toBeTruthy();
  const createdTopic = (await topicResponse.json()).items.find(
    (topic: { topic_code: string }) =>
      topic.topic_code.startsWith("browser-topic-"),
  );
  expect(createdTopic).toBeTruthy();
  const associatedCourseTitle = "浏览器待关联课程 " + Date.now();
  const associatedCourseResponse = await page.request.post(
    "/api/admin/learning/courses",
    {
      headers,
      data: {
        course_code: "browser-association-" + Date.now(),
        title: associatedCourseTitle,
        sort_order: 10,
      },
    },
  );
  expect(associatedCourseResponse.ok()).toBeTruthy();
  const associatedCourseId = (await associatedCourseResponse.json()).id;

  await expect(
    row.getByRole("button", { name: "课程管理", exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "课程管理", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: `课程管理：${title}`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("该专题还没有关联课程。点击“关联课程”选择课程。", {
      exact: true,
    }),
  ).toBeVisible();
  const emptyCourseDialog = page.getByRole("dialog", {
    name: `课程管理：${title}`,
    exact: true,
  });
  await emptyCourseDialog
    .getByRole("button", { name: "关联课程", exact: true })
    .click();
  const courseAssociationForm = emptyCourseDialog.locator(
    ".topic-course-association-form",
  );
  await courseAssociationForm
    .locator("label")
    .filter({ hasText: associatedCourseTitle })
    .getByRole("checkbox")
    .check();
  await courseAssociationForm
    .getByRole("button", { name: "关联课程", exact: true })
    .click();
  const associatedCourse = emptyCourseDialog
    .locator(".topic-course-order-item")
    .filter({ hasText: associatedCourseTitle });
  await expect(associatedCourse).toBeVisible();
  const associatedDelete = associatedCourse.getByRole("button", {
    name: `移除课程：${associatedCourseTitle}`,
    exact: true,
  });
  await expect(associatedDelete).toHaveCSS("opacity", "0");
  await associatedCourse.hover();
  await expect(associatedDelete).toHaveCSS("opacity", "1");
  page.once("dialog", (dialog) => dialog.accept());
  await associatedDelete.click();
  await expect(
    emptyCourseDialog.locator(".topic-course-order-item"),
  ).toHaveCount(0);
  const associatedCourseStillExists = await page.request.get(
    `/api/admin/learning-courses?q=${encodeURIComponent(associatedCourseTitle)}`,
  );
  expect(associatedCourseStillExists.ok()).toBeTruthy();
  expect(
    (await associatedCourseStillExists.json()).items.some(
      (course: { id: number }) => course.id === associatedCourseId,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "关闭", exact: true }).click();

  const createdCourseIds: number[] = [];
  const createdMaterialIds: number[] = [];
  const materialLabels: Array<{
    title: string;
    code: string;
    courseTitle: string;
  }> = [];
  const courseTitleByCourseId = new Map<number, string>();
  const materialIdByCourseId = new Map<number, number>();
  const materialTitleById = new Map<number, string>();
  const runId = Date.now();
  for (const [index, materialTitle] of [
    "排序教材一",
    "排序教材二",
    "排序教材三",
  ].entries()) {
    const materialCode = `browser-order-material-${runId}-${index}`;
    const courseTitle = `课程备用名称 ${index + 1}`;
    const materialResponse = await page.request.post(
      "/api/admin/learning-materials",
      {
        headers,
        data: {
          topic_id: createdTopic.id,
          material_code: materialCode,
          title: materialTitle,
          material_type: "courseware",
        },
      },
    );
    expect(materialResponse.ok()).toBeTruthy();
    const material = await materialResponse.json();
    createdMaterialIds.push(material.id);
    const response = await page.request.post("/api/admin/learning/courses", {
      headers,
      data: {
        topic_id: createdTopic.id,
        material_id: material.id,
        course_code: `browser-order-${runId}-${index}`,
        title: courseTitle,
        sort_order: index * 10,
      },
    });
    expect(response.ok()).toBeTruthy();
    const createdCourse = await response.json();
    createdCourseIds.push(createdCourse.id);
    courseTitleByCourseId.set(createdCourse.id, courseTitle);
    materialIdByCourseId.set(createdCourse.id, material.id);
    materialTitleById.set(material.id, materialTitle);
    materialLabels.push({
      title: materialTitle,
      code: materialCode,
      courseTitle,
    });
  }

  await page.reload();
  const refreshedRow = page
    .locator(".topic-table tbody tr")
    .filter({ hasText: title });
  await refreshedRow
    .getByRole("button", { name: "课程管理", exact: true })
    .click();
  const orderDialog = page.getByRole("dialog", {
    name: `课程管理：${title}`,
    exact: true,
  });
  await expect(orderDialog).toBeVisible();
  const courseItems = orderDialog.locator(".topic-course-order-item");
  await expect(courseItems).toHaveCount(3);
  await expect(courseItems.nth(0)).toHaveAttribute("draggable", "true");
  await expect(
    orderDialog.getByText("拖住左侧手柄调整学习顺序。", { exact: false }),
  ).toBeVisible();
  await expect(courseItems.nth(0)).toContainText(materialLabels[0].courseTitle);
  await expect(courseItems.nth(0)).not.toContainText(materialLabels[0].title);
  await expect(courseItems.nth(0)).not.toContainText(materialLabels[0].code);
  const initialOrder = await courseItems.evaluateAll((items) =>
    items.map((item) => Number(item.getAttribute("data-course-id"))),
  );
  await courseItems.nth(0).dragTo(courseItems.nth(2));
  await expect
    .poll(async () =>
      courseItems.evaluateAll((items) =>
        items.map((item) => Number(item.getAttribute("data-course-id"))),
      ),
    )
    .not.toEqual(initialOrder);
  const expectedOrder = await courseItems.evaluateAll((items) =>
    items.map((item) => Number(item.getAttribute("data-course-id"))),
  );
  await orderDialog
    .getByRole("button", { name: "保存顺序", exact: true })
    .click();
  await expect(orderDialog).toHaveCount(0);
  const orderedTopicResponse = await page.request.get(
    `/api/admin/learning-topics/${createdTopic.id}`,
  );
  expect(orderedTopicResponse.ok()).toBeTruthy();
  expect(
    (await orderedTopicResponse.json()).courses.map(
      (course: { id: number }) => course.id,
    ),
  ).toEqual(expectedOrder);

  await page.goto(`/course-topics/${createdTopic.id}`);
  const materialCards = page.locator(".course-catalog-card");
  await expect(materialCards).toHaveCount(3);
  expect(
    await materialCards.evaluateAll((cards) =>
      cards.map((card) => Number(card.getAttribute("data-material-id"))),
    ),
  ).toEqual(expectedOrder.map((courseId) => materialIdByCourseId.get(courseId)));
  expect(await materialCards.locator("strong").allTextContents()).toEqual(
    expectedOrder.map((courseId) =>
      materialTitleById.get(materialIdByCourseId.get(courseId) || 0),
    ),
  );
  await materialCards.nth(0).click();
  await expect(page).toHaveURL(/\/learning-materials\/\d+$/);
  await expect(page.locator(".material-learning-space")).toBeVisible();

  await page.goto("/admin/content/topics");
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: "课程管理", exact: true }).click();
  const removalDialog = page.getByRole("dialog", {
    name: `课程管理：${title}`,
    exact: true,
  });
  const removedCourseId = expectedOrder[0];
  const removedCourseTitle = courseTitleByCourseId.get(removedCourseId);
  expect(removedCourseTitle).toBeTruthy();
  const removalButton = removalDialog.getByRole("button", {
    name: `移除课程：${removedCourseTitle}`,
    exact: true,
  });
  await removalButton.locator("xpath=..").hover();
  await expect(removalButton).toHaveCSS("opacity", "1");
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain(`课程“${removedCourseTitle}”`);
    expect(dialog.message()).toContain("课程、教材和课时都会保留");
    dialog.accept();
  });
  await removalButton.click();
  await expect(removalDialog.locator(".topic-course-order-item")).toHaveCount(
    2,
  );
  await expect(removalDialog).toContainText("课程、教材和课时都会保留");
  await expect(row).toContainText("课程 2");
  const afterRemoval = await page.request.get(
    `/api/admin/learning-topics/${createdTopic.id}`,
  );
  expect(afterRemoval.ok()).toBeTruthy();
  expect(
    (await afterRemoval.json()).courses.map(
      (course: { id: number }) => course.id,
    ),
  ).not.toContain(removedCourseId);
  await removalDialog
    .getByRole("button", { name: "取消", exact: true })
    .click();

  await row.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: `编辑：${title}`, exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  for (const courseId of [...createdCourseIds, associatedCourseId]) {
    const response = await page.request.delete(
      `/api/admin/learning/courses/${courseId}`,
      { headers },
    );
    expect(response.ok()).toBeTruthy();
  }
  for (const materialId of createdMaterialIds) {
    const response = await page.request.delete(
      `/api/admin/learning-materials/${materialId}`,
      { headers },
    );
    expect(response.ok()).toBeTruthy();
  }
  page.once("dialog", (dialog) => dialog.accept());
  await row.getByRole("button", { name: "删除", exact: true }).click();
  await expect(row).toHaveCount(0);
});
