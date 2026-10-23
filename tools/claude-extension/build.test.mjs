import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { verifyRuntimeArchive } from "./build.mjs";

test("a changed Node runtime archive is rejected before extraction", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cropotter-runtime-integrity-"));
  try {
    const archive = join(dir, "node.tar.gz");
    await writeFile(archive, "unexpected runtime bytes");
    await assert.rejects(
      verifyRuntimeArchive(archive, "0".repeat(64)),
      /checksum mismatch/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
