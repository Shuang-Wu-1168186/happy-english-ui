import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function login(page: Page, username = "admin_test") {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".module-groups")).toBeVisible();
}
test("original homepage groups, role visibility and login", async ({
  page,
}) => {
  await login(page);
  await expect(page.locator(".module-card")).toHaveCount(9);
  await expect(
    page.locator(".module-group[open] .group-copy strong"),
  ).toHaveText("日常");
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Logout" }).click();
  await login(page, "learner_test");
  await expect(page.locator(".module-card")).toHaveCount(6);
  await expect(
    page.getByRole("link", { name: "后台管理", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("homepage management shortcut opens the separate admin workspace on desktop and mobile", async ({
  page,
}) => {
  await login(page);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const entry = page.getByRole("link", { name: "后台管理", exact: true });
    await expect(entry).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await entry.click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.locator(".admin-shell")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "管理工作台", exact: true }),
    ).toBeVisible();
    if (width < 981)
      await page
        .getByRole("button", { name: "Toggle admin navigation" })
        .click();
    const adminNav = page.getByRole("navigation", { name: "后台菜单" });
    await adminNav.getByRole("link", { name: "内容管理", exact: true }).click();
    await expect(page.getByLabel("Module", { exact: true })).toBeVisible();
    if (width < 981)
      await page
        .getByRole("button", { name: "Toggle admin navigation" })
        .click();
    await adminNav.getByRole("link", { name: "用户管理", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "用户管理", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".admin-users-table tbody tr").first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "编辑", exact: true }).first(),
    ).toBeVisible();
    expect(
      await page.locator(".admin-users-table").evaluate((table) => {
        const container = table.parentElement;
        return Boolean(container && table.scrollWidth <= container.clientWidth);
      }),
    ).toBeTruthy();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    if (width < 981)
      await page
        .getByRole("button", { name: "Toggle admin navigation" })
        .click();
    await adminNav.getByRole("link", { name: "登录监控", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "登录监控", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator(".admin-login-table tbody tr").first(),
    ).toBeVisible();
    expect(
      await page.locator(".admin-login-table").evaluate((table) => {
        const container = table.parentElement;
        return Boolean(container && table.scrollWidth <= container.clientWidth);
      }),
    ).toBeTruthy();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
  await page.goto("/manage?resource=interviews");
  await expect(page).toHaveURL(/\/admin\/content\?resource=interviews$/);
  await expect(
    page.getByRole("heading", {
      name: "Create Interview Question",
      exact: true,
    }),
  ).toBeVisible();
});
test("daily card blur, search, jump and automatic study progress", async ({
  page,
}) => {
  await login(page);
  await page.goto("/learn/sentences");
  await expect(page.locator(".card")).toHaveCount(2);
  await expect(page.locator(".english").first()).toBeHidden();
  await page
    .getByRole("button", { name: "Show or hide English" })
    .first()
    .click();
  await expect(page.locator(".english").first()).toBeVisible();
  await page.getByRole("button", { name: "1 / 2", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Card number" }).fill("2");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page.locator(".bottom-counter")).toHaveText("2 / 2");
  await expect
    .poll(async () => {
      const r = await page.request.get("/api/progress");
      return (await r.json()).find(
        (p: { content_type: string }) => p.content_type === "everyday_sentence",
      )?.item_id;
    })
    .toBe(2);
  await page.getByRole("searchbox", { name: "Search cards" }).fill("Hello");
  await page.getByRole("searchbox", { name: "Search cards" }).press("Enter");
  await expect(page.locator(".card")).toHaveCount(1);
  await page.screenshot({
    path: "test-results/sentences-desktop.png",
    fullPage: true,
  });
});
test("all original learning layouts and page flip survive navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  for (const [resource, selector] of [
    ["kids-cards", ".kids-card"],
    ["phonics", ".lesson-card"],
    ["textbook", ".lesson-article"],
    ["dialogues", ".lesson-content"],
    ["math-cards", ".math-card"],
    ["notes", ".note-card"],
    ["vocabulary", ".card"],
    ["interviews", ".interview-card"],
  ]) {
    await page.goto(`/learn/${resource}`);
    await expect(page.locator(selector).first()).toBeVisible();
    await page.screenshot({
      path: `test-results/${resource}-desktop.png`,
      fullPage: true,
    });
  }
  await page.goto("/learn/phonics/1");
  await page.getByRole("button", { name: "cat", exact: true }).click();
  await expect(page.locator(".quiz-feedback")).toContainText("答对了");
  await page.goto("/learn/kids-cards");
  await expect(page.locator(".kids-card").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark apple as learned" }).click();
  await expect(page.locator(".learned-badge")).toHaveText("1 learned");
  await page
    .getByRole("button", { name: "显示清晰的中文标题 for apple" })
    .click();
  await expect(page.locator(".translation-cn").first()).toHaveCSS(
    "filter",
    "none",
  );
  await page.goto("/learn/notes/1");
  await expect(page.locator(".dictation-input")).toBeVisible();
  await page.locator(".dictation-input").fill("Good morning");
  await page.getByRole("button", { name: "检查", exact: true }).click();
  await expect(page.locator(".dictation-feedback")).toContainText("正确");
  await expect
    .poll(async () => {
      const records = await (await page.request.get("/api/progress")).json();
      return records.find(
        (p: { content_type: string; parent_id: number }) =>
          p.content_type === "english_note" && p.parent_id === 1,
      )?.completed;
    })
    .toBe(1);
  await page.screenshot({
    path: "test-results/note-items-desktop.png",
    fullPage: true,
  });
  await page.getByTitle("Home", { exact: true }).click();
  await expect(page.locator(".module-groups")).toBeVisible();
  expect(errors).toEqual([]);
});
test("old note links retain forward and backward page flips", async ({
  page,
}) => {
  await login(page);
  const session = await (await page.request.get("/api/auth/session")).json();
  const headers = { "X-CSRF-Token": session.csrf_token };
  const previewImage = "/static/uploads/english_note_item/lightbox-test.png";
  await page.route(`**${previewImage}`, (route) =>
    route.fulfill({
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect width="1280" height="720" fill="#2563eb"/><text x="640" y="360" fill="white" font-family="Arial" font-size="72" font-weight="700" text-anchor="middle">Image preview</text></svg>`,
      contentType: "image/svg+xml",
    }),
  );
  const template = await page.request.post("/api/content/note-items", {
    headers,
    data: {
      note_id: 1,
      item_type: "knowledge",
      item_title: "Study Notes",
      raw_text: "Keep useful English in one place and review it regularly.",
      english_text: "New words · useful phrases · example sentences",
      chinese_text: "把新单词、实用短语和例句集中记录，并定期复习。",
      explanation: "Use this note as a starting point for your English learning records.",
      examples: "Vocabulary\nPhrases\nExample sentences",
    },
  });
  expect(template.ok()).toBeTruthy();
  const templateItem = await template.json();
  const created = await page.request.post("/api/content/note-items", {
    headers,
    data: {
      note_id: 1,
      item_type: "knowledge",
      item_title: "Second note",
      raw_text: "Second note",
      english_text: "A second page",
      chinese_text: "第二页",
      example_image_url: previewImage,
      example_image_alt: "Preview test image",
      priority_order: 100,
    },
  });
  expect(created.ok()).toBeTruthy();
  const item = await created.json();
  try {
    await page.goto("/learn/notes");
    await expect(
      page
        .locator(".note-card")
        .filter({ hasText: "Daily practice" })
        .getByText("2 cards", { exact: true }),
    ).toBeVisible();
    await page.goto("/english/note-cards?note_id=1");
    await expect(page).toHaveURL(/\/learn\/notes\/1/);
    const next = page.getByRole("button", { name: "Next card", exact: true });
    const previous = page.getByRole("button", {
      name: "Previous card",
      exact: true,
    });
    await expect(previous).toBeDisabled();
    await next.click();
    await expect(page.locator(".counter-btn")).toHaveText("2 / 2");
    await expect(next).toBeDisabled();
    await expect(page.locator(".knowledge-card-hero h3")).toBeVisible();
    const previewTrigger = page.getByRole("button", {
      name: "全屏查看图片：Preview test image",
    });
    await expect(previewTrigger).toBeVisible();
    await previewTrigger.click();
    const preview = page.getByRole("dialog", { name: "图片预览" });
    await expect(preview).toBeVisible();
    await expect(preview).toHaveCSS("position", "fixed");
    await expect
      .poll(() =>
        preview.locator("img").evaluate((image) => {
          return (image as HTMLImageElement).naturalWidth;
        }),
      )
      .toBeGreaterThan(0);
    expect(
      await preview.evaluate(
        (element) => element.parentElement === document.body,
      ),
    ).toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(preview).toHaveCount(0);
    await previous.click();
    await expect(page.locator(".counter-btn")).toHaveText("1 / 2");
    await expect(previous).toBeDisabled();
    await expect(page.locator(".dictation-input")).toBeVisible();
  } finally {
    expect(
      (
        await page.request.delete(`/api/content/note-items/${item.id}`, {
          headers,
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await page.request.delete(
          `/api/content/note-items/${templateItem.id}`,
          { headers },
        )
      ).ok(),
    ).toBeTruthy();
  }
});
test("mobile module layouts", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  for (const resource of [
    "kids-cards",
    "phonics",
    "textbook",
    "dialogues",
    "math-cards",
    "notes",
    "sentences",
    "vocabulary",
    "interviews",
  ]) {
    await page.goto(`/learn/${resource}`);
    await expect(page.locator("main h1").first()).toBeVisible();
    await page.screenshot({
      path: `test-results/${resource}-mobile.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      resource,
    ).toBeTruthy();
  }
});
