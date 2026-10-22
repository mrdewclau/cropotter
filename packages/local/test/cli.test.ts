import { fileURLToPath } from "node:url";
import { beforeAll, afterAll, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  mkdir,
  symlink,
  truncate,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import { unzipSync } from "fflate";
import { fixture } from "../../engine/test/fixtures.js";
let dir: string, input: string, review: string;
const cli = fileURLToPath(new URL("../dist/cli.mjs", import.meta.url));
function run(...args: string[]) {
  const r = spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
    timeout: 90000,
  });
  return {
    code: r.status,
    result: (() => {
      try {
        return JSON.parse(r.stdout);
      } catch {
        return { raw: r.stdout, stderr: r.stderr };
      }
    })(),
  };
}
beforeAll(async () => {
  dir = await mkdtemp(join(await realpath(tmpdir()), "cropotter-local-"));
  input = join(dir, "private-source.pdf");
  await writeFile(input, await fixture("native"));
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  page.drawRectangle({
    x: 30,
    y: 30,
    width: 200,
    height: 350,
    color: rgb(0, 0, 0),
  });
  review = join(dir, "review.pdf");
  await writeFile(review, await pdf.save());
});
afterAll(async () => rm(dir, { recursive: true, force: true }));
it("CLI analyzes local PDF without returning source path or barcode content", () => {
  const r = run("analyze", "--input", input);
  expect(r.code, JSON.stringify(r.result)).toBe(0);
  expect(r.result.analysis.pages).toHaveLength(1);
  expect(JSON.stringify(r.result)).not.toContain("CROPSHIP123456789");
  expect(JSON.stringify(r.result)).not.toContain(input);
});
it("converts real PDF PNG ZIP and emits geometry and checksums", async () => {
  const out = join(dir, "output");
  const r = run(
    "convert",
    "--input",
    input,
    "--out",
    out,
    "--formats",
    "pdf,png,zip",
    "--name",
    "My labels.pdf",
    "--dpi",
    "203",
  );
  expect(r.code, JSON.stringify(r.result)).toBe(0);
  expect(r.result.status).toBe("ready");
  const pdf = await PDFDocument.load(
    await readFile(join(out, "My labels.pdf")),
  );
  expect(pdf.getPages()[0].getSize()).toEqual({ width: 288, height: 432 });
  const png = await readFile(join(out, "My labels-001-203dpi.png"));
  expect(png.readUInt32BE(16)).toBe(812);
  expect(png.readUInt32BE(20)).toBe(1218);
  const zip = unzipSync(await readFile(join(out, "My labels.zip")));
  expect(Object.keys(zip)).toEqual([
    "My labels.pdf",
    "My labels-001-203dpi.png",
  ]);
  const manifest = JSON.parse(
    await readFile(join(out, "My labels-manifest.json"), "utf8"),
  );
  expect(manifest.geometry.marginInchesMinimum).toBe(0.125);
  expect(
    manifest.artifacts.every((a: { sha256: string }) =>
      /^[a-f0-9]{64}$/.test(a.sha256),
    ),
  ).toBe(true);
  expect(JSON.stringify(manifest)).not.toContain(input);
});
it("withholds uncertain/manual output until explicit acknowledgement", async () => {
  const out = join(dir, "review-out");
  const selections = join(dir, "selections.json");
  await writeFile(
    selections,
    JSON.stringify([
      { pageIndex: 0, region: { x: 20, y: 20, width: 220, height: 370 } },
    ]),
  );
  const r = run(
    "convert",
    "--input",
    review,
    "--out",
    out,
    "--selections",
    selections,
  );
  expect(r.code, JSON.stringify(r.result)).toBe(2);
  expect(r.result.status).toBe("review_required");
  expect(r.result.artifacts).toEqual([]);
  const accepted = run(
    "convert",
    "--input",
    review,
    "--out",
    out,
    "--selections",
    selections,
    "--acknowledge-review",
  );
  expect(accepted.code).toBe(0);
  expect(accepted.result.reviewAcknowledged).toBe(true);
});
it("rejects invalid oversized input and remote URLs with sanitized errors", async () => {
  const bad = join(dir, "secret-not-pdf.pdf");
  await writeFile(bad, "private contents");
  const big = join(dir, "large.pdf");
  await writeFile(big, "%PDF-");
  await truncate(big, 25 * 1024 * 1024 + 1);
  for (const source of [bad, big, "https://secret.example/token"]) {
    const r = run("analyze", "--input", source);
    expect(r.code).toBe(1);
    expect(r.result.error).toBeDefined();
    expect(JSON.stringify(r.result)).not.toContain(source);
    expect(JSON.stringify(r.result)).not.toContain("private contents");
  }
});
it("never overwrites outputs or follows output-directory symlinks", async () => {
  const out = join(dir, "no-clobber");
  await mkdir(out);
  await writeFile(join(out, "label.pdf"), "keep");
  const r = run("convert", "--input", input, "--out", out);
  expect(r.code).toBe(1);
  expect(await readFile(join(out, "label.pdf"), "utf8")).toBe("keep");
  const link = join(dir, "symlink");
  await symlink(out, link);
  expect(
    run("convert", "--input", input, "--out", link, "--name", "other").code,
  ).toBe(1);
});
