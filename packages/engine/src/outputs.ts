import { PdfBackend } from "./pdf.js";
import { contains, rasterProfile } from "./geometry.js";
import { compareBarcodes, scanBarcodes } from "./barcodes.js";
import { gray, packMono } from "./pixels.js";
import { checkAbort, DEFAULT_LIMITS, EngineError } from "./errors.js";
import { jpgDensity, pngDensity } from "./metadata.js";
import type {
  Artifact,
  BarcodeCheck,
  Dpi,
  EngineRuntime,
  ExportRequest,
  LabelManifest,
  Limits,
  OperationOptions,
  PreparedDocument,
  Raster,
  ThermalBitmap,
  ValidationReport,
} from "./types.js";

type OutputOptions = OperationOptions & { limits?: Limits };
export async function rasterizePrepared(
  runtime: EngineRuntime,
  prepared: PreparedDocument,
  pageIndex: number,
  dpi: Dpi,
  options: OutputOptions = {},
) {
  const profile = rasterProfile(dpi),
    label = prepared.labels[pageIndex];
  if (!label)
    throw new EngineError(
      "INVALID_SELECTION",
      "The output label does not exist.",
    );
  const c = label.contentRectPt;
  if (
    ![c.x, c.y, c.width, c.height].every(Number.isFinite) ||
    c.width <= 0 ||
    c.height <= 0 ||
    !contains({ x: 0, y: 0, width: 288, height: 432 }, c, 0)
  )
    throw new EngineError(
      "EXPORT_FAILED",
      "The prepared content geometry is invalid.",
    );
  const px = dpi / 72;
  // Account for every edge, including compliant native pages with asymmetric ink bounds.
  const k = Math.min(
    1,
    (profile.width / 2 - profile.margin) /
      (Math.max(144 - c.x, c.x + c.width - 144) * px),
    (profile.height / 2 - profile.margin) /
      (Math.max(216 - c.y, c.y + c.height - 216) * px),
  );
  const limits = options.limits ?? DEFAULT_LIMITS;
  const backend = new PdfBackend(runtime, {
    ...limits,
    maxPages: limits.maxLabels,
  });
  const doc = await backend.open(prepared.pdf, options.signal);
  try {
    const page = await doc.getPage(pageIndex + 1),
      viewport = page.getViewport({ scale: 1 });
    if (
      Math.abs(viewport.width - 288) > 0.001 ||
      Math.abs(viewport.height - 432) > 0.001
    )
      throw new EngineError(
        "EXPORT_FAILED",
        "Prepared PDF pages must measure exactly 4 by 6 inches.",
      );
    const rendered = await backend.render(page, dpi, {
      ...options,
      width: profile.width,
      height: profile.height,
      transform: [
        k,
        0,
        0,
        k,
        (profile.width - profile.width * k) / 2,
        (profile.height - profile.height * k) / 2,
      ],
    });
    return {
      surface: rendered.surface,
      pixels: rendered.surface.pixels(),
      profile,
    };
  } finally {
    await doc.loadingTask.destroy();
  }
}
function marginsClear(raster: Raster, dpi: Dpi): boolean {
  const m = Math.ceil(dpi / 8);
  for (let y = 0; y < raster.height; y++)
    for (let x = 0; x < raster.width; x++)
      if (x < m || y < m || x >= raster.width - m || y >= raster.height - m) {
        if (gray(raster.data, (y * raster.width + x) * 4) < 245) return false;
      }
  return true;
}
async function inspectRaster(
  runtime: EngineRuntime,
  raster: Raster,
  label: LabelManifest,
  dpi: Dpi,
  representation: NonNullable<BarcodeCheck["representation"]>,
) {
  const found = await scanBarcodes(raster, runtime.barcodeWasm);
  const check: BarcodeCheck = {
    ...compareBarcodes(label.sourceBarcodes, found.barcodes),
    labelId: label.id,
    dpi,
    representation,
  };
  const warnings: string[] = [];
  if (found.invalidCount) warnings.push("UNREADABLE_BARCODE");
  if (!marginsClear(raster, dpi)) warnings.push("MARGIN_REGRESSION");
  return { check, warnings };
}
export function reportWithChecks(
  base: ValidationReport,
  checks: BarcodeCheck[],
  additionalWarnings: string[] = [],
): ValidationReport {
  const warnings = [...base.warnings, ...additionalWarnings];
  if (checks.some((c) => c.status === "regressed"))
    warnings.push("BARCODE_REGRESSION");
  if (checks.some((c) => c.status === "unverified"))
    warnings.push("BARCODE_UNVERIFIED");
  const unique = [...new Set(warnings)];
  return {
    status: unique.length ? "needs_review" : "ready",
    autoPrintEligible:
      unique.length === 0 &&
      checks.length > 0 &&
      checks.every((c) => c.status === "verified"),
    warnings: unique,
    barcodes: checks,
  };
}
export async function validatePrepared(
  runtime: EngineRuntime,
  prepared: PreparedDocument,
  options: OutputOptions = {},
): Promise<ValidationReport> {
  const checks: BarcodeCheck[] = [],
    warnings: string[] = [];
  for (let i = 0; i < prepared.labels.length; i++) {
    checkAbort(options.signal);
    options.onProgress?.({
      stage: "validating",
      completed: i,
      total: prepared.labels.length,
    });
    for (const dpi of [203, 300] as const) {
      const rendered = await rasterizePrepared(
        runtime,
        prepared,
        i,
        dpi,
        options,
      );
      try {
        const color = await inspectRaster(
          runtime,
          rendered.pixels,
          prepared.labels[i],
          dpi,
          "pdf-render",
        );
        checks.push(color.check);
        warnings.push(...color.warnings);
        if (dpi === 203) {
          const mono = await inspectRaster(
            runtime,
            packMono(rendered.pixels).pixels,
            prepared.labels[i],
            dpi,
            "mono",
          );
          checks.push(mono.check);
          warnings.push(...mono.warnings);
        }
      } finally {
        rendered.surface.dispose();
      }
    }
  }
  options.onProgress?.({
    stage: "validating",
    completed: prepared.labels.length,
    total: prepared.labels.length,
  });
  return reportWithChecks(prepared.report, checks, warnings);
}
export async function* exportArtifacts(
  runtime: EngineRuntime,
  prepared: PreparedDocument,
  request: ExportRequest,
  options: OutputOptions = {},
): AsyncGenerator<Artifact> {
  checkAbort(options.signal);
  if (!["pdf", "png", "jpg"].includes(request.format))
    throw new EngineError("EXPORT_FAILED", "Unsupported export format.");
  if (request.format === "pdf") {
    yield {
      name: "crop-ship-labels.pdf",
      mimeType: "application/pdf",
      data: prepared.pdf.slice(),
      report: structuredClone(prepared.report),
    };
    return;
  }
  const dpi = request.dpi ?? 203;
  rasterProfile(dpi);
  for (let i = 0; i < prepared.labels.length; i++) {
    checkAbort(options.signal);
    options.onProgress?.({
      stage: "exporting",
      completed: i,
      total: prepared.labels.length,
    });
    const rendered = await rasterizePrepared(
      runtime,
      prepared,
      i,
      dpi,
      options,
    );
    let artifact: Artifact;
    try {
      const raw = await rendered.surface.encode(request.format, 98);
      const data =
        request.format === "png" ? pngDensity(raw, dpi) : jpgDensity(raw, dpi);
      const decoded = await runtime.decodeImage(data);
      if (
        decoded.width !== rendered.profile.width ||
        decoded.height !== rendered.profile.height
      )
        throw new EngineError(
          "EXPORT_FAILED",
          "The encoded image has unexpected dimensions.",
        );
      const validation = await inspectRaster(
        runtime,
        decoded,
        prepared.labels[i],
        dpi,
        request.format,
      );
      checkAbort(options.signal);
      artifact = {
        name: `crop-ship-label-${String(i + 1).padStart(3, "0")}-${dpi}dpi.${request.format}`,
        mimeType: request.format === "png" ? "image/png" : "image/jpeg",
        data,
        labelId: prepared.labels[i].id,
        dpi,
        report: reportWithChecks(
          prepared.report,
          [validation.check],
          validation.warnings,
        ),
      };
    } finally {
      rendered.surface.dispose();
    }
    yield artifact;
  }
}
export async function makeThermalBitmap(
  runtime: EngineRuntime,
  prepared: PreparedDocument,
  labelId: string,
  options: OutputOptions & { dpi?: Dpi } = {},
): Promise<ThermalBitmap> {
  const index = prepared.labels.findIndex((l) => l.id === labelId);
  if (index < 0)
    throw new EngineError(
      "INVALID_SELECTION",
      "The output label does not exist.",
    );
  const dpi = options.dpi ?? 203,
    rendered = await rasterizePrepared(runtime, prepared, index, dpi, options);
  try {
    const mono = packMono(rendered.pixels);
    const validation = await inspectRaster(
      runtime,
      mono.pixels,
      prepared.labels[index],
      dpi,
      "mono",
    );
    checkAbort(options.signal);
    return {
      labelId,
      width: rendered.profile.width,
      height: rendered.profile.height,
      stride: mono.stride,
      dpi,
      bitsPerPixel: 1,
      bitOrder: "msb-first",
      blackIsOne: true,
      data: mono.data,
      report: reportWithChecks(
        prepared.report,
        [validation.check],
        validation.warnings,
      ),
    };
  } finally {
    rendered.surface.dispose();
  }
}
