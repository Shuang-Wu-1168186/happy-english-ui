import { test, expect } from "@playwright/test";
const screens: Record<string, [string, string]> = {
  home: ["/", ".module-group"],
  sentences: ["/learn/sentences", ".card"],
  "kids-cards": ["/learn/kids-cards", ".example"],
  phonics: ["/learn/phonics", ".lesson-card"],
  textbook: ["/learn/textbook", ".article-sentence"],
  dialogues: ["/learn/dialogues", ".lesson-content"],
  "math-cards": ["/learn/math-cards", ".math-card"],
  notes: ["/learn/notes", ".note-meta"],
  "note-items": ["/learn/notes/1", ".dictation-box"],
  vocabulary: ["/learn/vocabulary", ".card"],
  interviews: ["/learn/interviews", ".interview-card"],
};
for (const [name, [path, ready]] of Object.entries({
  login: ["/login", ".happy-card"],
  ...screens,
})) {
  test(`${name} matches the original Jinja page`, async ({ page }) => {
    // Both reference and React snapshots use the same unbookmarked fixture state.
    await page.route("**/api/progress", async (route) => {
      if (route.request().method() === "GET") await route.fulfill({ json: [] });
      else await route.continue();
    });
    await page.goto("/login");
    if (name !== "login") {
      await page.getByLabel("Username", { exact: true }).fill("admin_test");
      await page.getByLabel("Password", { exact: true }).fill("Testing123!");
      await page.getByRole("button", { name: "Login", exact: true }).click();
      await expect(page.locator(".module-groups")).toBeVisible();
      await page.goto(path);
    }
    await expect(page.locator(ready).first()).toBeVisible();
    if (name === "notes")
      await expect(page.locator(".note-meta")).toHaveText("1 cards");
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.001,
      // The requested admin shortcut is an intentional addition to the original
      // home header. Compare the rest against the unchanged Jinja baseline.
      style: ".home-admin-link { visibility: hidden !important; }",
    });
  });
}
