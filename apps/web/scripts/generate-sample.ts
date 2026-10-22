import { fixture } from "../../../packages/engine/test/fixtures.js";
import { writeFile } from "node:fs/promises";
// Synthetic fixture only: no supplied customer label is used in public assets.
await writeFile(
  new URL("../public/sample-label.pdf", import.meta.url),
  await fixture("letter-image"),
);
