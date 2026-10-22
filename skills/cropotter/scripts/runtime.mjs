import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { delimiter, dirname, join, resolve } from "node:path";

export function requireNode24(version = process.versions.node) {
  if (Number(version.split(".")[0]) < 24) {
    throw new Error(
      "CropOtter requires Node.js 24 or newer and npm. Install a supported Node.js runtime, then retry; no runtime is downloaded automatically.",
    );
  }
}

export async function readBundle(skillDir) {
  let metadata;
  try {
    metadata = JSON.parse(
      await readFile(join(skillDir, "assets/package.json"), "utf8"),
    );
  } catch {
    throw new Error(
      "Bundled package missing. Use the complete CropOtter skill ZIP from https://cropotter.com/agents/ rather than copying SKILL.md alone.",
    );
  }
  if (
    !/^cropotter-local-\d+\.\d+\.\d+\.tgz$/.test(metadata.filename) ||
    !/^[a-f0-9]{64}$/.test(metadata.sha256)
  ) {
    throw new Error(
      "Invalid bundled package metadata. Download a fresh official skill ZIP.",
    );
  }
  const tarball = join(skillDir, "assets", metadata.filename);
  const bytes = await readFile(tarball);
  if (createHash("sha256").update(bytes).digest("hex") !== metadata.sha256) {
    throw new Error(
      "Bundled package checksum mismatch. Download a fresh official skill ZIP before installing.",
    );
  }
  return { ...metadata, tarball };
}

function execute(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, options);
    const stop = (signal) => child.kill(signal);
    const interrupt = () => stop("SIGINT");
    const terminate = () => stop("SIGTERM");
    const cleanup = () => {
      process.removeListener("SIGINT", interrupt);
      process.removeListener("SIGTERM", terminate);
    };
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", terminate);
    child.once("error", (error) => {
      cleanup();
      reject(error);
    });
    child.once("exit", (code, signal) => {
      cleanup();
      resolvePromise({ code, signal });
    });
  });
}

export async function ensureRuntime(skillDir) {
  requireNode24();
  const bundle = await readBundle(skillDir);
  const target = join(skillDir, ".runtime");
  let existing;
  try {
    existing = await lstat(target);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (existing) {
    if (!existing.isDirectory() || existing.isSymbolicLink())
      throw new Error(
        "Refusing an unsafe .runtime path; choose a clean skill directory.",
      );
    let marker;
    try {
      marker = JSON.parse(
        await readFile(join(target, "cropotter-bundle.json"), "utf8"),
      );
    } catch {
      /* Report one actionable cache error below. */
    }
    if (marker?.sha256 !== bundle.sha256)
      throw new Error(
        "The skill .runtime belongs to another or incomplete bundle. Remove only this skill's disposable .runtime folder and retry.",
      );
    return target;
  }
  const lock = join(skillDir, ".runtime-install.lock");
  try {
    await mkdir(lock);
  } catch (error) {
    if (error.code === "EEXIST")
      throw new Error(
        "Another CropOtter skill installation is in progress. Retry when it finishes; after an interrupted install, remove this skill's .runtime-install.lock directory.",
      );
    throw error;
  }
  let stage;
  try {
    stage = await mkdtemp(join(skillDir, ".runtime-install-"));
    await writeFile(
      join(stage, "package.json"),
      JSON.stringify({
        private: true,
        name: "cropotter-skill-runtime",
        version: "0.0.0",
      }),
    );
    console.error(
      "Installing the bundled CropOtter package and public npm dependencies locally. Customer files are not sent to npm.",
    );
    let result;
    try {
      result = await execute(
        process.platform === "win32" ? "npm.cmd" : "npm",
        [
          "install",
          "--prefix",
          stage,
          "--omit=dev",
          "--ignore-scripts",
          "--no-audit",
          "--no-fund",
          "--package-lock=false",
          bundle.tarball,
        ],
        {
          stdio: ["ignore", "ignore", "inherit"],
          env: {
            ...process.env,
            PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ""}`,
          },
        },
      );
    } catch {
      throw new Error(
        "Cannot run npm. Install Node.js 24+ with npm, ensure npm is on PATH, and retry.",
      );
    }
    if (result.code !== 0)
      throw new Error(
        "Local npm installation failed. Check public npm access and support for the native canvas dependency on this OS/architecture. No remote conversion fallback is used.",
      );
    await writeFile(
      join(stage, "cropotter-bundle.json"),
      JSON.stringify({ version: bundle.version, sha256: bundle.sha256 }),
    );
    await rename(stage, target);
    stage = undefined;
    return target;
  } finally {
    if (stage) await rm(stage, { recursive: true, force: true });
    await rm(lock, { recursive: true, force: true });
  }
}

export async function runCropOtter(skillDir, args) {
  const runtime = await ensureRuntime(skillDir);
  const packageRoot = join(runtime, "node_modules/cropotter-local");
  const pkg = JSON.parse(
    await readFile(join(packageRoot, "package.json"), "utf8"),
  );
  const relative = pkg.bin?.cropotter;
  if (
    typeof relative !== "string" ||
    resolve(packageRoot, relative) !== join(packageRoot, "dist/cli.mjs")
  )
    throw new Error("Installed CropOtter CLI entrypoint is invalid.");
  const result = await execute(
    process.execPath,
    [join(packageRoot, relative), ...args],
    { stdio: "inherit" },
  );
  if (result.signal) return result.signal === "SIGTERM" ? 143 : 130;
  return result.code ?? 1;
}
