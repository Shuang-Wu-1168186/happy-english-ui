import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "**/*.visual.ts",
  snapshotPathTemplate: "{testDir}/reference/{arg}{ext}",
  use: { ...base.use, viewport: { width: 1280, height: 900 } },
});
