import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against a real deployed environment (SMOKE_BASE_URL) right after a
 * production release — no local build/preview server, unlike
 * playwright.config.ts's e2e suite (which targets the offline mock).
 */
export default defineConfig({
  testDir: "./smoke",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "html",
  use: {
    baseURL: process.env.SMOKE_BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
