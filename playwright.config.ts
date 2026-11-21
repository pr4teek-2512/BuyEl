import { defineConfig, devices } from "@playwright/test";

/**
 * End to end tests.
 *
 *   npm run test:e2e
 *
 * They sign in with the seeded test accounts, so no SMS is ever sent and no
 * credit is spent. They create listings and then delete them, but they do run
 * against whatever DATABASE_URL points at, so point it at a scratch database
 * before running them anywhere near production data.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Signs in to the admin panel once, so the login throttle is not tripped.
    { name: "admin-setup", testMatch: /admin\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["admin-setup"],
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      dependencies: ["admin-setup"],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
