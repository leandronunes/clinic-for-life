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
    // --host 127.0.0.1 pins the bind address explicitly: without it, vite
    // preview logged "Local: http://localhost:4321/" and *looked* up on CI,
    // but Playwright's own request to 127.0.0.1 hung forever — the runner
    // resolved "localhost" to ::1 (IPv6) while the server bound the other
    // family, so the IPv4 loopback had nothing listening on it.
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Playwright swallows the command's output by default ("ignore"), which
    // hid the actual reason for a webServer timeout on CI — pipe it so a
    // future failure shows the real build/preview log instead of just
    // "Timed out waiting Nms".
    stdout: "pipe",
    stderr: "pipe",
    env: {
      VITE_OFFLINE: "true",
    },
  },
});
