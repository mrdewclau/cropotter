export type Rotation = 0 | 90 | 180 | 270;
export type Matrix = [number, number, number, number, number, number];
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type Dpi = 203 | 300;
export type PdfSource = Uint8Array | { url: string };
export interface Limits {
  maxBytes: number;
  maxPages: number;
  maxRenderPixels: number;
  maxLabels: number;
}
export interface OperationOptions {
  signal?: AbortSignal;
  onProgress?: (progress: Progress) => void;
}
export interface Progress {
  stage: "loading" | "analyzing" | "composing" | "validating" | "exporting";
  completed: number;
  total: number;
}
export interface BarcodeEvidence {
  format: string;
  digest: string;
  bounds: Rect;
}
export interface Candidate {
  id: string;
  pageIndex: number;
  region: Rect;
  rotation: Rotation;
  method:
    | "native-page"
    | "embedded-image"
    | "isolated-region"
    | "raster-region";
  confidence: "high" | "review";
  reasons: string[];
}
export interface PageAnalysis {
  pageIndex: number;
  widthPt: number;
  heightPt: number;
  rotation: Rotation;
  status: "blank" | "detected" | "needs_review";
  inkBounds?: Rect;
  candidates: Candidate[];
  barcodes: BarcodeEvidence[];
  warnings: string[];
  hasAnnotations: boolean;
}
export interface Analysis {
  schemaVersion: 1;
  engineVersion: string;
  sourceDigest: string;
  pages: PageAnalysis[];
  status: "ready" | "needs_review";
  warnings: string[];
}
export interface Selection {
  pageIndex: number;
  region?: Rect;
  rotation?: Rotation;
  skip?: boolean;
}
export interface BarcodeCheck {
  sourceCount: number;
  outputCount: number;
  status: "verified" | "unverified" | "regressed";
  formats: string[];
  labelId?: string;
  dpi?: Dpi;
  representation?: "pdf-render" | "mono" | "png" | "jpg";
}
export interface ValidationReport {
  status: "ready" | "needs_review";
  autoPrintEligible: boolean;
  warnings: string[];
  barcodes: BarcodeCheck[];
}
export interface LabelManifest {
  id: string;
  outputPageIndex: number;
  sourcePageIndex: number;
  sourceRegion: Rect;
  rotation: Rotation;
  contentRectPt: Rect;
  renderMode: "vector" | "raster";
  sourceBarcodes: BarcodeEvidence[];
  manuallySelected: boolean;
}
export interface PreparedDocument {
  schemaVersion: 1;
  engineVersion: string;
  sourceDigest: string;
  pdf: Uint8Array;
  labels: LabelManifest[];
  pages: {
    pageIndex: number;
    decision: "included" | "blank" | "skipped";
    labelIds: string[];
  }[];
  report: ValidationReport;
}
export type PreparationResult =
  | { status: "ready"; prepared: PreparedDocument }
  | { status: "needs_review"; analysis: Analysis; prepared?: PreparedDocument };
export interface ExportRequest {
  format: "pdf" | "png" | "jpg";
  dpi?: Dpi;
}
export interface Artifact {
  name: string;
  mimeType: string;
  data: Uint8Array;
  labelId?: string;
  dpi?: Dpi;
  report: ValidationReport;
}
export interface Raster {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}
export interface ThermalBitmap {
  labelId: string;
  width: number;
  height: number;
  stride: number;
  dpi: Dpi;
  bitsPerPixel: 1;
  bitOrder: "msb-first";
  blackIsOne: true;
  data: Uint8Array;
  report: ValidationReport;
}
export interface CanvasHandle {
  canvas: unknown;
  context: unknown;
  pixels(): Raster;
  putPixels(raster: Raster): void;
  encode(format: "png" | "jpg", quality: number): Promise<Uint8Array>;
  dispose(): void;
}
export interface EngineRuntime {
  createCanvas(width: number, height: number): CanvasHandle;
  decodeImage(bytes: Uint8Array): Promise<Raster>;
  pdfAssets: {
    workerSrc: string;
    cMapUrl: string;
    standardFontDataUrl: string;
    wasmUrl: string;
  };
  barcodeWasm: Uint8Array;
  fetch?: typeof globalThis.fetch;
}
export interface EngineOptions {
  limits?: Partial<Limits>;
  downloadTimeoutMs?: number;
}
