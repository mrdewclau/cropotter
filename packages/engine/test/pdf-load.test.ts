import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFRef } from "pdf-lib";
import { preflightPdf } from "../src/pdf-preflight.js";
import { DEFAULT_LIMITS } from "../src/errors.js";

async function structuralStream(type: "ObjStm" | "XRef", size = 65536) {
  const source = await PDFDocument.create();
  source.addPage([72, 72]);
  const data =
    type === "ObjStm" ? "900 0 (" + "A".repeat(size) + ")" : "\0".repeat(size);
  source.context.register(
    source.context.flateStream(
      data,
      type === "ObjStm"
        ? { Type: type, N: 1, First: 6 }
        : {
            Type: type,
            Size: 1,
            W: [1, 1, 1],
            Root: source.context.trailerInfo.Root,
          },
    ),
  );
  return source.save({ useObjectStreams: false });
}

describe("bounded PDF structure parsing", () => {
  it.each(["ObjStm", "XRef"] as const)(
    "rejects %s expansion beyond the decoded byte budget",
    async (type) => {
      const bytes = await structuralStream(type);
      expect(bytes.length).toBeLessThan(8192);
      await expect(
        preflightPdf(bytes, { ...DEFAULT_LIMITS, maxBytes: 8192 }),
      ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
    },
  );
  it("refuses structure streams whose type is an unresolved forward reference", async () => {
    const source = await PDFDocument.create();
    source.addPage([72, 72]);
    const stream = source.context.flateStream(
      "900 0 (" + "A".repeat(65536) + ")",
      { N: 1, First: 6 },
    );
    stream.dict.set(PDFName.of("Type"), PDFRef.of(1000));
    source.context.register(stream);
    source.context.assign(PDFRef.of(1000), PDFName.of("ObjStm"));
    await expect(
      preflightPdf(await source.save({ useObjectStreams: false }), {
        ...DEFAULT_LIMITS,
        maxBytes: 8192,
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_CONTENT" });
  });
  it("rejects a declared object count before iterating a truncated stream", async () => {
    const source = await PDFDocument.create();
    source.addPage([72, 72]);
    source.context.register(
      source.context.flateStream("900 0 (small)", {
        Type: "ObjStm",
        N: 100000,
        First: 6,
      }),
    );
    await expect(
      preflightPdf(
        await source.save({ useObjectStreams: false }),
        DEFAULT_LIMITS,
      ),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });
  it("rejects excessive direct object nesting", async () => {
    const source = await PDFDocument.create();
    source.addPage([72, 72]);
    let nested: unknown = 0;
    for (let i = 0; i < 80; i++) nested = [nested];
    source.context.register(source.context.obj(nested as number[]));
    await expect(
      preflightPdf(
        await source.save({ useObjectStreams: false }),
        DEFAULT_LIMITS,
      ),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });
  it("keeps simultaneous decoding budgets separate", async () => {
    const bytes = await structuralStream("ObjStm");
    const results = await Promise.allSettled([
      preflightPdf(bytes, { ...DEFAULT_LIMITS, maxBytes: 8192 }),
      preflightPdf(bytes, { ...DEFAULT_LIMITS, maxBytes: 131072 }),
    ]);
    expect(results[0].status).toBe("rejected");
    expect(results[1].status).toBe("fulfilled");
  });
  it("accepts ordinary compressed object streams", async () => {
    const source = await PDFDocument.create();
    source.addPage([72, 72]);
    source.catalog.set(
      PDFName.of("Synthetic"),
      source.context.obj({ Value: "ok" }),
    );
    await expect(
      preflightPdf(await source.save(), DEFAULT_LIMITS),
    ).resolves.toBeUndefined();
  });
});
