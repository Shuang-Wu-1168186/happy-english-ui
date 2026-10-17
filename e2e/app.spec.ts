import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function login(page: Page, username = "admin_test") {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
}
test("learning homepage dashboard and login", async ({ page }) => {
  await login(page);
  await expect(page.locator(".learning-area-card")).toHaveCount(6);
  await expect(
    page.getByRole("heading", { name: "选择你的学习区域", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await login(page, "learner_test");
  await expect(page.locator(".learning-area-card")).toHaveCount(6);
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
test("homepage reveals a recently learned phrase", async ({ page }) => {
  await page.route("**/api/learning/review-items**", async (route) => {
    await route.fulfill({
      json: {
        items: [
          {
            id: 101,
            resource: "sentences",
            item_id: 1,
            label: "日常短语",
            prompt: "Thank you.",
            answer: "谢谢。",
          },
        ],
      },
    });
  });
  await login(page);
  await expect(
    page.getByRole("heading", {
      name: "考考自己：近 7 天学过的单词和短语",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Thank you.", { exact: true })).toBeVisible();
  await expect(page.getByText("谢谢。", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "点击查看释义", exact: true }).click();
  await expect(page.getByText("谢谢。", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /回到内容/ })).toHaveAttribute(
    "href",
    "/learn/sentences/1",
  );
});
test("foundation learning separates textbook, phonics, and textbook vocabulary", async ({
  page,
}) => {
  await login(page);
  await page
    .locator(".learning-area-card")
    .filter({ hasText: "基础学习" })
    .click();
  await expect(page).toHaveURL(/\/foundation$/);
  await expect(
    page.getByRole("heading", { name: "选择一个基础学习专区", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /英文课本/ })).toHaveAttribute(
    "href",
    "/learn/textbook",
  );
  await expect(page.getByRole("link", { name: /自然拼读/ })).toHaveAttribute(
    "href",
    "/learn/phonics",
  );
  await expect(page.getByRole("link", { name: /课本单词/ })).toHaveAttribute(
    "href",
    "/learn/kids-cards",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/foundation-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("workplace learning separates interview English and professional vocabulary", async ({
  page,
}) => {
  await login(page);
  await page
    .locator(".learning-area-card")
    .filter({ hasText: "职场专区" })
    .click();
  await expect(page).toHaveURL(/\/workplace$/);
  await expect(
    page.getByRole("heading", { name: "选择一个职场学习专区", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /面试英语/ })).toHaveAttribute(
    "href",
    "/learn/interviews",
  );
  await expect(page.getByRole("link", { name: /专业词汇/ })).toHaveAttribute(
    "href",
    "/learn/vocabulary",
  );
});
test("daily speaking separates daily practice and spoken dialogues", async ({
  page,
}) => {
  await login(page);
  await page
    .locator(".learning-area-card")
    .filter({ hasText: "日常开口" })
    .click();
  await expect(page).toHaveURL(/\/daily-speaking$/);
  await expect(
    page.getByRole("heading", { name: "选择一个日常开口专区", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /每日口语/ })).toHaveAttribute(
    "href",
    "/learn/sentences",
  );
  await expect(
    page.getByRole("link", { name: /日常口语对话专区/ }),
  ).toHaveAttribute("href", "/learn/dialogues");
});
test("private zone keeps its home entry while favorites remain below family learning", async ({ page }) => {
  const textbookTemplate = { code: "textbook", version: 1, renderer: "textbook.v1" };
  const textbookLessons = [
    {
      id: 701,
      title: "这个暑假你做了什么？",
      title_en: "What did you do this summer?",
      sort_order: 101,
      source_resource: "textbook",
      is_locked: false,
      access_state: "available",
      source_content: {
        id: 1,
        unit_name: "Unit 1",
        lesson_name: "Lesson 1",
        title: "What did you do this summer?",
        title_cn: "这个暑假你做了什么？",
        sentences: [
          { id: 1, english_text: "Yangyang: I went swimming.", chinese_text: "阳阳：我去游泳了。" },
        ],
      },
    },
    {
      id: 702,
      title: "我们都度过了一个有意义的暑假",
      title_en: "All of Us Had a Meaningful Summer Holiday",
      sort_order: 102,
      source_resource: "textbook",
      is_locked: false,
      access_state: "available",
      source_content: {
        id: 4,
        unit_name: "Unit 1",
        lesson_name: "Lesson 2",
        title: "All of Us Had a Meaningful Summer Holiday",
        title_cn: "我们都度过了一个有意义的暑假",
        sentences: [
          { id: 4, english_text: "Guoguo: Did you travel this summer holiday?", chinese_text: "果果：这个暑假你去旅行了吗？" },
        ],
      },
    },
  ];
  await page.route("**/api/learning/materials/77**", async (route) => {
    const includeContent = new URL(route.request().url()).searchParams.has("include_lesson_content");
    await route.fulfill({
      json: {
        id: 77,
        title: "小学英语教材",
        topic_id: 1,
        template: textbookTemplate,
        access_state: "available",
        lessons: includeContent
          ? textbookLessons
          : textbookLessons.map(({ source_content, ...lesson }) => lesson),
      },
    });
  });
  await page.route("**/api/learning/private-zone", async (route) => {
    await route.fulfill({
      json: {
        favorite_course_count: 1,
        personal_note_count: 1,
        public_entries: [
          {
            id: 11,
            feature_code: "my-english-notes",
            title: "公共英语笔记",
            target_url: "/learn/notes",
            description: "所有学习者都可以查看原有英语笔记。",
            icon: "notebook",
          },
        ],
        shortcuts: [
          {
            id: 18,
            title: "小学英语教材 · Guoguo 对话",
            target_url: "/learning-materials/77",
            description: "从 Guoguo、Lingling、Maomao 的情景对话开始学习。",
            icon: "📖",
            family_group_name: "学习小家",
          },
          {
            id: 19,
            title: "小学英语单词",
            target_url: "/learn/kids-cards",
            description: "打开原有的小学英语词卡，从 northeast 开始学习。",
            icon: "🔤",
          },
          {
            id: 20,
            title: "数学练习",
            target_url: "/learn/math-cards",
            description: "打开原有的数学知识卡和练习。",
            icon: "➗",
          },
        ],
        recent_personal_notes: [
          { id: 6, title: "周末计划", content: "复习两节英语课。", color: "violet" },
        ],
        items: [
          {
            id: 91,
            resource_type: "material",
            resource_id: 77,
            source: { scope_type: "personal", label: "个人" },
            resource: {
              id: 77,
              resource_type: "material",
              title: "小学英语教材 · Guoguo 对话",
              summary: "从第一课开始学习。",
            },
            access: { access_state: "available" },
          },
        ],
      },
    });
  });
  await page.route("**/api/content/kids-cards**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/kids-cards/1")) {
      await route.fulfill({
        json: {
          id: 1,
          word: "northeast",
          translation: "东北部",
          category: "Unit 1 · 1",
          level: "Core",
          phonics: "/ˌnɔːrθˈiːst/",
          part_of_speech: "noun",
          image_url: "",
          tip: "拆分为 north 和 east。",
          examples: [],
          word_family: [],
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        items: [
          {
            id: 1,
            word: "northeast",
            translation: "东北部",
            category: "Unit 1 · 1",
            level: "Core",
            phonics: "/ˌnɔːrθˈiːst/",
            part_of_speech: "noun",
            image_url: "",
            tip: "拆分为 north 和 east。",
          },
        ],
        page: 1,
        total_pages: 1,
        total: 1,
      },
    });
  });
  await page.route("**/api/content/math-cards**", async (route) => {
    await route.fulfill({
      json: {
        items: [
          {
            id: 1,
            category: "分数计算",
            title: "分数乘法",
            summary: "分子乘分子，分母乘分母。",
            key_points: "先约分，再相乘。",
            common_mistakes: "不要把分母相加。",
            example_question: "计算 2/7 × 3/5。",
            example_answer: "6/35。",
          },
        ],
        page: 1,
        total_pages: 1,
        total: 1,
      },
    });
  });
  await page.route("**/api/learning/private-zone/favorite-courses", async (route) => {
    await route.fulfill({
      json: {
        items: [
          {
            id: 92,
            resource_type: "course",
            resource_id: 88,
            source: { scope_type: "personal", label: "个人" },
            resource: { id: 88, resource_type: "course", title: "自然拼读入门" },
            access: { access_state: "available" },
          },
        ],
      },
    });
  });
  await login(page);
  await expect(
    page.locator(".learning-area-card").filter({ hasText: "私人专区" }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: /私人专区/ }).click();
  await expect(page).toHaveURL(/\/private-zone$/);
  await expect(page.getByRole("heading", { name: "私人专区", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "生活英语", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Rolleston Food Bar Menu/ })).toHaveAttribute(
    "href",
    "/roleston-menu/index.html",
  );
  await expect(page.getByRole("heading", { name: "公共学习入口", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "家庭常用入口", exact: true })).toBeVisible();
  await expect(page.getByText("家庭 · 学习小家", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "+ 添加入口", exact: true })).toHaveCount(0);
  await expect(page.locator(".private-zone-shortcut-actions")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /小学英语单词/ })).toHaveAttribute(
    "href",
    "/learn/kids-cards",
  );
  await expect(page.getByRole("link", { name: /数学练习/ })).toHaveAttribute(
    "href",
    "/learn/math-cards",
  );
  await expect(page.getByRole("link", { name: /小学英语教材 · Guoguo 对话/ })).toHaveAttribute("href", "/learning-materials/77");
  await page.getByRole("link", { name: /小学英语教材 · Guoguo 对话/ }).click();
  await expect(page).toHaveURL(/\/learning-materials\/77$/);
  await expect(page.getByRole("heading", { name: "英语教材课文", exact: true })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Unit 1/ })).toBeVisible();
  await page.getByRole("tab", { name: /Lesson 2/ }).click();
  await expect(page.getByText("Did you travel this summer holiday?", { exact: true })).toBeVisible();
  await page.goto("/learn/kids-cards");
  await expect(page).toHaveURL(/\/learn\/kids-cards$/);
  await expect(page.getByRole("heading", { name: "northeast", exact: true })).toBeVisible();
  await page.goto("/learn/math-cards");
  await expect(page).toHaveURL(/\/learn\/math-cards$/);
  await expect(page.getByRole("heading", { name: "数学知识点卡", exact: true })).toBeVisible();
  await page.goto("/private-zone");
  await page.getByRole("link", { name: /收藏课程/ }).click();
  await expect(page).toHaveURL(/\/private-zone\/favorite-courses$/);
  await expect(
    page.locator(".private-zone-course-link").filter({ hasText: "自然拼读入门" }),
  ).toHaveAttribute("href", "/courses/88");
  await page.getByRole("link", { name: "我的", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "我的收藏", exact: true }),
  ).toBeVisible();
  const favorite = page
    .locator(".my-space-favorite-card")
    .filter({ hasText: "小学英语教材 · Guoguo 对话" });
  await expect(
    favorite.getByRole("link", { name: "打开 小学英语教材 · Guoguo 对话" }),
  ).toHaveAttribute("href", "/learning-materials/77");
  await page.goto("/private-zone");
  await expect(page).toHaveURL(/\/private-zone$/);
  await expect(
    page.getByRole("heading", { name: "私人专区", exact: true }),
  ).toBeVisible();
  await page.goto("/course-modules/6");
  await expect(page).toHaveURL(/\/private-zone$/);
  await page.getByRole("link", { name: /Rolleston Food Bar Menu/ }).click();
  await expect(page).toHaveURL(/\/roleston-menu\/index\.html$/);
  await expect(page).toHaveTitle("Rolleston Food Bar | Menu");
});

test("private zone keeps public entries hidden while personal notes remain available", async ({ page }) => {
  const publicEntries: Record<string, unknown>[] = [
    {
      id: 301,
      title: "小学英语单词",
      target_url: "/learn/kids-cards",
      description: "从 northeast 开始学习。",
      icon: "🔤",
    },
  ];
  const notes: Record<string, unknown>[] = [];
  await page.route("**/api/learning/private-zone", async (route) => {
    await route.fulfill({
      json: {
        items: [],
        favorite_course_count: 0,
        public_entries: publicEntries,
        shortcuts: [],
        personal_note_count: notes.length,
        recent_personal_notes: notes.slice(0, 3),
      },
    });
  });
  await page.route("**/api/learning/private-zone/personal-notes", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { items: notes } });
      return;
    }
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      const note = { id: 401, ...payload, updated_at: "2026-10-10T00:00:00" };
      notes.unshift(note);
      await route.fulfill({ status: 201, json: note });
      return;
    }
    return route.fallback();
  });

  await login(page, "learner_test");
  await page.goto("/private-zone");
  await expect(page.getByRole("heading", { name: "公共学习入口", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "家庭常用入口", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /小学英语单词/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ 添加家庭入口", exact: true })).toHaveCount(0);
  await expect(page.locator(".private-zone-shortcut-actions")).toHaveCount(0);

  await page.getByRole("link", { name: /个人笔记/ }).click();
  await expect(page).toHaveURL(/\/private-zone\/personal-notes$/);
  await page.getByRole("button", { name: "+ 写笔记", exact: true }).click();
  await page.getByLabel("标题").fill("周末学习计划");
  await page.getByLabel("内容").fill("复习两节英语课。 ");
  await page.getByRole("button", { name: "保存笔记", exact: true }).click();
  await expect(page.getByRole("heading", { name: "周末学习计划", exact: true })).toBeVisible();
  await expect(page.getByText("复习两节英语课。", { exact: true })).toBeVisible();
});

test("admin private-zone entry management keeps public entries hidden", async ({ page }) => {
  const shortcuts: Record<string, unknown>[] = [];
  let createdShortcut: Record<string, unknown> | undefined;
  await page.route("**/api/learning/family-groups", async (route) => {
    await route.fulfill({
      json: { items: [{ id: 77, name: "学习小家", member_role: "owner" }] },
    });
  });
  await page.route("**/api/admin/private-zone/shortcuts", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { items: shortcuts } });
      return;
    }
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      createdShortcut = payload;
      const shortcut = { id: 501, family_group_name: "学习小家", ...payload };
      shortcuts.push(shortcut);
      await route.fulfill({ status: 201, json: shortcut });
      return;
    }
    return route.fallback();
  });

  await login(page);
  await page.setViewportSize({ width: 949, height: 583 });
  await page.goto("/admin/private-zone");
  await expect(page.getByRole("heading", { name: "私人专区入口", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "公共学习入口", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "+ 添加公共入口", exact: true })).toHaveCount(0);
  await expect(page.getByText("匹配规则 JSON", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByRole("heading", { name: "家庭常用入口", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "+ 添加家庭入口", exact: true }).click();
  await page.getByLabel("共享家庭", { exact: true }).selectOption("77");
  await page.getByRole("textbox", { name: "名称", exact: true }).fill("小学英语单词");
  await page.getByRole("textbox", { name: "跳转链接", exact: true }).fill("/learn/kids-cards");
  await page.getByRole("button", { name: "保存入口", exact: true }).click();
  await expect(page.getByText("小学英语单词", { exact: true })).toBeVisible();
  await expect(page.locator(".private-zone-admin-shortcut code")).toHaveText("/learn/kids-cards");
  expect(createdShortcut?.family_group_id).toBe(77);
});

test("my learning space keeps family sharing in a consumer flow", async ({ page }) => {
  await login(page, "learner_test");
  await page.getByRole("link", { name: "我的", exact: true }).click();
  await expect(page).toHaveURL(/\/me$/);
  await expect(page.getByRole("heading", { name: /你好，/ })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "家庭共学", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/my-space-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/my-space-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "创建家庭", exact: true }).click();
  await page.getByPlaceholder("例如：我们家").fill("学习小家");
  await page
    .getByRole("button", { name: "创建家庭", exact: true })
    .last()
    .click();
  await expect(page.getByText("学习小家", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "修改名称", exact: true }).click();
  const familyRenameDialog = page.getByRole("dialog");
  await expect(
    familyRenameDialog.getByRole("heading", { name: "修改家庭名称", exact: true }),
  ).toBeVisible();
  await familyRenameDialog.getByRole("textbox").fill("周末英语小家");
  await familyRenameDialog.getByRole("button", { name: "保存名称", exact: true }).click();
  await expect(page.getByText("周末英语小家", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "邀请家人", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "邀请家人加入", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "复制邀请码", exact: true }),
  ).toBeVisible();
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
    const contentToggle = adminNav.getByRole("button", {
      name: "展开内容管理菜单",
      exact: true,
    });
    await expect(contentToggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      adminNav.getByRole("link", { name: "学习笔记", exact: true }),
    ).toHaveCount(0);
    await adminNav.getByText("内容管理", { exact: true }).click();
    await expect(
      adminNav.getByRole("button", {
        name: "收起内容管理菜单",
        exact: true,
      }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(
      adminNav.getByRole("link", { name: "学习笔记", exact: true }),
    ).toBeVisible();
    await adminNav.getByRole("link", { name: "学习笔记", exact: true }).click();
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
  await expect(page).toHaveURL(/\/admin\/content\/notes\?resource=interviews$/);
  await expect(
    page.getByRole("heading", {
      name: "Create Interview Question",
      exact: true,
    }),
  ).toBeVisible();
});
test("interview question entry remains available from the admin menu", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin");
  await page
    .getByRole("navigation", { name: "后台菜单" })
    .getByRole("link", { name: "面试题录入", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/content\/interviews$/);
  await expect(
    page.getByRole("heading", {
      name: "Create Interview Question",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Question", { exact: true })).toBeVisible();
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
test("study note search includes card text", async ({ page }) => {
  await login(page);
  await page.goto("/learn/notes");
  const search = page.getByPlaceholder(
    "Search note titles, phrases, or examples...",
  );
  await search.fill("Good morning");
  const searchResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/content/note-items" &&
      url.searchParams.get("q") === "Good morning" &&
      response.status() === 200
    );
  });
  await search.press("Enter");
  await searchResponse;
  await expect(page).toHaveURL(/keyword=Good\+morning/);
  await expect(page.locator(".note-card")).toHaveCount(0);
  await expect(page.locator(".note-carousel-shell")).toBeVisible();
  await expect(page.locator(".note-carousel-shell .card")).toHaveCount(1);
  await expect(page.locator(".note-carousel-shell .english")).toBeHidden();
  await page.getByRole("button", { name: "Show or hide English" }).click();
  await expect(page.locator(".note-carousel-shell .english")).toBeVisible();
  await expect(page.locator(".note-carousel-shell .english")).toHaveText(
    "Good morning",
  );
});
test("study note cards record a manual encounter frequency", async ({ page }) => {
  await login(page);
  const before = await (
    await page.request.get("/api/content/note-items/1")
  ).json();
  const currentCount = Number(before.frequency_count || 0);
  await page.goto("/learn/notes/1");
  const frequencyButton = page.getByRole("button", { name: /记录遇到一次/ });
  await expect(frequencyButton).toBeVisible();
  const frequencyResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/content/note-items/1/frequency" &&
      response.request().method() === "POST" &&
      response.status() === 200
    );
  });
  await frequencyButton.click();
  await frequencyResponse;
  await expect(page.locator(".note-frequency-count")).toHaveText(
    `已记录 ${currentCount + 1} 次`,
  );
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
      explanation:
        "Use this note as a starting point for your English learning records.",
      examples: "Vocabulary\nPhrases\nExample sentences",
      example_image_url: previewImage,
      example_image_alt: "Preview test image",
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
        .getByText("3 cards", { exact: true }),
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
    await expect(page.locator(".counter-btn")).toHaveText("2 / 3");
    await next.click();
    await expect(page.locator(".counter-btn")).toHaveText("3 / 3");
    await expect(next).toBeDisabled();
    await expect(
      page.getByRole("heading", { name: "Second note", exact: true }),
    ).toBeVisible();
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
    await expect(page.locator(".counter-btn")).toHaveText("2 / 3");
    await previous.click();
    await expect(page.locator(".counter-btn")).toHaveText("1 / 3");
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
