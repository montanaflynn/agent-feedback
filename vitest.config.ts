import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const source = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    // Mirror the tsconfig paths so tests run against package sources without
    // requiring a prior build.
    alias: [
      { find: "@agent-feedback/core/browser", replacement: source("packages/core/src/browser.ts") },
      { find: "@agent-feedback/core/server", replacement: source("packages/core/src/server.ts") },
      { find: "@agent-feedback/core", replacement: source("packages/core/src/index.ts") },
      { find: "@agent-feedback/react", replacement: source("packages/react/src/index.ts") },
      { find: "@agent-feedback/vite", replacement: source("packages/vite/src/index.ts") },
      { find: "@agent-feedback/next", replacement: source("packages/next/src/client.tsx") }
    ]
  },
  test: {
    coverage: {
      reporter: ["text", "json", "html"]
    },
    environment: "node",
    include: ["packages/**/*.test.ts"],
    restoreMocks: true
  }
});
