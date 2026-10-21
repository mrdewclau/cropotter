import { it, expect } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "./fixtures.js";

const exec = promisify(execFile);
it("CLI writes reopenable artifacts and a manifest without embedding PDF bytes or input paths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "crop-ship-"));
  try {
    const input = join(dir, "private-source-name.pdf"),
      out = join(dir, "out");
    await writeFile(input, await fixture());
    const { stdout } = await exec(
      process.execPath,
      [
        "--import",
        "tsx",
        "tools/engine-harness/cli.ts",
        "--input",
        input,
        "--out",
        out,
      ],
      { timeout: 60_000 },
    );
    expect(stdout).toContain("Ready: 1 label(s)");
    const raw = await readFile(join(out, "manifest.json"), "utf8"),
      manifest = JSON.parse(raw);
    expect(manifest.report.autoPrintEligible).toBe(true);
    expect(manifest.pdf).toBeUndefined();
    expect(raw).not.toContain(input);
    expect(manifest.artifacts).toHaveLength(4);
    const bitmap = new Uint8Array(
      await readFile(join(out, "label-1-203dpi.bin")),
    );
    expect(bitmap).toHaveLength(102 * 1218);
    const pdf = await readFile(join(out, "crop-ship-labels.pdf"));
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const review = await exec(process.execPath, [
      "--import",
      "tsx",
      "tools/engine-harness/cli.ts",
      "--input",
      input,
      "--out",
      out,
      "--analyze",
    ]);
    expect(review.stdout).toContain("Analysis: ready");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
