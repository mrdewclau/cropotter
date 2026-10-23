import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { unzipSync } from "fflate";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const decoder = new TextDecoder("utf-8", { fatal: true });
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const categories = new Set([
  "Business & Operations",
  "Communication",
  "Creativity",
  "Data & Analytics",
  "Developer Tools",
  "Education & Research",
  "Entertainment",
  "Finance",
  "Healthcare",
  "Other",
  "Productivity",
  "Scientific Research",
  "Security",
  "Travel",
]);
const fail = (message) => {
  throw new Error(`Submission package: ${message}`);
};
const requiredText = (value, name, max) => {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    fail(`${name} must be nonblank and at most ${max} characters.`);
};

export function validateSubmissionArchive(bytes) {
  if (bytes.length > 100 * 1024 * 1024) fail("archive exceeds 100 MiB.");
  let expanded = 0;
  const entries = unzipSync(bytes, {
    filter: (entry) => {
      expanded += entry.originalSize;
      if (expanded > 64 * 1024 * 1024) fail("expanded files exceed 64 MiB.");
      return true;
    },
  });
  const names = Object.keys(entries);
  for (const name of names) {
    if (
      name.startsWith("/") ||
      name.includes("\\") ||
      name.includes("\0") ||
      name
        .split("/")
        .some(
          (p) =>
            !p ||
            p === "." ||
            p === ".." ||
            p === ".runtime" ||
            p === "node_modules" ||
            p.startsWith(".env"),
        )
    )
      fail(`unsafe or private archive entry ${name}.`);
  }
  const json = (name) => {
    if (!entries[name]) fail(`missing ${name}.`);
    try {
      return JSON.parse(decoder.decode(entries[name]));
    } catch {
      fail(`invalid JSON in ${name}.`);
    }
  };
  if (entries[".app.json"])
    fail("public uploads cannot contain an app binding.");
  for (const path of ["plugin.json", ".codex-plugin/plugin.json"]) {
    if (!entries[path]) continue;
    const m = json(path);
    if (m.apps != null || m.extensions?.["com.openai"]?.apps != null)
      fail(`app binding in ${path}.`);
  }
  if (entries["mcp.json"] || entries[".mcp.json"])
    fail(
      "CropOtter's submission is skills-only; unexpected MCP configuration.",
    );
  const manifest = json("plugin.json");
  if (
    manifest.$schema !==
      "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json" ||
    manifest.name !== "cropotter" ||
    !/^\d+\.\d+\.\d+$/.test(manifest.version)
  )
    fail("invalid portable identity or version.");
  const openai = manifest.extensions?.["com.openai"];
  const listing = openai?.interface;
  if (!listing) fail("missing OpenAI listing.");
  for (const [field, max] of Object.entries({
    displayName: 30,
    shortDescription: 30,
    longDescription: 4000,
    developerName: 80,
  }))
    requiredText(listing[field], field, max);
  if (!categories.has(listing.category)) fail("unsupported category.");
  if (manifest.author?.name !== listing.developerName)
    fail("author and intended developer identity disagree.");
  const listingURLs = [
    "websiteURL",
    "supportURL",
    "privacyPolicyURL",
    "termsOfServiceURL",
  ].map((field) => {
    requiredText(listing[field], field, 1024);
    let parsed;
    try {
      parsed = new URL(listing[field]);
    } catch {
      fail(`invalid ${field}.`);
    }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password)
      fail(`${field} must be public HTTPS without credentials.`);
    return { field, url: parsed.href };
  });
  const prompts = Array.isArray(listing.defaultPrompt)
    ? listing.defaultPrompt
    : [listing.defaultPrompt];
  if (!prompts.length || prompts.length > 3)
    fail("provide one to three starter prompts.");
  const normalized = prompts.map((p) => {
    requiredText(p, "defaultPrompt", 128);
    if (/[\r\n]/.test(p)) fail("starter prompts must be single line.");
    return p.replace(/\s+/g, " ").trim();
  });
  if (new Set(normalized).size !== normalized.length)
    fail("duplicate starter prompts.");
  const icon = (field, minimum) => {
    const path = listing[field];
    if (typeof path !== "string" || !path.startsWith("./"))
      fail(`${field} needs a contained relative PNG path.`);
    const image = entries[path.slice(2)];
    const png = image && Buffer.from(image);
    if (
      !png ||
      png.length < 33 ||
      png.length > 5 * 1024 * 1024 ||
      !png
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      png.toString("ascii", 12, 16) !== "IHDR"
    )
      fail(`${field} must reference an actual PNG up to 5 MiB.`);
    const width = png.readUInt32BE(16),
      height = png.readUInt32BE(20);
    if (width !== height || width < minimum || width > 4096)
      fail(`${field} PNG must be square and ${minimum}–4096 pixels.`);
    return { path, width, height, bytes: png.length, sha256: hash(png) };
  };
  const icons = {
    logo: icon("logo", 256),
    composerIcon: icon("composerIcon", 48),
  };
  if (typeof openai.review?.commerce !== "boolean")
    fail("missing commerce declaration.");
  if (openai.review.commerce !== false)
    fail("CropOtter is free with no purchases, as confirmed by the publisher.");
  requiredText(
    openai.review.commerce_description,
    "commerce_description",
    4000,
  );
  if (
    !Array.isArray(openai.review.prompts) ||
    !openai.review.prompts.length ||
    openai.review.prompts.length > 20
  )
    fail("missing review prompts.");
  for (const p of openai.review.prompts) requiredText(p, "review prompt", 4000);
  const publication = openai.publication;
  if (
    !Array.isArray(publication?.countries) ||
    publication.countries.length !== 0
  )
    fail("publisher selected all countries OpenAI permits.");
  requiredText(publication.release_notes, "release_notes", 4000);
  const skill = entries["skills/cropotter/SKILL.md"];
  if (
    !skill ||
    skill.length > 1024 * 1024 ||
    !/^---\r?\nname: cropotter\r?\ndescription: .+\r?\n---/.test(
      decoder.decode(skill),
    )
  )
    fail("complete CropOtter skill metadata is required.");
  for (const file of [
    "skills/cropotter/scripts/run.mjs",
    "skills/cropotter/scripts/install.mjs",
    "skills/cropotter/references/page-decisions.md",
    "skills/cropotter/assets/sample-label.pdf",
    "LICENSE",
    "PRIVACY.md",
    "TERMS.md",
  ])
    if (!entries[file]) fail(`missing ${file}.`);
  const engine = json("skills/cropotter/assets/package.json");
  const tarball = entries[`skills/cropotter/assets/${engine.filename}`];
  if (!tarball || hash(tarball) !== engine.sha256)
    fail("engine archive checksum mismatch.");
  return {
    name: manifest.name,
    version: manifest.version,
    publisher: listing.developerName,
    countries: publication.countries,
    commerce: openai.review.commerce,
    icons,
    listingURLs,
    enginePackageVersion: engine.version,
    engineSHA256: engine.sha256,
    files: names.length,
    bytes: bytes.length,
    sha256: hash(bytes),
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const path =
      process.argv[2] ??
      JSON.parse(
        await readFile(
          join(root, "output/openai-release/release.json"),
          "utf8",
        ),
      ).path;
    console.log(
      JSON.stringify(validateSubmissionArchive(await readFile(path)), null, 2),
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
