import { defineConfig } from "@playwright/test";

const apiPort = Number(process.env.PLAYWRIGHT_API_PORT || 8011);
const uiPort = Number(process.env.PLAYWRIGHT_UI_PORT || 5174);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: `http://127.0.0.1:${uiPort}`,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        `../happy-english/.venv/bin/uvicorn tests.browser_app:app --app-dir ../happy-english --host 127.0.0.1 --port ${apiPort}`,
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -- --port ${uiPort}`,
      url: `http://127.0.0.1:${uiPort}`,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` },
      reuseExistingServer: false,
    },
  ],
});
