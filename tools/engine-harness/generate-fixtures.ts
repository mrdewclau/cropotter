import { mkdir, writeFile } from "node:fs/promises";
import { fixture, labelPdf } from "../../packages/engine/test/fixtures.js";
const folder = new URL("../../output/demo/", import.meta.url);
await mkdir(folder, { recursive: true });
for (const layout of [
  "native",
  "letter-image",
  "letter-vector",
  "instructions",
  "two-labels",
  "multipage",
  "blank",
] as const) {
  await writeFile(new URL(`${layout}.pdf`, folder), await fixture(layout));
}
for (const format of [
  "Code128",
  "QRCode",
  "PDF417",
  "DataMatrix",
  "MaxiCode",
] as const) {
  await writeFile(new URL(`${format}.pdf`, folder), await labelPdf({ format }));
}
console.log("Synthetic PDFs saved in output/demo (fake recipient data only).");
