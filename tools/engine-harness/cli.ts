import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { createNodeEngine } from "../../packages/engine/src/adapters/node.js";
import { EngineError } from "../../packages/engine/src/errors.js";
import type {
  Dpi,
  PdfSource,
  Selection,
} from "../../packages/engine/src/types.js";

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: "string" },
      url: { type: "string" },
      out: { type: "string", default: "output" },
      format: { type: "string", default: "pdf,png,jpg,mono" },
      dpi: { type: "string", default: "203" },
      selection: { type: "string" },
      analyze: { type: "boolean" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      "crop/ship engine\n  --input label.pdf | --url https://host/label.pdf\n  [--out output] [--format pdf,png,jpg,mono] [--dpi 203|300]\n  [--analyze] [--selection selections.json]\nReview-required results exit with code 2; errors exit with code 1.",
    );
    return;
  }
  if (!!values.input === !!values.url)
    throw new EngineError(
      "INVALID_SOURCE",
      "Choose exactly one --input PDF or --url.",
    );
  const dpi = Number(values.dpi) as Dpi;
  if (dpi !== 203 && dpi !== 300)
    throw new EngineError(
      "INVALID_SELECTION",
      "Resolution must be 203 or 300 DPI.",
    );
  const formats = values.format!.split(",");
  if (formats.some((f) => !["pdf", "png", "jpg", "mono"].includes(f)))
    throw new EngineError("EXPORT_FAILED", "Formats must be pdf,png,jpg,mono.");
  let source: PdfSource;
  if (values.input) {
    if ((await stat(values.input)).size > 25 * 1024 * 1024)
      throw new EngineError(
        "LIMIT_EXCEEDED",
        "The PDF exceeds the input size limit.",
      );
    source = new Uint8Array(await readFile(values.input));
  } else source = { url: values.url! };
  let selections: Selection[] | undefined;
  if (values.selection) {
    try {
      selections = JSON.parse(await readFile(values.selection, "utf8"));
    } catch {
      throw new EngineError(
        "INVALID_SELECTION",
        "The selections file must contain valid JSON.",
      );
    }
  }
  await mkdir(values.out!, { recursive: true });
  const engine = await createNodeEngine();
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort);
  try {
    if (values.analyze) {
      const result = await engine.analyze(source, {
        signal: controller.signal,
      });
      await writeFile(
        join(values.out!, "analysis.json"),
        JSON.stringify(result, null, 2),
      );
      console.log(
        `Analysis: ${result.status}; ${result.pages.length} page(s).`,
      );
      if (result.status === "needs_review") process.exitCode = 2;
      return;
    }
    const result = await engine.prepare(source, selections, {
      signal: controller.signal,
    });
    if (!result.prepared) {
      await writeFile(
        join(values.out!, "analysis.json"),
        JSON.stringify("analysis" in result ? result.analysis : {}, null, 2),
      );
      console.log(
        "Review required. Inspect analysis.json and supply explicit selections.",
      );
      process.exitCode = 2;
      return;
    }
    const prepared = result.prepared;
    const artifactReports: unknown[] = [];
    for (const format of formats) {
      if (format === "mono") {
        for (const label of prepared.labels) {
          const bitmap = await engine.thermalBitmap(prepared, label.id, {
            dpi,
            signal: controller.signal,
          });
          const prefix = `${label.id}-${dpi}dpi`;
          await writeFile(join(values.out!, `${prefix}.bin`), bitmap.data);
          // PBM is a diagnostic preview of exactly the packed printer pixels, not printer commands.
          await writeFile(
            join(values.out!, `${prefix}.pbm`),
            Buffer.concat([
              Buffer.from(`P4\n${bitmap.width} ${bitmap.height}\n`),
              bitmap.data,
            ]),
          );
          const { data, ...metadata } = bitmap;
          await writeFile(
            join(values.out!, `${prefix}.json`),
            JSON.stringify(metadata, null, 2),
          );
          artifactReports.push({
            name: `${prefix}.bin`,
            report: bitmap.report,
          });
        }
      } else {
        for await (const artifact of engine.export(
          prepared,
          { format: format as "pdf" | "png" | "jpg", dpi },
          { signal: controller.signal },
        )) {
          await writeFile(join(values.out!, artifact.name), artifact.data);
          artifactReports.push({
            name: artifact.name,
            report: artifact.report,
          });
        }
      }
    }
    const { pdf, ...manifest } = prepared;
    await writeFile(
      join(values.out!, "manifest.json"),
      JSON.stringify({ ...manifest, artifacts: artifactReports }, null, 2),
    );
    const review =
      result.status === "needs_review" ||
      artifactReports.some(
        (a) =>
          (a as { report: { status: string } }).report.status ===
          "needs_review",
      );
    console.log(
      `${review ? "Review required" : "Ready"}: ${prepared.labels.length} label(s); artifacts and manifest saved.`,
    );
    if (review) process.exitCode = 2;
  } finally {
    process.removeListener("SIGINT", abort);
    await engine.dispose();
  }
}
main().catch((error) => {
  // File paths and signed input URLs may contain sensitive data: never echo raw I/O or parser errors.
  console.error(
    error instanceof EngineError
      ? `${error.code}: ${error.message}`
      : "ENGINE_FAILED: The operation failed. Check the input and output access.",
  );
  process.exitCode = 1;
});
