import type {
  Analysis,
  Artifact,
  Dpi,
  OperationOptions,
  PreparedDocument,
  Selection,
} from "../../../../packages/engine/src/types.js";
import type { Engine } from "../../../../packages/engine/src/engine.js";
import { makeArchive } from "./downloads.js";
import { assertPdfBytes, fileStem } from "./input.js";
export const ASSET_BASE = "/engine-assets/v0.1.0/";
let enginePromise: Promise<Engine> | undefined;
export function getEngine() {
  enginePromise ??=
    import("../../../../packages/engine/src/adapters/browser.js")
      .then((m) => m.createBrowserEngine({ assetBaseUrl: ASSET_BASE }))
      .catch((e) => {
        enginePromise = undefined;
        throw e;
      });
  return enginePromise;
}
export interface Conversion {
  prepared: PreparedDocument;
  analysis?: Analysis;
  images: Artifact[];
  zip: Uint8Array;
  stem: string;
  dpi: Dpi;
}
export async function exportConversion(
  prepared: PreparedDocument,
  name: string,
  dpi: Dpi,
  options: OperationOptions,
  analysis?: Analysis,
): Promise<Conversion> {
  const engine = await getEngine();
  const images: Artifact[] = [];
  for await (const image of engine.export(
    prepared,
    { format: "png", dpi },
    options,
  )) {
    options.signal?.throwIfAborted();
    images.push(image);
    options.onProgress?.({
      stage: "exporting",
      completed: images.length,
      total: prepared.labels.length,
    });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
  options.signal?.throwIfAborted();
  const stem = fileStem(name);
  const archive = makeArchive(
    stem,
    prepared.pdf,
    images.map((image, i) => ({
      name: `${stem}-${String(i + 1).padStart(3, "0")}-${dpi}dpi.png`,
      data: image.data,
    })),
  );
  return { prepared, analysis, images, zip: archive, stem, dpi };
}
export async function convert(
  bytes: Uint8Array,
  name: string,
  dpi: Dpi,
  selections: Selection[] | undefined,
  options: OperationOptions,
): Promise<Conversion | Analysis> {
  assertPdfBytes(bytes);
  const engine = await getEngine();
  options.signal?.throwIfAborted();
  const result = await engine.prepare(bytes, selections, options);
  if (result.status === "needs_review" && !result.prepared)
    return result.analysis;
  if (!result.prepared)
    throw new Error("No label could be prepared. Please adjust the crop.");
  return exportConversion(
    result.prepared,
    name,
    dpi,
    options,
    result.status === "needs_review" ? result.analysis : undefined,
  );
}
