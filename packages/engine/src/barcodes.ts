import { prepareZXingModule, readBarcodes } from "zxing-wasm/reader";
import { digest } from "./pixels.js";
import type { BarcodeCheck, BarcodeEvidence, Raster } from "./types.js";

let moduleReady: Promise<unknown> | undefined;
export async function scanBarcodes(
  raster: Raster,
  wasm: Uint8Array,
  pointScale = 1,
): Promise<{ barcodes: BarcodeEvidence[]; invalidCount: number }> {
  moduleReady ??= prepareZXingModule({
    overrides: { wasmBinary: new Uint8Array(wasm).buffer },
    fireImmediately: true,
  });
  await moduleReady;
  const results = await readBarcodes(
    { ...raster, colorSpace: "srgb" } as ImageData,
    {
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      returnErrors: true,
      maxNumberOfSymbols: 100,
    },
  );
  const barcodes: BarcodeEvidence[] = [];
  let invalidCount = 0;
  for (const result of results) {
    if (!result.isValid) {
      invalidCount++;
      continue;
    }
    const pts = Object.values(result.position),
      xs = pts.map((p) => p.x),
      ys = pts.map((p) => p.y);
    barcodes.push({
      format: result.format,
      digest: await digest(result.bytes),
      bounds: {
        x: Math.min(...xs) * pointScale,
        y: Math.min(...ys) * pointScale,
        width: (Math.max(...xs) - Math.min(...xs)) * pointScale,
        height: (Math.max(...ys) - Math.min(...ys)) * pointScale,
      },
    });
  }
  return { barcodes, invalidCount };
}
export function compareBarcodes(
  source: BarcodeEvidence[],
  output: BarcodeEvidence[],
): BarcodeCheck {
  const expected = source.map((b) => `${b.format}:${b.digest}`).sort(),
    actual = output.map((b) => `${b.format}:${b.digest}`).sort();
  return {
    sourceCount: source.length,
    outputCount: output.length,
    status:
      source.length === 0
        ? "unverified"
        : JSON.stringify(expected) === JSON.stringify(actual)
          ? "verified"
          : "regressed",
    formats: [...new Set(source.map((b) => b.format))],
  };
}
