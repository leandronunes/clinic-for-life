/// <reference types="vitest/config" />
import { defineConfig } from "vite";
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
          fs.copyFileSync(
            path.join(dist, "index.html"),
            path.join(dist, "404.html")
          );
        }
      },
    },
  ],
  build: {
    outDir: "dist",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
