import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['packages/engine/test/**/*.test.ts'], testTimeout: 60000, hookTimeout: 60000, maxWorkers: 1 } });
