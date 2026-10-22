import { cp, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const destination = new URL("../public/engine-assets/v0.1.0/", import.meta.url);
const pdf = new URL(
  "../../",
  import.meta.resolve("pdfjs-dist/legacy/build/pdf.mjs"),
);
await mkdir(destination, { recursive: true });
for (const name of ["cmaps", "standard_fonts", "wasm"])
  await cp(new URL(name, pdf), new URL(name, destination), { recursive: true });
await cp(
  new URL("legacy/build/pdf.worker.mjs", pdf),
  new URL("pdf.worker.mjs", destination),
);
await cp(
  fileURLToPath(import.meta.resolve("zxing-wasm/reader/zxing_reader.wasm")),
  new URL("zxing_reader.wasm", destination),
);
console.log("Local PDF and barcode assets ready.");
