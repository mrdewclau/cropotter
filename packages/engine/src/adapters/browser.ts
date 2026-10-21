import { createEngine } from "../engine.js";
import { EngineError } from "../errors.js";
import type { EngineOptions, EngineRuntime } from "../types.js";

export async function createBrowserRuntime(
  assetBaseUrl: string,
): Promise<EngineRuntime> {
  const base = new URL(
    assetBaseUrl.endsWith("/") ? assetBaseUrl : assetBaseUrl + "/",
    globalThis.location.href,
  );
  const response = await fetch(new URL("zxing_reader.wasm", base));
  if (!response.ok)
    throw new EngineError(
      "UNSUPPORTED_CONTENT",
      "The bundled barcode reader could not be loaded.",
    );
  return {
    pdfAssets: {
      workerSrc: new URL("pdf.worker.mjs", base).href,
      cMapUrl: new URL("cmaps/", base).href,
      standardFontDataUrl: new URL("standard_fonts/", base).href,
      wasmUrl: new URL("wasm/", base).href,
    },
    barcodeWasm: new Uint8Array(await response.arrayBuffer()),
    createCanvas(width, height) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context)
        throw new EngineError(
          "UNSUPPORTED_CONTENT",
          "A 2D drawing surface is unavailable.",
        );
      return {
        canvas,
        context,
        pixels: () => ({
          width,
          height,
          data: context.getImageData(0, 0, width, height).data,
        }),
        putPixels: (raster) =>
          context.putImageData(
            new ImageData(
              new Uint8ClampedArray(raster.data),
              raster.width,
              raster.height,
            ),
            0,
            0,
          ),
        encode: (format, quality) =>
          new Promise<Uint8Array>((resolve, reject) =>
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(
                    new EngineError(
                      "EXPORT_FAILED",
                      "The image could not be encoded.",
                    ),
                  );
                  return;
                }
                blob.arrayBuffer().then(
                  (buffer) => resolve(new Uint8Array(buffer)),
                  () =>
                    reject(
                      new EngineError(
                        "EXPORT_FAILED",
                        "The image could not be encoded.",
                      ),
                    ),
                );
              },
              format === "png" ? "image/png" : "image/jpeg",
              quality / 100,
            ),
          ),
        dispose: () => {
          canvas.width = 0;
          canvas.height = 0;
        },
      };
    },
    async decodeImage(bytes) {
      const blob = new Blob([new Uint8Array(bytes).buffer]);
      const image = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        image.close();
        throw new EngineError(
          "EXPORT_FAILED",
          "The image could not be reopened.",
        );
      }
      try {
        context.drawImage(image, 0, 0);
        return {
          width: canvas.width,
          height: canvas.height,
          data: context.getImageData(0, 0, canvas.width, canvas.height).data,
        };
      } finally {
        image.close();
        canvas.width = 0;
        canvas.height = 0;
      }
    },
  };
}
export async function createBrowserEngine(
  options: EngineOptions & { assetBaseUrl: string },
) {
  return createEngine(
    await createBrowserRuntime(options.assetBaseUrl),
    options,
  );
}
