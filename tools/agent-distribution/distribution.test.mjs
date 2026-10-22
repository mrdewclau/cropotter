import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { unzipSync } from "fflate";
import { createDistribution } from "./build.mjs";
import {
  requireNode24,
  readBundle,
} from "../../skills/cropotter/scripts/runtime.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

test("runtime rejects unsupported Node instead of downloading a replacement", () => {
  assert.throws(() => requireNode24("22.23.0"), /Node.js 24/);
  assert.doesNotThrow(() => requireNode24("24.22.1"));
});

test("bundle integrity rejects a changed tarball before installation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "cropotter-integrity-"));
  try {
    await mkdir(join(dir, "assets"));
    await writeFile(
      join(dir, "assets/package.json"),
      JSON.stringify({
        filename: "cropotter-local-0.1.0.tgz",
        version: "0.1.0",
        sha256: "0".repeat(64),
      }),
    );
    await writeFile(join(dir, "assets/cropotter-local-0.1.0.tgz"), "changed");
    await assert.rejects(readBundle(dir), /checksum/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test(
  "distribution bundles installable package, verifies all published bytes and preserves CLI review exit status",
  { timeout: 60_000 },
  async () => {
    const fixture = await mkdtemp(join(tmpdir(), "cropotter-distribution-"));
    try {
      await mkdir(join(fixture, "packages/local/dist"), { recursive: true });
      await writeFile(
        join(fixture, "packages/local/package.json"),
        JSON.stringify({
          name: "cropotter-local",
          version: "0.1.0",
          type: "module",
          bin: { cropotter: "dist/cli.mjs", "cropotter-mcp": "dist/cli.mjs" },
          files: ["dist"],
          engines: { node: ">=24" },
        }),
      );
      await writeFile(
        join(fixture, "packages/local/dist/cli.mjs"),
        '#!/usr/bin/env node\nconsole.log(JSON.stringify(process.argv.slice(2))); process.exitCode = process.argv.includes("--needs-review") ? 2 : 0; if(process.argv.includes("--wait")) { setTimeout(()=>{},30000); process.on("SIGTERM",()=>process.exit(143)); }\n',
      );
      await cp(
        join(root, "skills/cropotter"),
        join(fixture, "skills/cropotter"),
        { recursive: true },
      );
      await mkdir(join(fixture, "docs"), { recursive: true });
      await cp(
        join(root, "docs/agent-tools.md"),
        join(fixture, "docs/agent-tools.md"),
      );
      const out = join(fixture, "published");
      const result = await createDistribution({
        repoRoot: fixture,
        outputDir: out,
      });
      const manifest = JSON.parse(
        await readFile(join(out, "manifest.json"), "utf8"),
      );
      for (const artifact of manifest.artifacts) {
        const bytes = await readFile(join(out, artifact.filename));
        assert.equal(
          createHash("sha256").update(bytes).digest("hex"),
          artifact.sha256,
        );
        assert.equal(bytes.length, artifact.bytes);
      }
      assert.equal(result.version, "0.1.0");
      const zip = unzipSync(
        await readFile(join(out, "cropotter-skill-0.1.0.zip")),
      );
      assert.ok(zip["cropotter/SKILL.md"]);
      assert.ok(zip["cropotter/assets/cropotter-local-0.1.0.tgz"]);
      assert.ok(zip["cropotter/scripts/run.mjs"]);
      const extracted = join(fixture, "isolated");
      for (const [name, bytes] of Object.entries(zip)) {
        const path = join(extracted, name);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, bytes);
      }
      const run = spawnSync(
        process.execPath,
        [
          join(extracted, "cropotter/scripts/run.mjs"),
          "convert",
          "--needs-review",
        ],
        { cwd: tmpdir(), encoding: "utf8" },
      );
      assert.equal(run.status, 2, run.stderr);
      assert.deepEqual(JSON.parse(run.stdout), ["convert", "--needs-review"]);
      assert.ok(!run.stdout.includes("--acknowledge-review"));
      const waiting = spawn(
        process.execPath,
        [join(extracted, "cropotter/scripts/run.mjs"), "--wait"],
        { cwd: tmpdir(), stdio: ["ignore", "pipe", "pipe"] },
      );
      await once(waiting.stdout, "data");
      waiting.kill("SIGTERM");
      const stopped = await once(waiting, "exit");
      assert.deepEqual(stopped, [143, null]);
      const second = join(fixture, "second");
      await createDistribution({ repoRoot: fixture, outputDir: second });
      assert.deepEqual(
        await readFile(join(out, "cropotter-skill-0.1.0.zip")),
        await readFile(join(second, "cropotter-skill-0.1.0.zip")),
      );
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  },
);
