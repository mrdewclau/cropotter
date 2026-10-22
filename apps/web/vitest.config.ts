import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    exclude: ["**/._*"],
    include: ["apps/web/test/*.test.ts"],
    testTimeout: 15000,
  },
});
