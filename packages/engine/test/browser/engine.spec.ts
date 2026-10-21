import { test, expect } from "@playwright/test";
import { fixture } from "../fixtures.js";
import { createServer } from "node:http";
import type { Engine } from "../../src/engine.js";
declare global {
  interface Window {
    cropShipHarness: { engine: Engine };
  }
}

test("local browser pipeline validates PDF, PNG, JPG and packed thermal output", async ({
  page,
}) => {
  const external: string[] = [];
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.protocol.startsWith("http") && url.hostname !== "127.0.0.1") {
      external.push(url.origin);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await page.waitForFunction(() => !!window.cropShipHarness);
  const result = await page.evaluate(
    async (bytes) => {
      const engine = window.cropShipHarness.engine;
      const result = await engine.prepare(new Uint8Array(bytes));
      if (!result.prepared)
        return {
          status: result.status,
          exports: [],
          warnings:
            "analysis" in result
              ? result.analysis.pages.map((p) => p.warnings)
              : [],
        };
      const outputs = [];
      for (const dpi of [203, 300] as const)
        for (const format of ["png", "jpg"] as const) {
          for await (const artifact of engine.export(result.prepared, {
            format,
            dpi,
          })) {
            const image = await createImageBitmap(
              new Blob([new Uint8Array(artifact.data).buffer]),
            );
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d")!;
            context.drawImage(image, 0, 0);
            const data = context.getImageData(
              0,
              0,
              image.width,
              image.height,
            ).data;
            const margin = Math.ceil(dpi / 8);
            let min = 255;
            for (let y = 0; y < image.height; y++)
              for (let x = 0; x < image.width; x++)
                if (
                  x < margin ||
                  y < margin ||
                  x >= image.width - margin ||
                  y >= image.height - margin
                ) {
                  const i = (y * image.width + x) * 4;
                  min = Math.min(min, data[i], data[i + 1], data[i + 2]);
                }
            outputs.push({
              format,
              dpi,
              width: image.width,
              height: image.height,
              min,
              eligible: artifact.report.autoPrintEligible,
            });
            image.close();
          }
        }
      const bitmap = await engine.thermalBitmap(
        result.prepared,
        result.prepared.labels[0].id,
      );
      return {
        status: result.status,
        exports: outputs,
        thermal: {
          width: bitmap.width,
          height: bitmap.height,
          stride: bitmap.stride,
          eligible: bitmap.report.autoPrintEligible,
        },
        warnings: result.prepared.report.warnings,
      };
    },
    Array.from(await fixture()),
  );
  expect(result.status, JSON.stringify(result.warnings)).toBe("ready");
  expect(result.exports).toHaveLength(4);
  for (const item of result.exports) {
    expect([item.width, item.height]).toEqual([item.dpi * 4, item.dpi * 6]);
    expect(item.min).toBeGreaterThanOrEqual(245);
    expect(item.eligible).toBe(true);
  }
  expect(result.thermal).toEqual({
    width: 812,
    height: 1218,
    stride: 102,
    eligible: true,
  });
  expect(external).toEqual([]);
});

test("file upload requests review for instructions and an explicit crop exports with warnings", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForFunction(() => !!window.cropShipHarness);
  await page.locator("#file").setInputFiles({
    name: "synthetic.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await fixture("instructions")),
  });
  await expect(page.locator("#status")).toHaveText("PDF loaded.");
  await page.locator("#prepare").click();
  await expect(page.locator("#status")).toContainText("Review required", {
    timeout: 60_000,
  });
  await page
    .locator("#selection")
    .fill(
      '[{"pageIndex":0,"region":{"x":36,"y":90,"width":288,"height":432}}]',
    );
  await page.locator("#prepare").click();
  await expect(page.locator("#preview")).toBeVisible({ timeout: 60_000 });
  const result = JSON.parse(await page.locator("#report").innerText());
  expect(result.prepared.report.autoPrintEligible).toBe(false);
  expect(result.prepared.labels[0].sourceRegion).toEqual({
    x: 36,
    y: 90,
    width: 288,
    height: 432,
  });
  await page.locator('[data-export="pdf"]').click();
  await expect(page.locator("#downloads a")).toHaveAttribute(
    "download",
    "crop-ship-labels.pdf",
  );
});

test("direct URL preserves signed query bytes and explains a CORS failure", async ({
  page,
}) => {
  const bytes = Buffer.from(await fixture());
  let seenQuery = "";
  const server = createServer((req, res) => {
    seenQuery = req.url ?? "";
    if (!req.url?.startsWith("/blocked"))
      res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:4173");
    res.setHeader("Content-Type", "application/octet-stream");
    res.end(bytes);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    await page.goto("/");
    await page.waitForFunction(() => !!window.cropShipHarness);
    await page
      .locator("#url")
      .fill(origin + "/label.pdf?signature=a%2Bb%2F&disposition=x%20y");
    await page.locator("#fetch").click();
    await page.locator("#prepare").click();
    await expect(page.locator("#status")).toHaveText(
      "Ready. Barcode checks passed.",
      { timeout: 60_000 },
    );
    expect(seenQuery).toBe("/label.pdf?signature=a%2Bb%2F&disposition=x%20y");
    await expect(page.locator("#preview")).toBeVisible({ timeout: 60_000 });
    await page.locator("#url").fill(origin + "/blocked?signature=private");
    await page.locator("#fetch").click();
    await page.locator("#prepare").click();
    await expect(page.locator("#status")).toContainText(
      "Upload the PDF instead.",
      { timeout: 60_000 },
    );
    expect(await page.locator("#status").innerText()).not.toContain("private");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
