import { PDFDocument, PDFName, PDFNumber, degrees, rgb } from "pdf-lib";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api.js";
import { checkAbort, EngineError } from "./errors.js";
import {
  contains,
  fitToLabel,
  multiply,
  rotationMatrix,
  validateRect,
} from "./geometry.js";
import { PdfBackend } from "./pdf.js";
import { ENGINE_VERSION } from "./detection.js";
import { canonicalBytesIntact, saveCanonical } from "./canonical.js";
import type {
  Analysis,
  LabelManifest,
  Matrix,
  OperationOptions,
  PreparedDocument,
  Rect,
  Rotation,
  Selection,
} from "./types.js";

const PRODUCER = "crop/ship engine ";
const SUBJECT = "crop/ship canonical v1:";
export interface ChosenLabel {
  pageIndex: number;
  region: Rect;
  rotation: Rotation;
  manual: boolean;
}
export function resolveSelections(
  analysis: Analysis,
  selection?: Selection[],
): ChosenLabel[] | undefined {
  const chosen: ChosenLabel[] = [];
  if (selection) {
    if (!Array.isArray(selection))
      throw new EngineError(
        "INVALID_SELECTION",
        "Selections must be an array.",
      );
    for (const item of selection) {
      if (!item || typeof item !== "object")
        throw new EngineError(
          "INVALID_SELECTION",
          "Each selection must identify a page.",
        );
      const p = analysis.pages[item.pageIndex];
      if (!p || !Number.isInteger(item.pageIndex))
        throw new EngineError(
          "INVALID_SELECTION",
          "The selected page does not exist.",
        );
      if (item.skip) {
        if (item.region)
          throw new EngineError(
            "INVALID_SELECTION",
            "A skipped page cannot also have a crop.",
          );
        continue;
      }
      const region = item.region ?? {
        x: 0,
        y: 0,
        width: p.widthPt,
        height: p.heightPt,
      };
      validateRect(region, p.widthPt, p.heightPt);
      const rotation =
        item.rotation ?? (region.width > region.height ? 270 : 0);
      rotationMatrix(rotation, region.width, region.height);
      chosen.push({
        pageIndex: item.pageIndex,
        region,
        rotation,
        manual: true,
      });
    }
    if (
      analysis.pages.some(
        (p) =>
          p.status !== "blank" &&
          !selection.some((s) => s.pageIndex === p.pageIndex),
      )
    )
      return;
    for (const s of selection)
      if (
        s.skip &&
        selection.some(
          (other) => other !== s && other.pageIndex === s.pageIndex,
        )
      )
        throw new EngineError(
          "INVALID_SELECTION",
          "A page cannot be both included and skipped.",
        );
  } else {
    if (analysis.status !== "ready") return;
    for (const page of analysis.pages)
      for (const c of page.candidates)
        chosen.push({
          pageIndex: page.pageIndex,
          region: c.region,
          rotation: c.rotation,
          manual: false,
        });
  }
  return chosen.sort(
    (a, b) =>
      a.pageIndex - b.pageIndex ||
      a.region.y - b.region.y ||
      a.region.x - b.region.x,
  );
}
function readCanonical(info: {
  Producer?: unknown;
  Subject?: unknown;
}): Rect[] {
  if (typeof info.Producer !== "string" || !info.Producer.startsWith(PRODUCER))
    return [];
  const subject = info.Subject;
  if (
    typeof subject !== "string" ||
    !subject.startsWith(SUBJECT) ||
    subject.length > 20_000
  )
    return [];
  try {
    const list = JSON.parse(subject.slice(SUBJECT.length));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export async function compose(
  backend: PdfBackend,
  doc: PDFDocumentProxy,
  bytes: Uint8Array,
  analysis: Analysis,
  chosen: ChosenLabel[],
  options: OperationOptions = {},
): Promise<PreparedDocument> {
  if (chosen.length > backend.limits.maxLabels)
    throw new EngineError(
      "LIMIT_EXCEEDED",
      "The document exceeds the output label limit.",
    );
  const output = await PDFDocument.create();
  const canonical = (await canonicalBytesIntact(bytes))
      ? readCanonical((await doc.getMetadata()).info)
      : [],
    labels: LabelManifest[] = [],
    warnings: string[] = [];
  for (const [outputPageIndex, item] of chosen.entries()) {
    checkAbort(options.signal);
    options.onProgress?.({
      stage: "composing",
      completed: outputPageIndex,
      total: chosen.length,
    });
    const page = await doc.getPage(item.pageIndex + 1),
      info = analysis.pages[item.pageIndex];
    const swapped = item.rotation === 90 || item.rotation === 270;
    const width = swapped ? item.region.height : item.region.width,
      height = swapped ? item.region.width : item.region.height;
    let placement = fitToLabel(width, height);
    const whole =
      contains(
        item.region,
        { x: 0, y: 0, width: info.widthPt, height: info.heightPt },
        0.01,
      ) &&
      contains(
        { x: 0, y: 0, width: info.widthPt, height: info.heightPt },
        item.region,
        0.01,
      );
    const previous = canonical[item.pageIndex];
    const previousValid =
      previous &&
      [previous.x, previous.y, previous.width, previous.height].every(
        Number.isFinite,
      ) &&
      previous.width > 0 &&
      previous.height > 0 &&
      contains({ x: 9, y: 9, width: 270, height: 414 }, previous, 0.01);
    const ink = info.inkBounds;
    const native =
      whole &&
      item.rotation === 0 &&
      Math.abs(width - 288) < 0.01 &&
      Math.abs(height - 432) < 0.01;
    let contentRect: Rect = placement;
    if (native && ink && !info.hasAnnotations) {
      if (previousValid && contains(previous, ink, 0.8)) {
        placement = { x: 0, y: 0, width: 288, height: 432, scale: 1 };
        contentRect = previous;
      }
    }
    const target = output.addPage([288, 432]);
    target.setCropBox(0, 0, 288, 432);
    target.setTrimBox(0, 0, 288, 432);
    target.setBleedBox(0, 0, 288, 432);
    target.setArtBox(0, 0, 288, 432);
    target.setRotation(degrees(0));
    target.node.set(PDFName.of("UserUnit"), PDFNumber.of(1));
    target.drawRectangle({
      x: 0,
      y: 0,
      width: 288,
      height: 432,
      color: rgb(1, 1, 1),
    });
    // A PDF crop only clips drawing: copied page streams and resources still
    // contain off-crop text/images. Rebuild every label from visible pixels in
    // a fresh document, including canonical inputs; never copy source objects.
    if (info.hasAnnotations) warnings.push("RASTER_FALLBACK");
    const original = await backend.render(page, 300, options),
      surface = backend.runtime.createCanvas(1200, 1800);
    try {
      const ctx = surface.context as CanvasRenderingContext2D;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 1200, 1800);
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        (placement.x * 300) / 72,
        (placement.y * 300) / 72,
        (placement.width * 300) / 72,
        (placement.height * 300) / 72,
      );
      ctx.clip();
      let m: Matrix = [1 / original.scale, 0, 0, 1 / original.scale, 0, 0];
      m = multiply([1, 0, 0, 1, -item.region.x, -item.region.y], m);
      m = multiply(
        rotationMatrix(item.rotation, item.region.width, item.region.height),
        m,
      );
      m = multiply(
        [placement.scale, 0, 0, placement.scale, placement.x, placement.y],
        m,
      );
      m = multiply([300 / 72, 0, 0, 300 / 72, 0, 0], m);
      ctx.transform(...m);
      ctx.drawImage(original.surface.canvas as CanvasImageSource, 0, 0);
      ctx.restore();
      const image = await output.embedPng(await surface.encode("png", 98));
      target.drawImage(image, { x: 0, y: 0, width: 288, height: 432 });
    } finally {
      original.surface.dispose();
      surface.dispose();
    }
    const id = `label-${outputPageIndex + 1}`;
    labels.push({
      id,
      outputPageIndex,
      sourcePageIndex: item.pageIndex,
      sourceRegion: item.region,
      rotation: item.rotation,
      contentRectPt: {
        x: contentRect.x,
        y: contentRect.y,
        width: contentRect.width,
        height: contentRect.height,
      },
      renderMode: "raster",
      sourceBarcodes: info.barcodes.filter((b) =>
        contains(item.region, b.bounds, 1),
      ),
      manuallySelected: item.manual,
    });
    if (item.manual) warnings.push("MANUAL_SELECTION");
    for (const warning of info.warnings) warnings.push(warning);
  }
  output.setProducer(PRODUCER + ENGINE_VERSION);
  output.setCreator("crop/ship");
  output.setTitle("crop/ship 4x6 shipping labels");
  output.setSubject(
    SUBJECT + JSON.stringify(labels.map((l) => l.contentRectPt)),
  );
  output.catalog.set(
    PDFName.of("ViewerPreferences"),
    output.context.obj({ PrintScaling: PDFName.of("None") }),
  );
  const prepared: PreparedDocument = {
    schemaVersion: 1,
    engineVersion: ENGINE_VERSION,
    sourceDigest: analysis.sourceDigest,
    pdf: await saveCanonical(output),
    labels,
    pages: analysis.pages.map((p) => ({
      pageIndex: p.pageIndex,
      decision: chosen.some((c) => c.pageIndex === p.pageIndex)
        ? "included"
        : p.status === "blank"
          ? "blank"
          : "skipped",
      labelIds: labels
        .filter((l) => l.sourcePageIndex === p.pageIndex)
        .map((l) => l.id),
    })),
    report: {
      status: "ready",
      autoPrintEligible: false,
      warnings: [...new Set(warnings)],
      barcodes: [],
    },
  };
  return prepared;
}
