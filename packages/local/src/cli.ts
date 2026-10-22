#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  LocalService,
  LocalError,
  readSelections,
  safeError,
  VERSION,
} from "./service.js";
// PDF parser diagnostics may include source-controlled strings; stdout is JSON only.
console.log = console.warn = console.info = () => {};
async function main() {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new LocalError(
      "UNSUPPORTED_NODE",
      "CropOtter requires Node.js 24 or newer.",
    );
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      input: { type: "string" },
      out: { type: "string" },
      formats: { type: "string", default: "pdf" },
      name: { type: "string", default: "label" },
      dpi: { type: "string", default: "203" },
      selections: { type: "string" },
      "acknowledge-review": { type: "boolean" },
      help: { type: "boolean" },
      version: { type: "boolean" },
    },
  });
  if (values.version) return { version: VERSION };
  if (values.help)
    return {
      usage: [
        "cropotter analyze --input PATH",
        "cropotter convert --input PATH --out DIR [--formats pdf,png,zip] [--name NAME] [--dpi 203|300] [--selections PATH] [--acknowledge-review]",
      ],
      selections:
        "JSON array: {pageIndex: zero-based index, region?: {x,y,width,height}, rotation?: 0|90|180|270, skip?: boolean}. Regions use top-left source-page viewport coordinates in PDF points (72 points/inch), with source rotation applied. Every nonblank page needs an include/crop or skip decision.",
      review:
        "Exit 2 means review required. Inspect analysis and supply explicit page/crop selections. No uncertain final files are written without deliberate acknowledgement.",
    };
  if (
    positionals.length !== 1 ||
    !["analyze", "convert"].includes(positionals[0]) ||
    !values.input
  )
    throw new LocalError(
      "INVALID_OPTIONS",
      "Choose analyze or convert and provide --input PATH. Conversion also requires --out DIR.",
    );
  const controller = new AbortController(),
    abort = () => controller.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  try {
    const service = new LocalService();
    const result =
      positionals[0] === "analyze"
        ? await service.analyze(values.input, controller.signal)
        : await service.convert(
            {
              input: values.input,
              out: values.out ?? "",
              formats: values.formats!.split(",") as ("pdf" | "png" | "zip")[],
              name: values.name,
              dpi: Number(values.dpi) as 203 | 300,
              selections: values.selections
                ? await readSelections(values.selections, controller.signal)
                : undefined,
              acknowledgeReview: values["acknowledge-review"] ?? false,
            },
            controller.signal,
          );
    if (result.status === "review_required") process.exitCode = 2;
    return result;
  } finally {
    process.removeListener("SIGINT", abort);
    process.removeListener("SIGTERM", abort);
  }
}
main()
  .then((result) => process.stdout.write(JSON.stringify(result) + "\n"))
  .catch((error) => {
    process.stdout.write(
      JSON.stringify({ status: "error", error: safeError(error) }) + "\n",
    );
    process.exitCode = 1;
  });
