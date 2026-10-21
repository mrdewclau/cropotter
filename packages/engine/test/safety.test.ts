import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFNumber, PDFRawStream, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import { createNodeEngine, createNodeRuntime } from "../src/adapters/node.js";
import { validatePrepared } from "../src/outputs.js";
import { barcodePng, fixture, labelPdf, scannedLabelPng } from "./fixtures.js";

describe("safety and coordinate regression cases", () => {
  it("rejects Type3 glyph programs that can hide unreadable inline images", async () => {
    const source = await PDFDocument.load(await labelPdf()),
      page = source.getPage(0);
    const glyph = source.context.register(
      source.context.flateStream(
        "1000 0 0 0 1000 1000 d1 q 1000 0 0 1000 0 0 cm BI /W 0 /H 1 /BPC 8 /CS /G ID \x00 EI Q",
      ),
    );
    const font = source.context.register(
      source.context.obj({
        Type: "Font",
        Subtype: "Type3",
        FontBBox: [0, 0, 1000, 1000],
        FontMatrix: [0.001, 0, 0, 0.001, 0, 0],
        CharProcs: { A: glyph },
        Encoding: { Type: "Encoding", Differences: [65, "A"] },
        FirstChar: 65,
        LastChar: 65,
        Widths: [1000],
        Resources: {},
      }),
    );
    page.node.setFontDictionary(PDFName.of("FInline"), font);
    page.node.addContentStream(
      source.context.register(
        source.context.flateStream(
          "BT /FInline 30 Tf 1 0 0 1 30 30 Tm (A) Tj ET",
        ),
      ),
    );
    const engine = await createNodeEngine();
    try {
      expect(
        await engine.prepare(await source.save()).then(
          () => "RESOLVED",
          (error) => error.code,
        ),
      ).toBe("UNSUPPORTED_CONTENT");
    } finally {
      await engine.dispose();
    }
  });
  it("rejects tiling pattern programs rather than losing nested image content", async () => {
    const source = await PDFDocument.load(await labelPdf()),
      page = source.getPage(0);
    const pattern = source.context.register(
      source.context.flateStream("BI /W 0 /H 1 /BPC 8 /CS /G ID \x00 EI", {
        Type: "Pattern",
        PatternType: 1,
        PaintType: 1,
        TilingType: 1,
        BBox: [0, 0, 10, 10],
        XStep: 10,
        YStep: 10,
        Resources: {},
      }),
    );
    page.node
      .Resources()!
      .set(PDFName.of("Pattern"), source.context.obj({ PInline: pattern }));
    page.node.addContentStream(
      source.context.register(
        source.context.flateStream(
          "q /Pattern cs /PInline scn 30 30 50 50 re f Q",
        ),
      ),
    );
    const engine = await createNodeEngine();
    try {
      expect(
        await engine.prepare(await source.save()).then(
          () => "RESOLVED",
          (error) => error.code,
        ),
      ).toBe("UNSUPPORTED_CONTENT");
    } finally {
      await engine.dispose();
    }
  });
  it.each([0, -1, 0.5])(
    "rejects malformed embedded image dimensions (%s) before the renderer can omit them",
    async (dimension) => {
      const source = await PDFDocument.load(await labelPdf());
      const image = await source.embedPng(await barcodePng("QRCode"));
      await image.embed();
      const stream = source.context.lookup(image.ref) as PDFRawStream;
      stream.dict.set(PDFName.of("Width"), PDFNumber.of(dimension));
      source
        .getPage(0)
        .drawImage(image, { x: 40, y: 50, width: 50, height: 50 });
      const engine = await createNodeEngine();
      try {
        expect(
          await engine.prepare(await source.save()).then(
            () => "RESOLVED",
            (error) => error.code,
          ),
        ).toBe("INVALID_PDF");
      } finally {
        await engine.dispose();
      }
    },
  );
  it("rejects corrupt image decoding even when another barcode remains readable", async () => {
    const source = await PDFDocument.load(await labelPdf()),
      image = await source.embedPng(await barcodePng("QRCode"));
    await image.embed();
    (source.context.lookup(image.ref) as PDFRawStream).dict.set(
      PDFName.of("Filter"),
      PDFName.of("DCTDecode"),
    );
    source.getPage(0).drawImage(image, { x: 40, y: 50, width: 50, height: 50 });
    const engine = await createNodeEngine();
    try {
      expect(
        await engine.prepare(await source.save()).then(
          () => "RESOLVED",
          (error) => error.code,
        ),
      ).toBe("UNSUPPORTED_CONTENT");
    } finally {
      await engine.dispose();
    }
  });
  it.each(["0 /H 1", "1", "5000 /H 5000"])(
    "rejects inline images (%s) without silently marking a populated page blank",
    async (header) => {
      const source = await PDFDocument.load(await fixture("multipage"));
      source
        .getPage(1)
        .node.addContentStream(
          source.context.register(
            source.context.flateStream(
              `q 40 0 0 40 30 20 cm BI /W ${header} /BPC 8 /CS /G ID \x00 EI Q`,
            ),
          ),
        );
      const engine = await createNodeEngine();
      try {
        expect(
          await engine.prepare(await source.save()).then(
            () => "RESOLVED",
            (error) => error.code,
          ),
        ).toBe("UNSUPPORTED_CONTENT");
      } finally {
        await engine.dispose();
      }
    },
  );
  it.each(["split-content", "nested-form", "valid-inline"])(
    "rejects inline-image content in %s",
    async (kind) => {
      const source = await PDFDocument.load(await labelPdf()),
        page = source.getPage(0);
      const content =
        "q 40 0 0 40 30 20 cm BI /W 1 /H 1 /BPC 8 /CS /G ID \x00 EI Q";
      if (kind === "split-content") {
        const at = content.indexOf("BI") + 1;
        for (const part of [content.slice(0, at), content.slice(at)])
          page.node.addContentStream(
            source.context.register(source.context.flateStream(part)),
          );
      } else if (kind === "nested-form") {
        const stream = source.context.flateStream(content, {
          Type: "XObject",
          Subtype: "Form",
          BBox: [0, 0, 1, 1],
          Resources: {},
        });
        page.node.setXObject(
          PDFName.of("InlineForm"),
          source.context.register(stream),
        );
        page.node.addContentStream(
          source.context.register(
            source.context.flateStream("q /InlineForm Do Q"),
          ),
        );
      } else
        page.node.addContentStream(
          source.context.register(source.context.flateStream(content)),
        );
      const engine = await createNodeEngine();
      try {
        expect(
          await engine.prepare(await source.save()).then(
            () => "RESOLVED",
            (error) => error.code,
          ),
        ).toBe("UNSUPPORTED_CONTENT");
      } finally {
        await engine.dispose();
      }
    },
  );
  it("allows BI inside PDF strings, hex strings, comments and names", async () => {
    const source = await PDFDocument.load(await labelPdf());
    source
      .getPage(0)
      .node.addContentStream(
        source.context.register(
          source.context.flateStream(
            "% BI /W 0 ID\n/BI MP\n/Span << /ActualText (BI \\( nested \\) string) >> BDC EMC\n/Span << /ActualText <4249> >> BDC EMC\n",
          ),
        ),
      );
    const engine = await createNodeEngine();
    try {
      expect((await engine.prepare(await source.save())).status).toBe("ready");
    } finally {
      await engine.dispose();
    }
  });
  it("normalizes a modified canonical PDF instead of trusting stale content metadata", async () => {
    const engine = await createNodeEngine();
    try {
      const first = (await engine.prepare(await labelPdf())).prepared!;
      const modified = await PDFDocument.load(first.pdf, {
        updateMetadata: false,
      });
      modified.getPage(0).drawRectangle({
        x: 8.99,
        y: 220,
        width: 1,
        height: 20,
        color: rgb(0, 0, 0),
      });
      const bytes = await modified.save(),
        second = (await engine.prepare(bytes)).prepared!;
      expect(
        second.pdf.length === bytes.length &&
          second.pdf.every((v, i) => v === bytes[i]),
      ).toBe(false);
      expect(second.labels[0].contentRectPt).toEqual({
        x: 9,
        y: 13.5,
        width: 270,
        height: 405,
      });
    } finally {
      await engine.dispose();
    }
  });
  it("serializes work on an engine instance to bound peak rendering memory", async () => {
    const engine = await createNodeEngine();
    const source = await labelPdf();
    let active = 0,
      maxActive = 0;
    const options = {
      onProgress: (p: { stage: string; completed: number; total: number }) => {
        if (p.stage === "analyzing") {
          if (p.completed === 0) {
            active++;
            maxActive = Math.max(maxActive, active);
          } else if (p.completed === p.total) active--;
        }
      },
    };
    try {
      await Promise.all([
        engine.analyze(source, options),
        engine.analyze(source, options),
      ]);
      expect(maxActive).toBe(1);
    } finally {
      await engine.dispose();
    }
  });
  it("reports encrypted PDFs explicitly", async () => {
    const engine = await createNodeEngine();
    try {
      await expect(
        engine.analyze(
          new Uint8Array(
            await readFile(
              new URL("./resources/encrypted.pdf", import.meta.url),
            ),
          ),
        ),
      ).rejects.toMatchObject({ code: "ENCRYPTED_PDF" });
    } finally {
      await engine.dispose();
    }
  });
  it("refuses oversized embedded images rather than silently dropping their content", async () => {
    const source = await PDFDocument.load(await labelPdf());
    const image = await source.embedPng(await barcodePng());
    await image.embed();
    const stream = source.context.lookup(image.ref) as PDFRawStream;
    stream.dict.set(PDFName.of("Width"), PDFNumber.of(5000));
    stream.dict.set(PDFName.of("Height"), PDFNumber.of(5000));
    source
      .getPage(0)
      .drawImage(image, { x: 20, y: 30, width: 100, height: 50 });
    const engine = await createNodeEngine();
    try {
      await expect(engine.prepare(await source.save())).rejects.toMatchObject({
        code: "LIMIT_EXCEEDED",
      });
    } finally {
      await engine.dispose();
    }
  });
  it("does not approve two overlapping label boundaries", async () => {
    const source = await PDFDocument.create(),
      page = source.addPage([792, 612]);
    const image = await source.embedPng(await scannedLabelPng());
    page.drawImage(image, { x: 36, y: 90, width: 288, height: 432 });
    page.drawImage(image, { x: 300, y: 90, width: 288, height: 432 });
    const engine = await createNodeEngine();
    try {
      expect((await engine.analyze(await source.save())).pages[0].status).toBe(
        "needs_review",
      );
    } finally {
      await engine.dispose();
    }
  });
  it("preserves text, nonzero page origins and UserUnit scaling", async () => {
    const engine = await createNodeEngine();
    try {
      const source = await PDFDocument.load(await labelPdf());
      const page = source.getPage(0);
      page.setMediaBox(-10, -20, 320, 480);
      page.setCropBox(0, 0, 288, 432);
      page.node.set(PDFName.of("UserUnit"), PDFNumber.of(2));
      const result = await engine.prepare(await source.save(), [
        { pageIndex: 0 },
      ]);
      expect(
        result.prepared?.report.barcodes.every((c) => c.status === "verified"),
      ).toBe(true);
      expect(result.prepared?.labels[0].renderMode).toBe("vector");
      const runtime = await createNodeRuntime();
      const { PdfBackend } = await import("../src/pdf.js");
      const doc = await new PdfBackend(runtime).open(result.prepared!.pdf);
      try {
        const text = await (await doc.getPage(1)).getTextContent();
        expect(
          text.items.map((i) => ("str" in i ? i.str : "")).join(" "),
        ).toContain("TEST RECIPIENT");
      } finally {
        await doc.loadingTask.destroy();
      }
    } finally {
      await engine.dispose();
    }
  });
  it("blocks output after an independently removed barcode", async () => {
    const engine = await createNodeEngine();
    try {
      const result = await engine.prepare(await labelPdf());
      expect(result.prepared).toBeDefined();
      const blank = await PDFDocument.create();
      blank.addPage([288, 432]);
      const altered = { ...result.prepared!, pdf: await blank.save() };
      const report = await validatePrepared(await createNodeRuntime(), altered);
      expect(report).toMatchObject({
        status: "needs_review",
        autoPrintEligible: false,
      });
      expect(report.warnings).toContain("BARCODE_REGRESSION");
    } finally {
      await engine.dispose();
    }
  });
  it("blocks ink in a white margin even when barcodes are still readable", async () => {
    const engine = await createNodeEngine();
    try {
      const result = await engine.prepare(await labelPdf());
      const pdf = await PDFDocument.load(result.prepared!.pdf);
      pdf.getPage(0).drawRectangle({
        x: 0,
        y: 0,
        width: 3,
        height: 432,
        color: rgb(0, 0, 0),
      });
      const report = await validatePrepared(await createNodeRuntime(), {
        ...result.prepared!,
        pdf: await pdf.save(),
      });
      expect(report.autoPrintEligible).toBe(false);
      expect(report.warnings).toContain("MARGIN_REGRESSION");
    } finally {
      await engine.dispose();
    }
  });
  it("rejects invalid crops and requires every nonblank page to be accounted for", async () => {
    const engine = await createNodeEngine();
    const source = await fixture("multipage");
    try {
      await expect(
        engine.prepare(source, [
          { pageIndex: 0, region: { x: -50, y: 0, width: 288, height: 432 } },
        ]),
      ).rejects.toMatchObject({ code: "INVALID_SELECTION" });
      expect(
        (await engine.prepare(source, [{ pageIndex: 0 }])).prepared,
      ).toBeUndefined();
      const result = await engine.prepare(source, [
        { pageIndex: 0 },
        { pageIndex: 1, skip: true },
      ]);
      expect(result.prepared?.pages.map((p) => p.decision)).toEqual([
        "included",
        "skipped",
      ]);
      expect(result.prepared?.report.autoPrintEligible).toBe(false);
    } finally {
      await engine.dispose();
    }
  });
  it("enforces page/render limits and recovers after a failed operation", async () => {
    const engine = await createNodeEngine({
      limits: { maxPages: 1, maxRenderPixels: 100_000 },
    });
    try {
      await expect(
        engine.analyze(await fixture("multipage")),
      ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
      await expect(engine.analyze(await labelPdf())).rejects.toMatchObject({
        code: "LIMIT_EXCEEDED",
      });
      const small = await PDFDocument.create();
      small.addPage([72, 72]);
      expect((await engine.analyze(await small.save())).pages[0].status).toBe(
        "blank",
      );
    } finally {
      await engine.dispose();
    }
  });
  it("supports abort during analysis and refuses operations after disposal", async () => {
    const engine = await createNodeEngine();
    const controller = new AbortController();
    await expect(
      engine.analyze(await fixture("native"), {
        signal: controller.signal,
        onProgress: (p) => {
          if (p.stage === "analyzing") controller.abort();
        },
      }),
    ).rejects.toMatchObject({ code: "ABORTED" });
    await engine.dispose();
    await expect(engine.analyze(await fixture("native"))).rejects.toMatchObject(
      { code: "DISPOSED" },
    );
  });
});
