# Shared label engine

Shared TypeScript PDF preparation for Node and modern browsers.

## Run

Use Node **24 or later**.

```sh
npm ci
npm run build
npm run fixtures
npm run engine -- --input output/demo/letter-image.pdf --out output/label
npm run harness
```

The engine harness opens at `http://127.0.0.1:4173`. Load a PDF or paste a direct PDF URL, inspect its analysis, prepare labels, and download exports. Its JSON crop control is a developer tool. Harness browser URLs need host CORS permission; upload the downloaded file when a URL is blocked. Node can fetch URLs without browser CORS restrictions. The customer website above has its own restricted link-fetch service.

The CLI defaults to PDF, PNG, JPG, and a monochrome bitmap at 203 DPI. Options:

```sh
npm run engine -- --url 'https://example.com/label.pdf' --out output/label --format pdf,png --dpi 300
npm run engine -- --input label.pdf --out output/review --analyze
npm run engine -- --input label.pdf --out output/accepted --selection selections.json
```

Selections use zero-based page indexes and visible-page PDF points measured from the **top left**, after CropBox, UserUnit and page rotation are applied:

```json
[
  {
    "pageIndex": 0,
    "region": { "x": 36, "y": 90, "width": 288, "height": 432 },
    "rotation": 0
  }
]
```

Use multiple entries for multiple labels on a page. Explicitly include or skip every nonblank page, e.g. `{"pageIndex":1,"skip":true}`. Manual selections retain a review warning; downstream clients must obtain deliberate acceptance instead of treating them as automatic print jobs. CLI exits: `0` ready, `2` review required, `1` error. Review results with an explicit crop may still contain downloadable artifacts.

## API

```ts
import { createNodeEngine } from "@crop-ship/engine/node";
// Browser: createBrowserEngine({ assetBaseUrl: '/engine-assets/' })
const engine = await createNodeEngine();
try {
  const result = await engine.prepare(pdfBytes); // or { url: directPdfUrl }
  if (!result.prepared) {
    // Show result.analysis and collect selections before calling prepare again.
  } else {
    for await (const artifact of engine.export(result.prepared, {
      format: "png",
      dpi: 203,
    })) {
      // Save artifact.data; inspect artifact.report before offering automatic printing.
    }
    const bitmap = await engine.thermalBitmap(
      result.prepared,
      result.prepared.labels[0].id,
    );
    // bitmap is pixels and metadata, not MUNBYN print commands.
  }
} finally {
  await engine.dispose();
}
```

Public operations are `analyze`, `prepare`, `export`, `thermalBitmap`, and `dispose`. Processing operations support an `AbortSignal` and emit progress. Work is serialized per engine instance. Export is an async iterator with resources released between artifacts; close abandoned iterators. Disposal aborts pending work, waits for active work to release its resources, and rejects future calls. Source bytes are copied and remain owned by the caller. Release prepared documents and artifact bytes when finished; no account storage is implemented.

The core entry point accepts an `EngineRuntime` for host canvas, decoding, fetch, and asset access. The Node adapter uses `@napi-rs/canvas`; the browser adapter uses Canvas 2D. Serve the assets copied by `npm run assets` locally with the app: PDF worker, CMaps, fonts, PDF rendering WASM, and ZXing reader WASM. No CDN, AI service, or paid API is used. Browser processing needs a secure context (HTTPS or localhost) for hashing and workers.

`PreparedDocument` contains the canonical PDF, versioned manifest, source digest, source-to-output label mapping, every source page decision, and validation report. Reports identify barcode checks by label, DPI and representation. Barcode evidence stores format, SHA-256 payload digest and bounds; it never contains decoded addresses or raw payloads. Do not mutate prepared PDF bytes or its manifest between preparation and export.

## Output and review contract

| Output             | Geometry / encoding                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Canonical PDF      | 288 × 432 points; all page boxes normalized; portrait; 9 point minimum white margin; vector/text preservation where possible        |
| PNG / JPG, 203 DPI | 812 × 1218 pixels; 26 pixel minimum margin; density metadata                                                                        |
| PNG / JPG, 300 DPI | 1200 × 1800 pixels; 38 pixel minimum margin; density metadata                                                                       |
| Thermal bitmap     | Default 203 DPI; 1 bit/pixel, MSB first, 1 = black; `stride = ceil(width / 8)`; row padding bits white; threshold 128; no dithering |

Aspect ratio is preserved. Raster output can be uniformly reduced slightly around the page center to meet the rounded pixel margin. JPG uses quality 98 and is a convenience export; use PDF/PNG or the monochrome path for printer integration. The CLI's `.pbm` is a diagnostic view of the same packed `.bin` bytes. Validated engine output with an intact byte checksum passes through unchanged, avoiding repeated shrinking and PDF nesting. Edited or externally generated PDFs are fitted again; stale metadata is not used to skip formatting. The checksum detects changes and is not a security signature.

Automatic candidates are limited to native 4 × 6 pages, isolated matching image/Form rectangles, and clear framed regions. Raster segmentation supplies review suggestions. Instructions outside labels, overlapping boundaries, visible annotations, unknown boundaries, unreadable/changed/missing barcode evidence, or output margin regressions disable `autoPrintEligible`. Printable annotation appearances use a flagged 300 DPI raster fallback. No silent page loss: blank and intentionally skipped pages appear in the manifest.

Code128, QR, PDF417 and Data Matrix have synthetic preservation tests through PDF rendering and monochrome output. The reader requires an isolated, unrotated symbol for MaxiCode; full-label MaxiCode localization is **not implemented** and a MaxiCode-only label requires review. Barcode evidence is limited to symbols the reader detects; a passing check does not prove an unsupported or undetected symbol is intact. Physical scans from the actual printer remain required.

Defaults: 25 MiB input, 50 source pages, 100 output labels, 16 million pixels per render/embedded image, 30-second URL timeout. Oversized, malformed, encrypted and dynamic XFA PDFs produce typed errors. Signed query strings are preserved during fetching, and engine/CLI errors omit input URLs and sensitive source content. Native shells must bound their own URL access; do not expose the Node adapter as an unrestricted server-side URL proxy.

For v1, executable page/Form content must be uncompressed or Flate-compressed without prediction, with a total decoded-content budget equal to the input byte limit. Inline images, Type3 font programs and tiling patterns are explicitly unsupported. Export a fresh PDF with standard fonts and separate image objects when these errors occur. Malformed dimensions and failed image decoders are rejected before a partial page can become automatic output.

## Verification

```sh
npm run typecheck
npm run build
npm test
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

Tests generate fake recipient data and real barcodes. They cover native and landscape-letter labels, instructions, multiple pages/labels, rotations, nonzero boxes/UserUnit, vector text, annotation fallback, malformed/encrypted/oversized input, cancellation, serialization, repeated conversion, actual image decode, white margins, density metadata, packed bits and barcode occurrence counts. Browser tests execute the same engine in Chromium, Firefox and WebKit and block external network requests during conversion.

See [engine verification](engine-verification.md) for results and remaining hardware acceptance. No customer PDF or signed URL belongs in source control; `.private/` and generated `output/` are ignored.
