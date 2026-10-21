import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { loadImage, createCanvas } from "@napi-rs/canvas";
import { fixture, labelPdf } from "./fixtures.js";
import * as nodeAdapter from "../src/adapters/node.js";
import type { PreparedDocument } from "../src/types.js";

let engine: Awaited<ReturnType<typeof nodeAdapter.createNodeEngine>>;
beforeAll(async () => {
  engine = await nodeAdapter.createNodeEngine();
});
afterAll(async () => {
  await engine?.dispose();
});
async function prepare(bytes: Uint8Array): Promise<PreparedDocument> {
  const result = await engine.prepare(bytes);
  expect(
    result.prepared,
    "A clear fixture must produce a prepared document",
  ).toBeDefined();
  return result.prepared!;
}
describe("complete label pipeline", () => {
  it("extracts the embedded label from landscape letter instead of shrinking the whole page", async () => {
    const source = await fixture();
    const analysis = await engine.analyze(source);
    const candidate = analysis.pages[0].candidates.find(
      (c) => c.method === "embedded-image",
    );
    expect(candidate?.region).toEqual({
      x: 36,
      y: 90,
      width: 288,
      height: 432,
    });
    expect(candidate?.confidence).toBe("high");
    const result = await prepare(source);
    const pdf = await PDFDocument.load(result.pdf);
    expect(pdf.getPages().map((p) => p.getSize())).toEqual([
      { width: 288, height: 432 },
    ]);
    expect(result.labels[0].contentRectPt).toMatchObject({
      x: 9,
      y: 13.5,
      width: 270,
      height: 405,
    });
    expect(result.report.autoPrintEligible).toBe(true);
    expect(result.report.barcodes.every((c) => c.status === "verified")).toBe(
      true,
    );
  });
  it("exports reopenable PNG and JPG with exact dimensions, density, and safe white margins", async () => {
    const prepared = await prepare(await fixture("native"));
    for (const dpi of [203, 300] as const)
      for (const format of ["png", "jpg"] as const) {
        const artifacts = [];
        for await (const item of engine.export(prepared, { format, dpi }))
          artifacts.push(item);
        expect(artifacts).toHaveLength(1);
        const image = await loadImage(artifacts[0].data);
        expect([image.width, image.height]).toEqual([dpi * 4, dpi * 6]);
        const canvas = createCanvas(image.width, image.height);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(
          0,
          0,
          image.width,
          image.height,
        ).data;
        const m = Math.ceil(dpi / 8);
        for (let y = 0; y < image.height; y++)
          for (let x = 0; x < image.width; x++)
            if (
              x < m ||
              y < m ||
              x >= image.width - m ||
              y >= image.height - m
            ) {
              const i = (y * image.width + x) * 4;
              if (pixels[i] < 245 || pixels[i + 1] < 245 || pixels[i + 2] < 245)
                throw new Error("Ink entered a safe margin");
            }
        const data = artifacts[0].data;
        if (format === "png")
          expect(new TextDecoder().decode(data)).toContain("pHYs");
        else {
          expect(data[13]).toBe(1);
          expect(data[14] * 256 + data[15]).toBe(dpi);
          expect(data[16] * 256 + data[17]).toBe(dpi);
        }
        expect(
          artifacts[0].report.barcodes.every((c) => c.status === "verified"),
        ).toBe(true);
      }
  });
  it("packs printer rows with explicit polarity and white padding bits", async () => {
    const prepared = await prepare(await fixture("native"));
    const bitmap = await engine.thermalBitmap(prepared, prepared.labels[0].id);
    expect(bitmap).toMatchObject({
      width: 812,
      height: 1218,
      stride: 102,
      bitsPerPixel: 1,
      bitOrder: "msb-first",
      blackIsOne: true,
    });
    expect(bitmap.data).toHaveLength(102 * 1218);
    expect(bitmap.data.some((v) => v !== 0)).toBe(true);
    for (let y = 0; y < 1218; y++)
      expect(bitmap.data[y * 102 + 101] & 15).toBe(0);
    expect(bitmap.report.autoPrintEligible).toBe(true);
  });
  it("does not repeatedly shrink an already prepared PDF", async () => {
    const first = await prepare(await fixture("native"));
    const second = await prepare(first.pdf);
    const { rasterizePrepared } = await import("../src/outputs.js");
    const runtime = await nodeAdapter.createNodeRuntime();
    const one = await rasterizePrepared(runtime, first, 0, 203);
    const two = await rasterizePrepared(runtime, second, 0, 203);
    try {
      expect(one.pixels.data).toEqual(two.pixels.data);
    } finally {
      one.surface.dispose();
      two.surface.dispose();
    }
  });
  it("accounts for all pages and labels in reading order", async () => {
    const multi = await prepare(await fixture("multipage"));
    expect(multi.labels.map((l) => l.sourcePageIndex)).toEqual([0, 1]);
    expect(multi.pages).toHaveLength(2);
    const two = await prepare(await fixture("two-labels"));
    expect(two.labels).toHaveLength(2);
    expect(two.labels[0].sourceRegion.x).toBeLessThan(
      two.labels[1].sourceRegion.x,
    );
  });
  it("returns review decisions for ambiguous instructions and supports an explicit crop", async () => {
    const source = await fixture("instructions");
    const result = await engine.prepare(source);
    expect(result.status).toBe("needs_review");
    const accepted = await engine.prepare(source, [
      { pageIndex: 0, region: { x: 36, y: 90, width: 288, height: 432 } },
    ]);
    expect(accepted.prepared?.labels).toHaveLength(1);
    expect(accepted.prepared?.report.autoPrintEligible).toBe(false);
  });
  it("preserves every quarter-turn without clipping barcodes", async () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const result = await prepare(await labelPdf({ rotation }));
      expect(result.report.barcodes.every((b) => b.status === "verified")).toBe(
        true,
      );
      expect((await PDFDocument.load(result.pdf)).getPage(0).getSize()).toEqual(
        { width: 288, height: 432 },
      );
    }
  });
  it("retains visible form annotations through a flagged raster fallback", async () => {
    const source = await labelPdf({ annotation: true });
    const result = await engine.prepare(source, [{ pageIndex: 0 }]);
    expect(result.prepared?.labels[0].renderMode).toBe("raster");
    expect(result.prepared?.report.warnings).toContain("RASTER_FALLBACK");
    expect(result.prepared?.report.autoPrintEligible).toBe(false);
  });
  it("handles blank pages and malformed PDFs without inventing a label", async () => {
    expect((await engine.analyze(await fixture("blank"))).pages[0].status).toBe(
      "blank",
    );
    expect((await engine.prepare(await fixture("blank"))).status).toBe(
      "needs_review",
    );
    await expect(
      engine.analyze(new TextEncoder().encode("%PDF-1.7\nnot really a pdf")),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });
  });
  it("requires review when a barcode cannot be verified", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage([288, 432]).drawText("No readable barcode", { x: 20, y: 300 });
    const result = await engine.prepare(await pdf.save());
    expect(result.status).toBe("needs_review");
  });
});
