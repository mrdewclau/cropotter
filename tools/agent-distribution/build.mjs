import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

async function skillEntries(directory, prefix = "cropotter") {
  const files = {};
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    if (
      entry.name.startsWith(".") ||
      entry.name === "node_modules" ||
      entry.name === "assets"
    )
      continue;
    const name = `${prefix}/${entry.name}`;
    if (entry.isDirectory())
      Object.assign(
        files,
        await skillEntries(join(directory, entry.name), name),
      );
    else if (entry.isFile())
      files[name] = [
        new Uint8Array(await readFile(join(directory, entry.name))),
        { mtime: new Date("2026-01-01T00:00:00Z") },
      ];
    else
      throw new Error("Skill distribution refuses symlinks and special files.");
  }
  return files;
}

export async function createDistribution({
  repoRoot = scriptRoot,
  outputDir = join(repoRoot, "apps/web/public/agents"),
} = {}) {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Distribution requires Node.js 24 or newer.");
  const localDir = join(repoRoot, "packages/local");
  const pkg = JSON.parse(
    await readFile(join(localDir, "package.json"), "utf8"),
  );
  if (pkg.name !== "cropotter-local" || !/^\d+\.\d+\.\d+$/.test(pkg.version))
    throw new Error("Unexpected local package name/version.");
  await readFile(join(localDir, "dist/cli.mjs"));
  const temp = await mkdtemp(join(tmpdir(), "cropotter-pack-"));
  try {
    const result = spawnSync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["pack", "--json", "--ignore-scripts", "--pack-destination", temp],
      {
        cwd: localDir,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
        },
      },
    );
    if (result.status !== 0)
      throw new Error(
        `Local npm pack failed: ${result.stderr || result.error?.message || "unknown error"}`,
      );
    const filename = `cropotter-local-${pkg.version}.tgz`;
    const packed = JSON.parse(result.stdout)[0];
    if (packed.filename !== filename)
      throw new Error("Unexpected npm package filename.");
    const tarball = await readFile(join(temp, filename));
    const entries = await skillEntries(join(repoRoot, "skills/cropotter"));
    const stamp = { mtime: new Date("2026-01-01T00:00:00Z") };
    entries[`cropotter/assets/${filename}`] = [new Uint8Array(tarball), stamp];
    entries["cropotter/assets/package.json"] = [
      new TextEncoder().encode(
        `${JSON.stringify({ filename, version: pkg.version, sha256: sha256(tarball) }, null, 2)}\n`,
      ),
      stamp,
    ];
    const guide = await readFile(join(repoRoot, "docs/agent-tools.md"));
    const skillName = `cropotter-skill-${pkg.version}.zip`;
    const artifacts = new Map([
      [filename, tarball],
      [skillName, zipSync(entries, { level: 6 })],
      ["guide.md", guide],
    ]);
    const index = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CropOtter agent tools</title><style>html{font:16px/1.5 system-ui;color:#23262e;background:#f6f1e7}body{margin:0;height:100dvh;display:flex;flex-direction:column}header{padding:1rem 1.5rem;border-bottom:1px solid #cfc9bc}main{overflow:auto;min-height:0;padding:1rem 1.5rem}a{color:#243a79}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ui-monospace,monospace}nav{display:flex;gap:1rem;flex-wrap:wrap}h1{font-size:1.4rem;margin:0 0 .5rem}</style><header><h1>CropOtter agent tools ${escapeHtml(pkg.version)}</h1><nav><a href="/">Open CropOtter</a><a href="./${filename}">Local package</a><a href="./${skillName}">Agent Skill ZIP</a><a href="./manifest.json">Checksums</a><a href="./guide.md">Markdown guide</a></nav></header><main><pre>${escapeHtml(guide.toString())}</pre></main></html>\n`;
    artifacts.set("index.html", Buffer.from(index));
    const manifest = {
      schemaVersion: 1,
      name: "cropotter-agent-tools",
      version: pkg.version,
      node: ">=24",
      processing: "local",
      package: filename,
      skill: skillName,
      guide: "guide.md",
      artifacts: [...artifacts].map(([name, bytes]) => ({
        filename: name,
        bytes: bytes.length,
        sha256: sha256(bytes),
      })),
    };
    await mkdir(outputDir, { recursive: true });
    for (const [name, bytes] of artifacts)
      await writeFile(join(outputDir, name), bytes);
    await writeFile(
      join(outputDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await writeFile(
      join(outputDir, "SHA256SUMS"),
      `${[...artifacts, ["manifest.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)]].map(([name, bytes]) => `${sha256(bytes)}  ${name}`).join("\n")}\n`,
    );
    return {
      version: pkg.version,
      outputDir,
      package: filename,
      skill: skillName,
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(JSON.stringify(await createDistribution()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
