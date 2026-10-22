import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  timeout: 120000,
  expect: { timeout: 15000 },
  workers: 1,
  use: { baseURL: "http://127.0.0.1:4175", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    {
      name: "iphone",
      use: { ...devices["iPhone SE"], defaultBrowserType: "webkit" },
    },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "PORT=4175 npm run start:web",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: !process.env.CI,
  },
});
