import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

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
