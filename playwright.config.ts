import { defineConfig } from "@playwright/test";

const production = process.env.PETTYROSE_TEST_PRODUCTION === "1";
const basePath = process.env.PETTYROSE_TEST_BASE_PATH || "/";
const baseURL = `http://127.0.0.1:4175${basePath}`;

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  workers: 2,
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
    { name: "mobile-chromium", use: { browserName: "chromium", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
    { name: "mobile-webkit", use: { browserName: "webkit", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  ],
  webServer: { command: `npm run ${production ? "preview" : "dev"} -- --port 4175 --strictPort --base=${basePath}`, url: baseURL, reuseExistingServer: false },
});
