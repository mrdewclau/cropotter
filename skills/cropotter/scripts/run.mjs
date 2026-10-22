#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCropOtter } from "./runtime.mjs";

try {
  process.exitCode = await runCropOtter(
    resolve(dirname(fileURLToPath(import.meta.url)), ".."),
    process.argv.slice(2),
  );
} catch (error) {
  console.error(`CropOtter: ${error.message}`);
  process.exitCode = 1;
}
