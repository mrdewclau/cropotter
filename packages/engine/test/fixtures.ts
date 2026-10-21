import {
  PDFDocument,
  PDFName,
  PDFNumber,
  StandardFonts,
  rgb,
  degrees,
} from "pdf-lib";
import { createCanvas } from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { prepareZXingModule, writeBarcode } from "zxing-wasm/writer";
import type { Rotation } from "../src/types.js";

let writerReady: Promise<unknown> | undefined;
export async function barcodePng(
  format:
    | "Code128"
    | "QRCode"
    | "PDF417"
    | "DataMatrix"
    | "MaxiCode" = "Code128",
  payload = "CROPSHIP123456789",
) {
  writerReady ??= readFile(
    new URL(import.meta.resolve("zxing-wasm/writer/zxing_writer.wasm")),
  ).then((bytes) =>
    prepareZXingModule({
      overrides: { wasmBinary: new Uint8Array(bytes).buffer },
      fireImmediately: true,
    }),
  );
  await writerReady;
  const code = await writeBarcode(payload, {
    format,
    scale: 3,
    addQuietZones: true,
  });
  if (!code.image || code.error)
    throw new Error("Fixture barcode generation failed");
  return new Uint8Array(await code.image.arrayBuffer());
}
export async function labelPdf(
  options: {
    margin?: number;
    format?: "Code128" | "QRCode" | "PDF417" | "DataMatrix" | "MaxiCode";
    rotation?: Rotation;
    annotation?: boolean;
    userUnit?: number;
  } = {},
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([288, 432]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const margin = options.margin ?? 0;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: 288 - 2 * margin,
    height: 432 - 2 * margin,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  page.drawText("SHIP TO", { x: 22, y: 385, size: 16, font });
  page.drawText("TEST RECIPIENT", { x: 22, y: 355, size: 12, font });
  page.drawText("123 Example Lane", { x: 22, y: 333, size: 12, font });
  page.drawText("Sample City 12345", { x: 22, y: 311, size: 12, font });
  const image = await pdf.embedPng(await barcodePng(options.format));
  const wide = ["Code128", "PDF417"].includes(options.format ?? "Code128");
  const barcodeWidth = wide ? 240 : 160;
  page.drawImage(image, {
    x: 24,
    y: 130,
    width: barcodeWidth,
    height: (barcodeWidth * image.height) / image.width,
  });
  page.drawText("TEST SHIPPING LABEL", { x: 30, y: 75, size: 12, font });
  if (options.annotation) {
    const f = pdf.getForm().createTextField("handling");
    f.setText("HANDLE WITH CARE");
    f.addToPage(page, { x: 22, y: 240, width: 225, height: 25 });
    pdf.getForm().updateFieldAppearances(font);
  }
  if (options.rotation) page.setRotation(degrees(options.rotation));
  if (options.userUnit)
    page.node.set(PDFName.of("UserUnit"), PDFNumber.of(options.userUnit));
  return pdf.save();
}
export async function scannedLabelPng(dpi = 300) {
  const { createNodeRuntime } = await import("../src/adapters/node.js");
  const { PdfBackend } = await import("../src/pdf.js");
  const runtime = await createNodeRuntime();
  const backend = new PdfBackend(runtime);
  const doc = await backend.open(await labelPdf());
  try {
    const image = await backend.render(await doc.getPage(1), dpi);
    try {
      return await image.surface.encode("png", 98);
    } finally {
      image.surface.dispose();
    }
  } finally {
    await doc.loadingTask.destroy();
  }
}
export async function fixture(
  layout:
    | "native"
    | "letter-image"
    | "letter-vector"
    | "instructions"
    | "two-labels"
    | "multipage"
    | "blank" = "letter-image",
) {
  if (layout === "native") return labelPdf();
  const pdf = await PDFDocument.create();
  if (layout === "blank") {
    pdf.addPage([612, 792]);
    return pdf.save();
  }
  if (layout === "letter-image" || layout === "two-labels") {
    const page = pdf.addPage([792, 612]);
    const image = await pdf.embedPng(await scannedLabelPng());
    page.drawImage(image, { x: 36, y: 90, width: 288, height: 432 });
    if (layout === "two-labels")
      page.drawImage(image, { x: 432, y: 90, width: 288, height: 432 });
  } else if (layout === "multipage") {
    const src = await PDFDocument.load(await labelPdf());
    for (const page of await pdf.copyPages(src, [0, 0])) pdf.addPage(page);
  } else {
    const page = pdf.addPage([792, 612]);
    const [embedded] = await pdf.embedPdf(await labelPdf());
    page.drawPage(embedded, { x: 36, y: 90, width: 288, height: 432 });
    if (layout === "instructions")
      page.drawText("Packing slip: keep this section", {
        x: 410,
        y: 480,
        size: 16,
      });
  }
  return pdf.save();
}
export function tinyRaster(width: number, height: number) {
  const c = createCanvas(width, height);
  const x = c.getContext("2d");
  x.fillStyle = "white";
  x.fillRect(0, 0, width, height);
  return { canvas: c, context: x };
}
