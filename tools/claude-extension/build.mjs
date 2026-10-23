import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { packExtension } from "@anthropic-ai/mcpb";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export async function verifyRuntimeArchive(path, expected) {
  if (digest(await readFile(path)) !== expected)
    throw new Error(
      "Node archive checksum mismatch; refusing to extract or package it.",
    );
}
const run = (command, args, cwd) =>
  execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 180_000,
  });

async function cleanModules(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (
      entry.isSymbolicLink() ||
      entry.name === ".bin" ||
      entry.name === ".package-lock.json"
    )
      await rm(path, { recursive: true, force: true });
    else if (entry.isDirectory()) await cleanModules(path);
  }
}

export async function buildExtension({ refreshLock = false } = {}) {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Build with Node 24 or newer.");
  const source = join(repo, "extensions/claude-desktop");
  const output = join(repo, "output/claude-release");
  const stage = join(output, "staging");
  const cache = join(output, "runtime-cache");
  const manifest = JSON.parse(
    await readFile(join(source, "manifest.json"), "utf8"),
  );
  const pkg = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  const runtimes = JSON.parse(
    await readFile(join(source, "runtimes.json"), "utf8"),
  );
  const local = JSON.parse(
    await readFile(join(repo, "packages/local/package.json"), "utf8"),
  );
  if (manifest.version !== local.version || pkg.version !== local.version)
    throw new Error("Extension and local package versions must match.");
  await mkdir(output, { recursive: true });
  await mkdir(cache, { recursive: true });
  await rm(stage, { recursive: true, force: true });
  await mkdir(join(stage, "server"), { recursive: true });
  const packed = JSON.parse(
    run(
      "npm",
      [
        "pack",
        "--workspace",
        "packages/local",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        stage,
      ],
      repo,
    ),
  )[0];
  await copyFile(join(source, "package.json"), join(stage, "package.json"));
  if (refreshLock) {
    run(
      "npm",
      [
        "install",
        "--package-lock-only",
        "--ignore-scripts",
        "--force",
        "--omit=dev",
        "--omit=optional",
        "--no-audit",
        "--no-fund",
      ],
      stage,
    );
    await copyFile(
      join(stage, "package-lock.json"),
      join(source, "package-lock.json"),
    );
  } else
    await copyFile(
      join(source, "package-lock.json"),
      join(stage, "package-lock.json"),
    );
  run(
    "npm",
    [
      "ci",
      "--ignore-scripts",
      "--force",
      "--omit=dev",
      "--omit=optional",
      "--no-audit",
      "--no-fund",
    ],
    stage,
  );
  await cleanModules(join(stage, "node_modules"));
  const dependencyLock = await readFile(join(stage, "package-lock.json"));
  await copyFile(
    join(stage, "package-lock.json"),
    join(stage, "dependency-lock.json"),
  );
  await rm(join(stage, packed.filename));

  const runtimeEvidence = [];
  for (const archive of runtimes.archives) {
    const archivePath = join(cache, archive.filename);
    try {
      await readFile(archivePath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const response = await fetch(new URL(archive.filename, runtimes.origin), {
        signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok)
        throw new Error(`Node download failed: ${response.status}`);
      await writeFile(
        archivePath,
        new Uint8Array(await response.arrayBuffer()),
      );
    }
    await verifyRuntimeArchive(archivePath, archive.sha256);
    const unpacked = join(
      cache,
      `node-v${runtimes.version}-${archive.platform}`,
    );
    run("tar", ["-xzf", archivePath, "-C", cache], repo);
    const runtime = join(stage, "runtime", archive.platform);
    await mkdir(runtime, { recursive: true });
    await copyFile(join(unpacked, "bin/node"), join(runtime, "node"));
    await chmod(join(runtime, "node"), 0o755);
    await copyFile(join(unpacked, "LICENSE"), join(runtime, "LICENSE"));
    runtimeEvidence.push({
      platform: archive.platform,
      version: runtimes.version,
      archiveSha256: archive.sha256,
      binarySha256: digest(await readFile(join(runtime, "node"))),
    });
  }
  await copyFile(join(source, "launch.sh"), join(stage, "server/launch.sh"));
  await chmod(join(stage, "server/launch.sh"), 0o755);
  await copyFile(join(source, "README.md"), join(stage, "README.md"));
  await copyFile(join(repo, "LICENSE"), join(stage, "LICENSE"));
  await writeFile(
    join(stage, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const canvas = createCanvas(512, 512);
  canvas
    .getContext("2d")
    .drawImage(
      await loadImage(join(repo, "brand/assets/CropOtter-CO-icon.svg")),
      0,
      0,
      512,
      512,
    );
  await writeFile(join(stage, "icon.png"), canvas.toBuffer("image/png"));
  await writeFile(
    join(stage, "build-provenance.json"),
    `${JSON.stringify({ version: manifest.version, processing: "local", runtimeDownloadsAtBuildOnly: runtimeEvidence, dependencyLockSha256: digest(dependencyLock), bundledLocalPackage: packed.filename, bundledLocalPackageIntegrity: packed.integrity, mcpbTool: "2.1.2" }, null, 2)}\n`,
  );
  const filename = `cropotter-${manifest.version}-macos-universal.mcpb`;
  const path = join(output, filename);
  if (
    !(await packExtension({
      extensionPath: stage,
      outputPath: path,
      silent: true,
    }))
  )
    throw new Error("MCPB validation/pack failed.");
  const bytes = await readFile(path);
  const result = {
    filename,
    path,
    bytes: bytes.length,
    sha256: digest(bytes),
    version: manifest.version,
    platforms: ["darwin-arm64", "darwin-x64"],
    runtimes: runtimeEvidence,
    signed: false,
  };
  await writeFile(
    join(output, "extension-artifact.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  await writeFile(
    join(output, "SHA256SUMS"),
    `${result.sha256}  ${filename}\n`,
  );
  return result;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(
      JSON.stringify(
        await buildExtension({
          refreshLock: process.argv.includes("--refresh-lock"),
        }),
      ),
    );
  } catch (error) {
    console.error(error.message);
    if (error.stderr) console.error(error.stderr.toString());
    process.exitCode = 1;
  }
}
