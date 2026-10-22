import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ASSET_BASE } from "./lib/conversion.js";
export function PagePreview({
  source,
  pageIndex,
  width,
  height,
  children,
  onError,
}: {
  source: Uint8Array;
  pageIndex: number;
  width: number;
  height: number;
  children: ReactNode;
  onError: (message: string) => void;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [loading, setLoading] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    let cancelled = false;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    void import("pdfjs-dist/legacy/build/pdf.mjs")
      .then(async (pdf) => {
        if (cancelled) return;
        pdf.GlobalWorkerOptions.workerSrc = ASSET_BASE + "pdf.worker.mjs";
        task = pdf.getDocument({
          data: new Uint8Array(source),
          cMapUrl: ASSET_BASE + "cmaps/",
          standardFontDataUrl: ASSET_BASE + "standard_fonts/",
          wasmUrl: ASSET_BASE + "wasm/",
        });
        const loaded = await task.promise;
        if (!cancelled) setDocument(loaded);
      })
      .catch(() => {
        if (!cancelled)
          onErrorRef.current(
            "The page preview could not load. Please try a fresh PDF.",
          );
      });
    return () => {
      cancelled = true;
      void task?.destroy().catch(() => {});
    };
  }, [source]);
  useEffect(() => {
    if (!document) return;
    let cancelled = false;
    let render: import("pdfjs-dist").RenderTask | undefined;
    setLoading(true);
    void document
      .getPage(pageIndex + 1)
      .then(async (page) => {
        if (cancelled || !canvas.current) return;
        const scale = Math.min(1.5, Math.sqrt(4000000 / (width * height)));
        const viewport = page.getViewport({ scale });
        const element = canvas.current;
        element.width = Math.ceil(viewport.width);
        element.height = Math.ceil(viewport.height);
        render = page.render({ canvas: element, viewport });
        await render.promise;
        if (!cancelled) setLoading(false);
      })
      .catch(() => {
        if (!cancelled)
          onErrorRef.current(
            "This page could not be previewed. Please try a fresh PDF.",
          );
      });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [document, pageIndex, width, height]);
  return (
    <div
      className="source-page"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <canvas
        ref={canvas}
        aria-label={`Original PDF page ${pageIndex + 1}`}
        role="img"
      />
      {!loading && children}
      {loading && (
        <div className="page-loading" role="status">
          Loading page preview…
        </div>
      )}
    </div>
  );
}
