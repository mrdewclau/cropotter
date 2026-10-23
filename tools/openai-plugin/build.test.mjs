import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { unzipSync } from "fflate";
import { PDFDocument } from "pdf-lib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
test(
  "ChatGPT plugin extracts independently and returns real files while withholding unreviewed crops",
  { timeout: 120_000 },
  async () => {
    const temp = await mkdtemp(
      join(await realpath(tmpdir()), "cropotter-openai-"),
    );
    try {
      const { buildOpenAIPlugin } = await import("./build.mjs");
      const result = await buildOpenAIPlugin({
        outputDir: join(temp, "release"),
      });
      const packed = await readFile(result.path);
      assert.equal(
        createHash("sha256").update(packed).digest("hex"),
        result.sha256,
      );
      const entries = unzipSync(packed);
      const manifest = JSON.parse(
        new TextDecoder().decode(entries["plugin.json"]),
      );
      assert.equal(manifest.name, "cropotter");
      assert.equal(manifest.version, "0.1.1");
      assert.ok(
        !entries["mcp.json"] &&
          !entries[".app.json"] &&
          !entries["hooks/hooks.json"],
      );
      assert.ok(
        !Object.keys(entries).some(
          (n) => n.includes(".runtime") || n.includes("node_modules"),
        ),
      );
      const extracted = join(temp, "plugin");
      for (const [name, bytes] of Object.entries(entries)) {
        const target = resolve(extracted, name);
        assert.ok(target.startsWith(extracted + "/"));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, bytes);
      }
      const skill = join(extracted, "skills/cropotter");
      const runner = join(skill, "scripts/run.mjs");
      const input = join(skill, "assets/sample-label.pdf");
      const run = (...args) =>
        spawnSync(process.execPath, [runner, ...args], {
          cwd: temp,
          encoding: "utf8",
          timeout: 90_000,
        });
      const analyzed = run("analyze", "--input", input);
      assert.equal(analyzed.status, 0, analyzed.stderr);
      assert.equal(JSON.parse(analyzed.stdout).analysis.pages.length, 1);
      const selections = join(temp, "selections.json");
      await writeFile(selections, JSON.stringify([{ pageIndex: 0 }]));
      const withheld = run(
        "convert",
        "--input",
        input,
        "--out",
        join(temp, "withheld"),
        "--selections",
        selections,
      );
      assert.equal(withheld.status, 2, withheld.stderr);
      assert.equal(JSON.parse(withheld.stdout).status, "review_required");
      assert.deepEqual(JSON.parse(withheld.stdout).artifacts, []);
      const output = run(
        "convert",
        "--input",
        input,
        "--out",
        join(temp, "output"),
        "--formats",
        "pdf,png,zip",
        "--name",
        "ChatGPT label",
        "--dpi",
        "300",
      );
      assert.equal(output.status, 0, output.stderr);
      const converted = JSON.parse(output.stdout);
      assert.equal(converted.status, "ready");
      for (const a of converted.artifacts)
        assert.equal(
          createHash("sha256")
            .update(await readFile(a.path))
            .digest("hex"),
          a.sha256,
        );
      const pdf = await PDFDocument.load(
        await readFile(join(temp, "output/ChatGPT label.pdf")),
      );
      assert.deepEqual(pdf.getPages()[0].getSize(), {
        width: 288,
        height: 432,
      });
      const png = await readFile(
        join(temp, "output/ChatGPT label-001-300dpi.png"),
      );
      assert.deepEqual(
        [png.readUInt32BE(16), png.readUInt32BE(20)],
        [1200, 1800],
      );
      assert.deepEqual(
        Object.keys(
          unzipSync(await readFile(join(temp, "output/ChatGPT label.zip"))),
        ),
        ["ChatGPT label.pdf", "ChatGPT label-001-300dpi.png"],
      );
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  },
);
