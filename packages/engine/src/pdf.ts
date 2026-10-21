import type {
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist/types/src/display/api.js";
import { preflightPdf } from "./pdf-preflight.js";
import { checkAbort, DEFAULT_LIMITS, EngineError } from "./errors.js";
import { IDENTITY, multiply, transformRect } from "./geometry.js";
import type {
  CanvasHandle,
  EngineRuntime,
  Limits,
  Matrix,
  Rect,
} from "./types.js";

export class PdfBackend {
  constructor(
    public readonly runtime: EngineRuntime,
    public readonly limits: Limits = DEFAULT_LIMITS,
  ) {}
  async open(
    bytes: Uint8Array,
    signal?: AbortSignal,
  ): Promise<PDFDocumentProxy> {
    checkAbort(signal);
    await preflightPdf(bytes, this.limits, signal);
    checkAbort(signal);
    const api = await import("pdfjs-dist/legacy/build/pdf.mjs");
    api.GlobalWorkerOptions.workerSrc = this.runtime.pdfAssets.workerSrc;
    const runtime = this.runtime;
    class CanvasFactory {
      create(width: number, height: number) {
        const surface = runtime.createCanvas(width, height);
        return { canvas: surface.canvas, context: surface.context };
      }
      reset(
        target: { canvas: { width: number; height: number } },
        width: number,
        height: number,
      ) {
        target.canvas.width = width;
        target.canvas.height = height;
      }
      destroy(target: {
        canvas: { width: number; height: number } | null;
        context: unknown;
      }) {
        if (target.canvas) {
          target.canvas.width = 1;
          target.canvas.height = 1;
        }
        target.canvas = null;
        target.context = null;
      }
    }
    const task = api.getDocument({
      data: new Uint8Array(bytes),
      ...this.runtime.pdfAssets,
      CanvasFactory,
      verbosity: 0,
      stopAtErrors: true,
      maxImageSize: this.limits.maxRenderPixels,
      isOffscreenCanvasSupported: false,
      isImageDecoderSupported: false,
      useSystemFonts: false,
    });
    const abort = () => {
      void task.destroy();
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      const doc = await task.promise;
      if (doc.numPages > this.limits.maxPages) {
        await doc.loadingTask.destroy();
        throw new EngineError(
          "LIMIT_EXCEEDED",
          "The PDF exceeds the page limit.",
        );
      }
      if (doc.isPureXfa) {
        await doc.loadingTask.destroy();
        throw new EngineError(
          "UNSUPPORTED_CONTENT",
          "Dynamic XFA documents are unsupported.",
        );
      }
      const permissions = await doc.getPermissions();
      if (permissions !== null) {
        await doc.loadingTask.destroy();
        throw new EngineError(
          "ENCRYPTED_PDF",
          "Encrypted PDFs are unsupported. Export an unencrypted copy.",
        );
      }
      return doc;
    } catch (error) {
      await task.destroy().catch(() => {});
      checkAbort(signal);
      if (error instanceof EngineError) throw error;
      if (error instanceof Error && error.name === "PasswordException")
        throw new EngineError(
          "ENCRYPTED_PDF",
          "Encrypted PDFs are unsupported. Export an unencrypted copy.",
        );
      throw new EngineError("INVALID_PDF", "The PDF could not be parsed.");
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  }
  async render(
    page: PDFPageProxy,
    dpi: number,
    options: {
      signal?: AbortSignal;
      width?: number;
      height?: number;
      transform?: Matrix;
    } = {},
  ): Promise<{ surface: CanvasHandle; scale: number }> {
    checkAbort(options.signal);
    const scale = dpi / 72,
      viewport = page.getViewport({ scale });
    const width = options.width ?? Math.ceil(viewport.width),
      height = options.height ?? Math.ceil(viewport.height);
    if (
      !Number.isFinite(width * height) ||
      width <= 0 ||
      height <= 0 ||
      width * height > this.limits.maxRenderPixels
    )
      throw new EngineError(
        "LIMIT_EXCEEDED",
        "The PDF page exceeds the render size limit.",
      );
    const surface = this.runtime.createCanvas(width, height);
    const task = page.render({
      canvas: null,
      canvasContext: surface.context as CanvasRenderingContext2D,
      viewport,
      transform: options.transform,
      intent: "print",
      background: "#ffffff",
    });
    const abort = () => task.cancel();
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      await task.promise;
      checkAbort(options.signal);
      const api = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const ops = await page.getOperatorList({ intent: "print" });
      const ids = new Set<string>();
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i],
          args = ops.argsArray[i];
        if (
          fn === api.OPS.paintImageXObject ||
          fn === api.OPS.paintImageXObjectRepeat
        )
          ids.add(args[0]);
        if (
          fn === api.OPS.paintImageMaskXObject &&
          typeof args[0]?.data === "string"
        )
          ids.add(args[0].data);
      }
      // PDF.js catches some decoder failures and resolves a null image. Rendering alone
      // can therefore succeed with missing pixels even with stopAtErrors enabled.
      for (const id of ids) {
        const store = id.startsWith("g_") ? page.commonObjs : page.objs;
        let onAbort: () => void = () => {};
        let image: any;
        try {
          image = await new Promise((resolve, reject) => {
            onAbort = () =>
              reject(new EngineError("ABORTED", "Processing was cancelled."));
            options.signal?.addEventListener("abort", onAbort, { once: true });
            if (options.signal?.aborted) {
              onAbort();
              return;
            }
            store.get(id, resolve);
          });
        } finally {
          options.signal?.removeEventListener("abort", onAbort);
        }
        if (!image)
          throw new EngineError(
            "UNSUPPORTED_CONTENT",
            "An embedded image could not be decoded completely.",
          );
        if (image.width * image.height > this.limits.maxRenderPixels)
          throw new EngineError(
            "LIMIT_EXCEEDED",
            "A decoded image exceeds the render size limit.",
          );
      }
      checkAbort(options.signal);
      return { surface, scale };
    } catch (error) {
      surface.dispose();
      checkAbort(options.signal);
      if (error instanceof EngineError) throw error;
      throw new EngineError(
        "UNSUPPORTED_CONTENT",
        "The PDF page could not be rendered completely.",
      );
    } finally {
      options.signal?.removeEventListener("abort", abort);
    }
  }
  async objectRegions(
    page: PDFPageProxy,
  ): Promise<{ region: Rect; kind: "image" | "form" }[]> {
    const api = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const ops = await page.getOperatorList();
    const viewport = page.getViewport({ scale: 1 });
    const regions: { region: Rect; kind: "image" | "form" }[] = [];
    let matrix: Matrix = [...IDENTITY];
    const stack: Matrix[] = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const op = ops.fnArray[i],
        args = ops.argsArray[i];
      if (op === api.OPS.save) {
        stack.push([...matrix]);
      } else if (op === api.OPS.restore) {
        matrix = stack.pop() ?? [...IDENTITY];
      } else if (op === api.OPS.transform) {
        matrix = multiply(matrix, args as Matrix);
      } else if (op === api.OPS.paintFormXObjectBegin) {
        stack.push([...matrix]);
        if (args[0]) matrix = multiply(matrix, args[0]);
        if (args[1]) {
          const b = args[1];
          regions.push({
            kind: "form",
            region: transformRect(
              multiply(viewport.transform as Matrix, matrix),
              { x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1] },
            ),
          });
        }
      } else if (op === api.OPS.paintFormXObjectEnd) {
        matrix = stack.pop() ?? [...IDENTITY];
      } else if (
        op === api.OPS.paintImageXObject ||
        op === api.OPS.paintInlineImageXObject
      ) {
        regions.push({
          kind: "image",
          region: transformRect(
            multiply(viewport.transform as Matrix, matrix),
            { x: 0, y: 0, width: 1, height: 1 },
          ),
        });
      }
    }
    return regions;
  }
}
