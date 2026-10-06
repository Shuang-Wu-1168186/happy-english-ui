import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
}

const vocabulary = [
  {
    term: "sounds good",
    meaning: "听起来不错；好啊。",
    explanation:
      "A natural way to say that you agree with a plan or suggestion.",
    examples: [
      { english: "Sounds good. I’ll be there.", chinese: "好啊。我会到。" },
    ],
  },
  {
    term: "give me a second",
    meaning: "等我一下。",
    explanation:
      "A polite way to ask for a short moment while you do something.",
    examples: [
      {
        english: "Give me a second. I’m checking the address.",
        chinese: "等我一下，我在看地址。",
      },
    ],
  },
  {
    term: "I’m on my way",
    meaning: "我在路上。",
    explanation: "A way to say that you have started travelling to the place.",
    examples: [
      {
        english: "I’m on my way. The train is one stop away.",
        chinese: "我在路上，地铁还有一站。",
      },
    ],
  },
  {
    term: "pick it up later",
    meaning: "晚点再继续做。",
    explanation: "To stop doing something now and continue it at another time.",
    examples: [
      { english: "Let’s pick it up later.", chinese: "我们晚点再继续吧。" },
    ],
  },
];

const commuteLesson = {
  id: 2934,
  title: "地铁上也能学 · 3 分钟自然接话",
  summary: "用四个短语完成自然回应。",
  illustration_url: "/static/images/image-loading.svg",
  estimated_minutes: 3,
  template: { code: "commute", version: 1, renderer: "commute.v1" },
  access_state: "available",
  render_payload: {
    content_kind: "structured",
    content: {
      sections: [
        {
          section_code: "core_vocabulary",
          items: vocabulary.map((payload, index) => ({
            id: index + 1,
            item_code: `term-${index + 1}`,
            payload,
          })),
        },
        {
          section_code: "speaking_practice",
          items: [
            {
              id: 9,
              item_code: "quick-reply",
              payload: {
                question: "Choose the reply that fits the situation.",
                question_zh: "同事问你是否同意六点见面。",
                sentence:
                  "Your colleague suggests meeting at six. ______ — I’ll be there.",
                answer: "Sounds good",
                choices: [
                  "Sounds good",
                  "Give me a second",
                  "Pick it up later",
                ],
                explanation:
                  "Use this short reply when you agree with a suggestion.",
              },
            },
          ],
        },
      ],
    },
  },
};

test("commute micro lesson is usable in a narrow mobile viewport", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);

  await page.route("**/api/learning/courses/81/open", async (route) => {
    expect(route.request().method()).toBe("POST");
    await route.fulfill({
      json: {
        id: 81,
        title: "地铁通勤英语 · 第一站",
        topics: [{ id: 32, topic_code: "commute-micro-english" }],
        access_state: "available",
        materials: [],
        lessons: [commuteLesson],
      },
    });
  });

  await page.goto("/courses/81");
  await expect(page.locator(".commute-course-app")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "地铁上也能学 · 3 分钟自然接话",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: "地铁上也能学 · 3 分钟自然接话 的配图" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "开始 3 分钟学习", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "sounds good", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "课表", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "课时目录", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "关闭课时目录", exact: true }).click();

  for (let index = 0; index < vocabulary.length; index += 1) {
    await page
      .getByRole("button", { name: "记住了，下一张", exact: true })
      .click();
  }
  await expect(
    page.getByRole("heading", {
      name: "Choose the reply that fits the situation.",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sounds good", exact: true }).click();
  await expect(
    page.getByText("对，这样接话很自然。", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "完成本节", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "这一站完成了", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "test-results/commute-course-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("generated commute lesson artwork works before the API process reloads", async ({
  page,
}) => {
  await login(page);
  await page.route("**/api/learning/courses/82/open", async (route) => {
    await route.fulfill({
      json: {
        id: 82,
        title: "地铁通勤英语 · 第2站",
        topics: [{ id: 32, topic_code: "commute-micro-english" }],
        access_state: "available",
        materials: [],
        lessons: [
          {
            ...commuteLesson,
            id: 2942,
            lesson_code: "commute-c02-l01-suggest-a-time",
            title: "提出时间",
            illustration_url: "",
          },
        ],
      },
    });
  });

  await page.goto("/courses/82");
  await expect(
    page.getByRole("img", { name: "提出时间 的配图" }),
  ).toHaveAttribute(
    "src",
    /\/static\/commute-covers\/commute-c02-l01-suggest-a-time\.svg$/,
  );
});

test("the learning-material entry also uses the commute lesson screen", async ({
  page,
}) => {
  await login(page);
  let releaseLessonResponse!: () => void;
  const lessonResponseCanFinish = new Promise<void>((resolve) => {
    releaseLessonResponse = resolve;
  });
  let markLessonRequested!: () => void;
  const lessonRequested = new Promise<void>((resolve) => {
    markLessonRequested = resolve;
  });
  await page.route("**/api/learning/materials/115**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.endsWith("/lessons/2934")) {
      markLessonRequested();
      await lessonResponseCanFinish;
      await route.fulfill({ json: commuteLesson });
      return;
    }
    await route.fulfill({
      json: {
        id: 115,
        title: "地铁通勤英语 · 第一站",
        summary: "地铁上也能学的三分钟英语。",
        cover_url: "/static/images/image-loading.svg",
        topics: [{ id: 32, topic_code: "commute-micro-english" }],
        access_state: "available",
        preview_lesson_count: 2,
        template: { code: "commute", version: 1, renderer: "commute.v1" },
        lessons: [commuteLesson],
      },
    });
  });

  await page.goto("/learning-materials/115");
  await lessonRequested;
  await expect(page.locator(".commute-course-app")).toBeVisible();
  await expect(page.locator(".commute-course-loading")).toContainText(
    "正在进入通勤微课…",
  );
  await expect(page.locator(".material-lessons-page")).toHaveCount(0);
  releaseLessonResponse();
  await expect(page.locator(".commute-course-app")).toBeVisible();
  await expect(page.locator(".material-lessons-page")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "地铁上也能学 · 3 分钟自然接话 的配图" }),
  ).toBeVisible();
});

test("the learning-material phonics entry keeps the original phonics layout", async ({
  page,
}) => {
  await login(page);
  let requestedLessonContent = false;
  const phonicsLesson = {
    id: 2935,
    title: "a + 辅音 + e",
    summary: "学习长元音 a 的常见拼读规律。",
    template: { code: "phonics", version: 1, renderer: "phonics.v1" },
    access_state: "available",
    source_content: {
      id: 1,
      title: "a + 辅音 + e",
      subtitle: "第一讲 · 长元音 a",
      pattern_text: "a + 辅音 + e → /eɪ/",
      sound_text: "a 发字母音 /eɪ/；词尾 e 不发音",
      learning_tip: "a 和词尾 e 中间隔一个辅音时，a 通常读 /eɪ/。",
      examples: [{ word: "cake", focus: "a_e", sound: "/keɪk/" }],
      quiz_prompt: "Which word follows the pattern a + 辅音 + e?",
      quiz_choices: ["cake", "cat"],
      quiz_answer: "cake",
    },
  };
  await page.route("**/api/learning/materials/116**", async (route) => {
    const url = new URL(route.request().url());
    const includesContent =
      url.searchParams.get("include_lesson_content") === "true";
    requestedLessonContent ||= includesContent;
    await route.fulfill({
      json: {
        id: 116,
        title: "自然拼读课程",
        summary: "从字母音开始练习拼读规律。",
        access_state: "available",
        preview_lesson_count: 2,
        template: { code: "phonics", version: 1, renderer: "phonics.v1" },
        lessons: [
          includesContent
            ? phonicsLesson
            : {
                ...phonicsLesson,
                source_content: undefined,
              },
        ],
      },
    });
  });

  await page.goto("/learning-materials/116");
  await expect(page.locator(".study-phonics")).toBeVisible();
  await expect(page.locator(".phonics-hero")).toBeVisible();
  await expect(page.locator(".lesson-card")).toBeVisible();
  await expect(page.locator(".material-lessons-page")).toHaveCount(0);
  expect(requestedLessonContent).toBeTruthy();
});
