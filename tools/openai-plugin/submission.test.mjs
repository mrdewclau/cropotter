import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { unzipSync, zipSync } from "fflate";
import { buildOpenAIPlugin } from "./build.mjs";
import { validateSubmissionArchive } from "./validate.mjs";

let directory;
let archive;
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "cropotter-submission-"));
  const built = await buildOpenAIPlugin({ outputDir: directory });
  archive = await readFile(built.path);
});
after(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("submission ZIP has complete listing, publication choices and actual PNG branding", () => {
  const checked = validateSubmissionArchive(archive);
  assert.equal(checked.name, "cropotter");
  assert.equal(checked.version, "0.1.1");
  assert.equal(checked.publisher, "James Boyd");
  assert.deepEqual(checked.countries, []);
  assert.equal(checked.commerce, false);
  assert.equal(checked.enginePackageVersion, "0.1.2");
  assert.equal(checked.icons.logo.width, 512);
  assert.equal(checked.icons.logo.height, 512);
  assert.equal(checked.listingURLs.length, 4);
});

test("submission checks reject shadowed app bindings, missing terms, fake PNGs and changed engine bytes", () => {
  const rewrite = (change) => {
    const entries = unzipSync(archive);
    const manifest = JSON.parse(
      new TextDecoder().decode(entries["plugin.json"]),
    );
    change(entries, manifest);
    entries["plugin.json"] = new TextEncoder().encode(JSON.stringify(manifest));
    return zipSync(entries);
  };
  assert.throws(
    () =>
      validateSubmissionArchive(
        rewrite((entries) => {
          entries[".codex-plugin/plugin.json"] = new TextEncoder().encode(
            JSON.stringify({ apps: "./.app.json" }),
          );
        }),
      ),
    /app binding/i,
  );
  assert.throws(
    () =>
      validateSubmissionArchive(
        rewrite((_entries, manifest) => {
          delete manifest.extensions["com.openai"].interface.termsOfServiceURL;
        }),
      ),
    /termsOfServiceURL/,
  );
  assert.throws(
    () =>
      validateSubmissionArchive(
        rewrite((entries, manifest) => {
          entries[
            manifest.extensions["com.openai"].interface.logo.replace(
              /^\.\//,
              "",
            )
          ] = new TextEncoder().encode("not a PNG");
        }),
      ),
    /PNG/,
  );
  assert.throws(
    () =>
      validateSubmissionArchive(
        rewrite((entries) => {
          const metadata = JSON.parse(
            new TextDecoder().decode(
              entries["skills/cropotter/assets/package.json"],
            ),
          );
          entries[`skills/cropotter/assets/${metadata.filename}`][0] ^= 1;
        }),
      ),
    /engine.*checksum/i,
  );
});
