import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api.js";
import { checkAbort, EngineError } from "./errors.js";
import { contains } from "./geometry.js";
import { scanBarcodes } from "./barcodes.js";
import { gray, hasOutsideInk, inkBounds, rasterRegions } from "./pixels.js";
import { PdfBackend } from "./pdf.js";
import type {
  Analysis,
  Candidate,
  OperationOptions,
  PageAnalysis,
  Raster,
  Rect,
  Rotation,
} from "./types.js";

export const ENGINE_VERSION = "0.1.0";
function labelShape(r: Rect) {
  const a = Math.min(r.width, r.height) / Math.max(r.width, r.height);
  return r.width >= 72 && r.height >= 72 && Math.abs(a - 2 / 3) < 0.035;
}
function rounded(r: Rect): Rect {
  return Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k, Math.round(v * 1e6) / 1e6]),
  ) as unknown as Rect;
}
function frame(raster: Raster, r: Rect) {
  let hit = 0,
    total = 0;
  for (let x = r.x; x < r.x + r.width; x++) {
    total += 2;
    for (const y of [r.y, r.y + r.height - 1])
      if (gray(raster.data, (y * raster.width + x) * 4) < 240) hit++;
  }
  for (let y = r.y; y < r.y + r.height; y++) {
    total += 2;
    for (const x of [r.x, r.x + r.width - 1])
      if (gray(raster.data, (y * raster.width + x) * 4) < 240) hit++;
  }
  return total > 0 && hit / total > 0.8;
}
function outsideAll(raster: Raster, regions: Rect[], scale: number) {
  if (regions.length === 1) return hasOutsideInk(raster, regions[0], scale);
  let count = 0;
  for (let y = 0; y < raster.height; y++)
    for (let x = 0; x < raster.width; x++)
      if (
        gray(raster.data, (y * raster.width + x) * 4) < 240 &&
        !regions.some(
          (r) =>
            x >= r.x * scale - 2 &&
            y >= r.y * scale - 2 &&
            x <= (r.x + r.width) * scale + 2 &&
            y <= (r.y + r.height) * scale + 2,
        )
      )
        if (++count > 8) return true;
  return false;
}
export async function analyzeDocument(
  backend: PdfBackend,
  doc: PDFDocumentProxy,
  sourceDigest: string,
  options: OperationOptions = {},
): Promise<Analysis> {
  const pages: PageAnalysis[] = [];
  for (let index = 0; index < doc.numPages; index++) {
    checkAbort(options.signal);
    options.onProgress?.({
      stage: "analyzing",
      completed: index,
      total: doc.numPages,
    });
    const page = await doc.getPage(index + 1),
      viewport = page.getViewport({ scale: 1 });
    if (page.isPureXfa)
      throw new EngineError(
        "UNSUPPORTED_CONTENT",
        "Dynamic XFA documents are unsupported.",
      );
    const annotations = await page.getAnnotations({ intent: "print" });
    const preview = await backend.render(page, 150, options);
    try {
      const pixels = preview.surface.pixels(),
        ink = inkBounds(pixels);
      const p: PageAnalysis = {
        pageIndex: index,
        widthPt: viewport.width,
        heightPt: viewport.height,
        rotation: page.rotate as Rotation,
        status: "blank",
        candidates: [],
        barcodes: [],
        warnings: [],
        hasAnnotations: annotations.length > 0,
      };
      pages.push(p);
      if (!ink) continue;
      p.inkBounds = {
        x: ink.x / preview.scale,
        y: ink.y / preview.scale,
        width: ink.width / preview.scale,
        height: ink.height / preview.scale,
      };
      const barcodeRender = await backend.render(page, 300, options);
      try {
        const found = await scanBarcodes(
          barcodeRender.surface.pixels(),
          backend.runtime.barcodeWasm,
          1 / barcodeRender.scale,
        );
        p.barcodes = found.barcodes;
        if (found.invalidCount) p.warnings.push("UNREADABLE_BARCODE");
      } finally {
        barcodeRender.surface.dispose();
      }
      if (!p.barcodes.length) p.warnings.push("BARCODE_UNVERIFIED");
      if (p.hasAnnotations) p.warnings.push("RASTER_FALLBACK");
      const proposed: { region: Rect; method: Candidate["method"] }[] = [];
      if (
        (Math.abs(p.widthPt - 288) < 0.1 && Math.abs(p.heightPt - 432) < 0.1) ||
        (Math.abs(p.widthPt - 432) < 0.1 && Math.abs(p.heightPt - 288) < 0.1)
      ) {
        proposed.push({
          region: { x: 0, y: 0, width: p.widthPt, height: p.heightPt },
          method: "native-page",
        });
      } else {
        for (const object of await backend.objectRegions(page))
          if (
            labelShape(object.region) &&
            contains(
              { x: 0, y: 0, width: p.widthPt, height: p.heightPt },
              object.region,
            )
          ) {
            proposed.push({
              region: rounded(object.region),
              method:
                object.kind === "image" ? "embedded-image" : "isolated-region",
            });
          }
        if (!proposed.length && labelShape(p.inkBounds) && frame(pixels, ink))
          proposed.push({
            region: rounded(p.inkBounds),
            method: "isolated-region",
          });
        if (!proposed.length)
          for (const region of rasterRegions(pixels, preview.scale))
            proposed.push({ region: rounded(region), method: "raster-region" });
      }
      const unique = proposed.filter(
        (a, i) =>
          !proposed.some(
            (b, j) =>
              j < i &&
              contains(b.region, a.region, 1) &&
              contains(a.region, b.region, 1),
          ),
      );
      const outer = unique.filter(
        (a, i) =>
          !unique.some(
            (b, j) =>
              j !== i &&
              b.region.width * b.region.height >
                a.region.width * a.region.height + 1 &&
              contains(b.region, a.region),
          ),
      );
      if (
        outer.some((a, i) =>
          outer.some(
            (b, j) =>
              i < j &&
              Math.min(
                a.region.x + a.region.width,
                b.region.x + b.region.width,
              ) >
                Math.max(a.region.x, b.region.x) + 0.1 &&
              Math.min(
                a.region.y + a.region.height,
                b.region.y + b.region.height,
              ) >
                Math.max(a.region.y, b.region.y) + 0.1,
          ),
        )
      )
        p.warnings.push("OVERLAPPING_LABELS");
      const outside = outsideAll(
        pixels,
        outer.map((o) => o.region),
        preview.scale,
      );
      for (const [i, item] of outer.entries()) {
        const reasons: string[] = [];
        if (item.method === "raster-region")
          reasons.push("UNCONFIRMED_BOUNDARY");
        if (outside) reasons.push("CONTENT_OUTSIDE_LABEL");
        if (!p.barcodes.some((b) => contains(item.region, b.bounds, 1)))
          reasons.push("BARCODE_UNVERIFIED");
        if (p.warnings.length) reasons.push(...p.warnings);
        p.candidates.push({
          id: `p${index}-c${i}`,
          pageIndex: index,
          region: item.region,
          rotation: item.region.width > item.region.height ? 270 : 0,
          method: item.method,
          confidence: reasons.length ? "review" : "high",
          reasons: [...new Set(reasons)],
        });
      }
      if (
        p.barcodes.some(
          (b) => !p.candidates.some((c) => contains(c.region, b.bounds, 1)),
        )
      )
        p.warnings.push("UNASSIGNED_BARCODE");
      p.status =
        p.candidates.length &&
        p.candidates.every((c) => c.confidence === "high") &&
        !p.warnings.length
          ? "detected"
          : "needs_review";
    } finally {
      preview.surface.dispose();
      page.cleanup();
    }
  }
  options.onProgress?.({
    stage: "analyzing",
    completed: doc.numPages,
    total: doc.numPages,
  });
  return {
    schemaVersion: 1,
    engineVersion: ENGINE_VERSION,
    sourceDigest,
    pages,
    status:
      pages.some((p) => p.status === "needs_review") ||
      pages.every((p) => p.status === "blank")
        ? "needs_review"
        : "ready",
    warnings: [],
  };
}
