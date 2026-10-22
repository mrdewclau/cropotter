import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
export default defineConfig({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  test: {
    exclude: ["**/._*"],
    include: ["packages/local/test/**/*.test.ts"],
    testTimeout: 120000,
    hookTimeout: 120000,
    maxWorkers: 1,
  },
});
