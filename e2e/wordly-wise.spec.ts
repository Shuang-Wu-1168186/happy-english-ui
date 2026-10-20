import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Username", { exact: true }).fill("admin_test");
  await page.getByLabel("Password", { exact: true }).fill("Testing123!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page.locator(".home-dashboard")).toBeVisible();
}

const wordlyWiseLesson = {
  id: 3321,
  title: "Unit 1 · Lesson 1",
  title_en: "Vacation Time · Word List",
  access_state: "available",
  render_payload: {
    content_kind: "source",
    content: {
      source: {
        document: "Wordly Wise 3000 Book 1",
        page_kind: "word-list",
      },
      items: [
        {
          item_title: "Lesson 1 · Word List",
          english_text: "Vacation Time",
          chinese_text: "词汇导入",
        },
        {
          item_title: "1 · cylinder",
          english_text: "cylinder",
          chinese_text: "圆柱体；圆筒",
          part_of_speech: "n.",
          example_sentence: "The tube is shaped like a cylinder.",
        },
        {
          item_title: "2 · examine",
          english_text: "examine",
          chinese_text: "仔细查看；检查",
          part_of_speech: "v.",
          example_sentence: "Please examine the map closely.",
        },
      ],
    },
  },
};

test("a Wordly Wise material opened from the catalogue uses the word-card lesson view", async ({
  page,
}) => {
  await login(page);
  let requestedLessonContent = false;
  await page.route("**/api/learning/materials/128**", async (route) => {
    const includeLessonContent = new URL(
      route.request().url(),
    ).searchParams.has("include_lesson_content");
    requestedLessonContent ||= includeLessonContent;
    await route.fulfill({
      json: {
        id: 128,
        material_code: "wordlywise-3000",
        title: "Wordly Wise 1 · 单词教材",
        title_en: "Wordly Wise 3000 Book 1",
        template: { code: "standard", version: 1, renderer: "standard.v1" },
        access_state: "available",
        lessons: includeLessonContent
          ? [wordlyWiseLesson]
          : [
              {
                ...wordlyWiseLesson,
                render_payload: { content_kind: "source", content: null },
              },
            ],
      },
    });
  });

  await page.goto("/learning-materials/128");

  await expect(page.locator(".course-vocabulary--wordly-wise")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "cylinder", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "examine", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("2 个单词", { exact: true })).toBeVisible();
  expect(requestedLessonContent).toBeTruthy();
  await page.screenshot({
    path: "test-results/wordly-wise-material.png",
    fullPage: true,
  });
});
