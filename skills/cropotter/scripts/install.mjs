#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureRuntime } from "./runtime.mjs";

try {
  const runtime = await ensureRuntime(
    resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  );
  console.log(`CropOtter runtime ready: ${runtime}`);
} catch (error) {
  console.error(`CropOtter: ${error.message}`);
  process.exitCode = 1;
}
