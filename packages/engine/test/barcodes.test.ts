import { describe, expect, it } from "vitest";
import { createNodeEngine, createNodeRuntime } from "../src/adapters/node.js";
import { compareBarcodes, scanBarcodes } from "../src/barcodes.js";
import { barcodePng, labelPdf } from "./fixtures.js";

describe("barcode evidence", () => {
  it.each(["Code128", "QRCode", "PDF417", "DataMatrix"] as const)(
    "preserves %s through the actual PDF and monochrome path",
    async (format) => {
      const engine = await createNodeEngine();
      try {
        const result = await engine.prepare(await labelPdf({ format }));
        expect(result.status).toBe("ready");
        expect(
          result.prepared!.report.barcodes.every(
            (c) => c.status === "verified",
          ),
        ).toBe(true);
        const bitmap = await engine.thermalBitmap(
          result.prepared!,
          result.prepared!.labels[0].id,
        );
        expect(bitmap.report.autoPrintEligible).toBe(true);
      } finally {
        await engine.dispose();
      }
    },
  );
  it("requires review for a MaxiCode embedded in a full label, beyond the reader’s pure-symbol support", async () => {
    const engine = await createNodeEngine();
    try {
      const result = await engine.prepare(
        await labelPdf({ format: "MaxiCode" }),
      );
      expect(result.status).toBe("needs_review");
      expect(result.prepared).toBeUndefined();
      if (result.status === "needs_review")
        expect(result.analysis.pages[0].warnings).toContain(
          "BARCODE_UNVERIFIED",
        );
    } finally {
      await engine.dispose();
    }
  });
  it("detects an occurrence-count change even when payload and format are equal", async () => {
    const runtime = await createNodeRuntime();
    const barcodes = (
      await scanBarcodes(
        await runtime.decodeImage(await barcodePng()),
        runtime.barcodeWasm,
      )
    ).barcodes;
    expect(barcodes).toHaveLength(1);
    expect(compareBarcodes([...barcodes, ...barcodes], barcodes)).toMatchObject(
      { sourceCount: 2, outputCount: 1, status: "regressed" },
    );
    expect(barcodes[0].digest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(barcodes)).not.toContain("CROPSHIP123456789");
  });
});
