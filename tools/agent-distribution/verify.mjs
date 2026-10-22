import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
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
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { createDistribution } from "./build.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const temp = await mkdtemp(
  join(await realpath(tmpdir()), "cropotter-skill-smoke-"),
);
try {
  const built = await createDistribution({
    outputDir: join(temp, "distribution"),
  });
  const zip = unzipSync(await readFile(join(built.outputDir, built.skill)));
  for (const [name, bytes] of Object.entries(zip)) {
    const path = join(temp, name);
    assert.ok(path.startsWith(`${temp}/cropotter/`));
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
  }
  const input = join(temp, "synthetic.pdf");
  await copyFile(join(root, "apps/web/public/sample-label.pdf"), input);
  const runner = join(temp, "cropotter/scripts/run.mjs");
  const env = { ...process.env };
  delete env.NODE_PATH;
  const run = (...args) => {
    const result = spawnSync(process.execPath, [runner, ...args], {
      cwd: temp,
      encoding: "utf8",
      env,
      timeout: 120_000,
    });
    assert.equal(result.status, 0, `${result.stderr}\n${result.stdout}`);
    return JSON.parse(result.stdout);
  };
  const analysis = run("analyze", "--input", input);
  assert.equal(analysis.analysis.pages.length, 1);
  const selections = join(temp, "selections.json");
  await writeFile(selections, JSON.stringify([{ pageIndex: 0 }]));
  const withheld = spawnSync(
    process.execPath,
    [
      runner,
      "convert",
      "--input",
      input,
      "--out",
      join(temp, "withheld"),
      "--selections",
      selections,
    ],
    { cwd: temp, encoding: "utf8", env, timeout: 120_000 },
  );
  assert.equal(withheld.status, 2, withheld.stderr);
  assert.equal(JSON.parse(withheld.stdout).status, "review_required");
  assert.deepEqual(JSON.parse(withheld.stdout).artifacts, []);
  const out = join(temp, "results");
  const result = run(
    "convert",
    "--input",
    input,
    "--out",
    out,
    "--formats",
    "pdf,png,zip",
    "--name",
    "Skill labels.pdf",
    "--dpi",
    "203",
  );
  assert.equal(result.status, "ready");
  for (const artifact of result.artifacts) {
    const bytes = await readFile(artifact.path);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      artifact.sha256,
    );
  }
  const pdf = await PDFDocument.load(
    await readFile(join(out, "Skill labels.pdf")),
  );
  assert.deepEqual(pdf.getPages()[0].getSize(), { width: 288, height: 432 });
  const png = await readFile(join(out, "Skill labels-001-203dpi.png"));
  assert.equal(png.readUInt32BE(16), 812);
  assert.equal(png.readUInt32BE(20), 1218);
  const outputZip = unzipSync(await readFile(join(out, "Skill labels.zip")));
  assert.deepEqual(Object.keys(outputZip), [
    "Skill labels.pdf",
    "Skill labels-001-203dpi.png",
  ]);
  const manifest = JSON.parse(
    await readFile(join(out, "Skill labels-manifest.json"), "utf8"),
  );
  assert.equal(manifest.geometry.marginInchesMinimum, 0.125);
  assert.ok(!JSON.stringify(manifest).includes(input));
  console.log(
    JSON.stringify({
      status: "passed",
      version: built.version,
      evidence: [
        "isolated bundled-package installation",
        "synthetic analysis",
        "manual selection withheld without human acknowledgement",
        "real PDF/PNG/ZIP conversion",
        "288x432pt PDF",
        "812x1218px PNG",
        "ZIP filenames",
        "artifact SHA-256",
      ],
      hostClientAttachments: "not tested",
    }),
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
