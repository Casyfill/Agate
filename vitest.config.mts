import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Snapshots contain time axes and local-time positions; pin the zone so a laptop in New York and a
// UTC CI runner render the same SVG. Workers inherit this environment.
process.env.TZ = "UTC";

export default defineConfig({
  resolve: {
    alias: {
      // `obsidian` ships types only; tests run against a small runtime stand-in.
      obsidian: fileURLToPath(new URL("./test/mocks/obsidian.ts", import.meta.url)),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Files that need a DOM opt in with `// @vitest-environment jsdom`.
    restoreMocks: true,
  },
});
