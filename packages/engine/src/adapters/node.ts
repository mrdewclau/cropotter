import {
  createCanvas,
  DOMMatrix,
  ImageData,
  Path2D,
  loadImage,
} from "@napi-rs/canvas";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createEngine } from "../engine.js";
import type { EngineOptions, EngineRuntime, Raster } from "../types.js";

export async function createNodeRuntime(): Promise<EngineRuntime> {
  for (const [name, value] of Object.entries({ DOMMatrix, ImageData, Path2D }))
    if (!(name in globalThis))
      Object.defineProperty(globalThis, name, {
        value,
        configurable: true,
        writable: true,
      });
  const base = new URL(
    "../../",
    import.meta.resolve("pdfjs-dist/legacy/build/pdf.mjs"),
  );
  return {
    pdfAssets: {
      workerSrc: import.meta.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs"),
      cMapUrl: fileURLToPath(new URL("cmaps/", base)),
      standardFontDataUrl: fileURLToPath(new URL("standard_fonts/", base)),
      wasmUrl: fileURLToPath(new URL("wasm/", base)),
    },
    barcodeWasm: new Uint8Array(
      await readFile(
        new URL(import.meta.resolve("zxing-wasm/reader/zxing_reader.wasm")),
      ),
    ),
    createCanvas(width, height) {
      const canvas = createCanvas(width, height),
        context = canvas.getContext("2d");
      return {
        canvas,
        context,
        pixels: () => ({
          width: canvas.width,
          height: canvas.height,
          data: context.getImageData(0, 0, canvas.width, canvas.height).data,
        }),
        putPixels: (raster) =>
          context.putImageData(
            new ImageData(raster.data, raster.width, raster.height),
            0,
            0,
          ),
        encode: async (format, quality) =>
          new Uint8Array(
            await (format === "png"
              ? canvas.encode("png")
              : canvas.encode("jpeg", quality)),
          ),
        dispose: () => {
          canvas.width = 1;
          canvas.height = 1;
        },
      };
    },
    async decodeImage(bytes): Promise<Raster> {
      const image = await loadImage(bytes);
      const canvas = createCanvas(image.width, image.height),
        context = canvas.getContext("2d");
      try {
        context.drawImage(image, 0, 0);
        return {
          width: image.width,
          height: image.height,
          data: context.getImageData(0, 0, image.width, image.height).data,
        };
      } finally {
        canvas.width = 1;
        canvas.height = 1;
      }
    },
  };
}
export async function createNodeEngine(options: EngineOptions = {}) {
  return createEngine(await createNodeRuntime(), options);
}
