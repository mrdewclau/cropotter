import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./packages/engine/test/browser",
  timeout: 120_000,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run harness",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
