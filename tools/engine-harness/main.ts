import { createBrowserEngine } from "../../packages/engine/src/adapters/browser.js";
import type {
  PdfSource,
  PreparedDocument,
  Selection,
  Dpi,
  ExportRequest,
} from "../../packages/engine/src/types.js";

const engine = await createBrowserEngine({ assetBaseUrl: "/engine-assets/" });
let source: PdfSource | undefined;
let prepared: PreparedDocument | undefined;
const urls: string[] = [];
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const status = (text: string) => {
  el("status").textContent = text;
};
function report(value: unknown) {
  el("report").textContent = JSON.stringify(
    value,
    (key, data) => (key === "pdf" ? `[${data.length} bytes]` : data),
    2,
  );
}
function download(data: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(data).buffer], { type }),
  );
  urls.push(url);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.textContent = name;
  el("downloads").append(a);
}
function clear() {
  for (const url of urls) URL.revokeObjectURL(url);
  urls.length = 0;
  el("downloads").replaceChildren();
  prepared = undefined;
  el<HTMLCanvasElement>("preview").hidden = true;
}
async function showPreview(doc: PreparedDocument) {
  for await (const artifact of engine.export(doc, {
    format: "png",
    dpi: 203,
  })) {
    const image = await createImageBitmap(
      new Blob([new Uint8Array(artifact.data).buffer]),
    );
    const canvas = el<HTMLCanvasElement>("preview");
    canvas.width = image.width;
    canvas.height = image.height;
    canvas.getContext("2d")!.drawImage(image, 0, 0);
    image.close();
    canvas.hidden = false;
    break;
  }
}
async function run(action: () => Promise<void>) {
  try {
    await action();
  } catch (error) {
    status(error instanceof Error ? error.message : "Operation failed.");
  }
}
el<HTMLInputElement>("file").onchange = () =>
  void run(async () => {
    clear();
    const file = el<HTMLInputElement>("file").files?.[0];
    if (file) {
      source = new Uint8Array(await file.arrayBuffer());
      status("PDF loaded.");
    }
  });
el("fetch").onclick = () => {
  clear();
  source = { url: el<HTMLInputElement>("url").value };
  status("URL selected; fetching starts with Analyze or Prepare.");
};
el("analyze").onclick = () =>
  void run(async () => {
    if (!source) return;
    status("Analyzing…");
    report(await engine.analyze(source));
    status("Analysis complete.");
  });
el("prepare").onclick = () =>
  void run(async () => {
    if (!source) return;
    clear();
    status("Preparing…");
    const text = el<HTMLTextAreaElement>("selection").value.trim();
    const result = await engine.prepare(
      source,
      text ? (JSON.parse(text) as Selection[]) : undefined,
    );
    prepared = result.prepared;
    report(result);
    status(
      result.status === "ready"
        ? "Ready. Barcode checks passed."
        : "Review required. See the analysis and warnings.",
    );
    if (prepared) await showPreview(prepared);
  });
for (const button of document.querySelectorAll<HTMLButtonElement>(
  "[data-export]",
))
  button.onclick = () =>
    void run(async () => {
      if (!prepared) return;
      for await (const item of engine.export(prepared, {
        format: button.dataset.export as ExportRequest["format"],
        dpi: Number(el<HTMLSelectElement>("dpi").value) as Dpi,
      }))
        download(item.data, item.name, item.mimeType);
    });
el("mono").onclick = () =>
  void run(async () => {
    if (!prepared) return;
    for (const label of prepared.labels) {
      const bitmap = await engine.thermalBitmap(prepared, label.id);
      download(
        bitmap.data,
        `${label.id}-203dpi.bin`,
        "application/octet-stream",
      );
      const { data, ...metadata } = bitmap;
      download(
        new TextEncoder().encode(JSON.stringify(metadata, null, 2)),
        `${label.id}-203dpi.json`,
        "application/json",
      );
    }
  });
// Test bridge exposes the same public engine, not a separate conversion path.
Object.assign(window, { cropShipHarness: { engine } });
window.addEventListener("pagehide", () => {
  clear();
  void engine.dispose();
});
