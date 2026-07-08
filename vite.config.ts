import { defineConfig } from "vite";
import { configDefaults, type UserConfig as VitestUserConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
    {
      name: "generate-404",
      writeBundle() {
        const dist = path.resolve(__dirname, "dist");
        if (fs.existsSync(path.join(dist, "index.html"))) {
          fs.copyFileSync(path.join(dist, "index.html"), path.join(dist, "404.html"));
        }
      },
    },
  ] as PluginOption[],
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Vitest's defaults don't skip .claude/ — without this, stray git
    // worktrees created under .claude/worktrees/ get scanned too, duplicating
    // every test that exists in both the main tree and the worktree copy.
    // *.pact.test.ts run separately under vitest.pact.config.ts (node env,
    // real Pact mock server) — see npm run test:pact. e2e/**/*.spec.ts run
    // under Playwright (npm run test:e2e), a real browser, not jsdom/vitest —
    // matches Vitest's default *.spec.ts include glob, so must be excluded.
    exclude: [...configDefaults.exclude, ".claude/**", "**/*.pact.test.ts", "e2e/**"],
  },
});
