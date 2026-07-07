import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Separate from vite.config.ts on purpose: Pact consumer tests call the API
// modules directly (no React rendering), spin up a real local HTTP mock
// server, and don't need — or work well under — jsdom. Kept out of
// `npm run test` entirely (see vite.config.ts's `test.exclude`) so the
// existing unit-test suite and its mocked-http-client convention are
// unaffected.
export default defineConfig({
  plugins: [tsConfigPaths()],
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.pact.test.ts"],
    testTimeout: 15000,
    // Every *.pact.test.ts file reads-merges-writes the SAME pacts/*.json —
    // running files in parallel (Vitest's default) races those writes and
    // silently drops interactions. One file at a time, in-process.
    fileParallelism: false,
    pool: "threads",
    singleThread: true,
  },
});
