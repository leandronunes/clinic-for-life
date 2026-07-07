import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;

/**
 * E2E suite runs against a production build (build + preview) with the
 * offline mock backend (see @/lib/api/mock) — no Rails API required.
 * VITE_OFFLINE is passed explicitly rather than relying on the default so
 * this doesn't silently depend on a local .env file. Preview (not `vite
 * dev`) on purpose: dev's cold-start dependency pre-bundling was timing out
 * config.webServer on CI runners; a pre-built static server starts in ~1s.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "html",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      VITE_OFFLINE: "true",
    },
  },
});
