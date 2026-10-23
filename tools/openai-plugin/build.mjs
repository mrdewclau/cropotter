import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync, zipSync } from "fflate";
import { createDistribution } from "../agent-distribution/build.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const encoder = new TextEncoder();
export async function buildOpenAIPlugin({
  outputDir = join(root, "output/openai-release"),
} = {}) {
  const temp = await mkdtemp(join(tmpdir(), "cropotter-openai-build-"));
  try {
    const distribution = await createDistribution({ outputDir: temp });
    const manifestBytes = await readFile(
      join(root, "plugins/openai/plugin.json"),
    );
    const manifest = JSON.parse(manifestBytes.toString());
    if (
      manifest.name !== "cropotter" ||
      !/^\d+\.\d+\.\d+$/.test(manifest.version)
    )
      throw new Error("Unexpected OpenAI plugin name/version.");
    const skill = unzipSync(await readFile(join(temp, distribution.skill)));
    const entries = {};
    const stamp = { mtime: new Date("2026-01-01T00:00:00Z") };
    for (const [path, bytes] of Object.entries(skill)) {
      if (
        !path.startsWith("cropotter/") ||
        path.split("/").some((part) => part === ".." || part.startsWith("."))
      )
        throw new Error("Unsafe skill archive entry.");
      entries[`skills/${path}`] = [bytes, stamp];
    }
    const instructions = new TextDecoder().decode(skill["cropotter/SKILL.md"]);
    const frontmatter = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(instructions);
    if (!frontmatter) throw new Error("Skill frontmatter is missing.");
    const note = await readFile(
      join(root, "plugins/openai/host-note.md"),
      "utf8",
    );
    entries["skills/cropotter/SKILL.md"] = [
      encoder.encode(
        instructions.slice(0, frontmatter[0].length) +
          "\n" +
          note.trim() +
          "\n\n" +
          instructions.slice(frontmatter[0].length).trimStart(),
      ),
      stamp,
    ];
    entries["plugin.json"] = [new Uint8Array(manifestBytes), stamp];
    entries["assets/cropotter-icon.png"] = [
      new Uint8Array(
        await readFile(join(root, "plugins/openai/assets/cropotter-icon.png")),
      ),
      stamp,
    ];
    entries["skills/cropotter/assets/sample-label.pdf"] = [
      new Uint8Array(
        await readFile(join(root, "apps/web/public/sample-label.pdf")),
      ),
      stamp,
    ];
    entries["README.md"] = [
      new Uint8Array(await readFile(join(root, "plugins/openai/README.md"))),
      stamp,
    ];
    entries["LICENSE"] = [
      new Uint8Array(await readFile(join(root, "LICENSE"))),
      stamp,
    ];
    for (const [source, destination] of [
      ["docs/openai-plugin/privacy.md", "PRIVACY.md"],
      ["docs/openai-plugin/terms.md", "TERMS.md"],
    ]) {
      entries[destination] = [
        new Uint8Array(await readFile(join(root, source))),
        stamp,
      ];
    }
    const bytes = zipSync(entries, { level: 6 });
    await mkdir(outputDir, { recursive: true });
    const filename = `cropotter-chatgpt-${manifest.version}.zip`;
    const path = join(outputDir, filename);
    await writeFile(path, bytes);
    const result = {
      version: manifest.version,
      enginePackageVersion: distribution.version,
      path,
      bytes: bytes.length,
      sha256: hash(bytes),
    };
    await writeFile(
      join(outputDir, "release.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    await writeFile(
      join(outputDir, "SHA256SUMS"),
      `${result.sha256}  ${filename}\n`,
    );
    return result;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(JSON.stringify(await buildOpenAIPlugin()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
