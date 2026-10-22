import { test, expect, chromium, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";

async function installSiteToolHost(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map();
    (window as any).__siteTools = tools;
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(tool: any, options: any) {
          if (tools.has(tool.name)) throw new Error("Duplicate registration");
          tools.set(tool.name, tool);
          options.signal.addEventListener(
            "abort",
            () => tools.delete(tool.name),
            { once: true },
          );
        },
      },
    });
  });
}
async function call(page: Page, name: string, input = {}): Promise<any> {
  return page.evaluate(
    async ({ name, input }) =>
      (window as any).__siteTools
        .get(name)
        .execute(input, { signal: new AbortController().signal }),
    { name, input },
  );
}

test("site tools convert locally, share UI names/resolution and download real PDF PNG ZIP", async ({
  page,
}) => {
  await installSiteToolHost(page);
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => (window as any).__siteTools.size))
    .toBe(6);
  expect(await call(page, "cropotter_get_state")).toMatchObject({
    status: "empty",
    documentId: null,
  });
  const loaded = await call(page, "cropotter_load_sample");
  expect(loaded).toMatchObject({ ok: true, status: "ready", labelCount: 1 });
  await expect(
    page.getByRole("link", { name: "Download PDF", exact: true }),
  ).toBeVisible();
  const configured = await call(page, "cropotter_set_output", {
    documentId: loaded.documentId,
    filename: "Order 204.pdf",
    dpi: 300,
  });
  expect(configured).toMatchObject({
    ok: true,
    dpi: 300,
    filename: "Order 204",
  });
  await expect(page.getByLabel("File name", { exact: true })).toHaveValue(
    "Order 204",
  );
  await expect(page.getByLabel("PNG resolution")).toHaveValue("300");
  const result = await call(page, "cropotter_get_downloads", {
    documentId: loaded.documentId,
  });
  expect(result.files.map((f: any) => f.filename)).toEqual([
    "Order 204.pdf",
    "Order 204.png",
    "Order 204.zip",
  ]);
  expect(result.files.every((f: any) => f.url.startsWith("blob:"))).toBe(true);
  for (const format of ["pdf", "png", "zip"]) {
    const downloading = page.waitForEvent("download");
    expect(
      await call(page, "cropotter_download", {
        documentId: loaded.documentId,
        format,
      }),
    ).toMatchObject({ ok: true, status: "download_started" });
    const download = await downloading;
    const bytes = await readFile((await download.path())!);
    if (format === "pdf") {
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.getPage(0).getSize()).toEqual({ width: 288, height: 432 });
    } else if (format === "png")
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
        1200, 1800,
      ]);
    else
      expect(Object.keys(unzipSync(bytes))).toEqual([
        "Order 204.pdf",
        "Order 204-001-300dpi.png",
      ]);
  }
  await page.getByRole("button", { name: "Start a new PDF" }).click();
  expect(
    await call(page, "cropotter_get_downloads", {
      documentId: loaded.documentId,
    }),
  ).toMatchObject({ ok: false, code: "NO_DOCUMENT" });
});

test("site tools cannot bypass the human crop-review checkbox", async ({
  page,
}) => {
  await installSiteToolHost(page);
  await page.goto("/");
  await page
    .locator('input[type="file"]')
    .setInputFiles(
      fileURLToPath(
        new URL("../../../../output/demo/native.pdf", import.meta.url),
      ),
    );
  await expect(
    page.getByRole("link", { name: "Download PDF", exact: true }),
  ).toBeVisible();
  const initial = await call(page, "cropotter_get_state");
  expect(
    await call(page, "cropotter_open_review", {
      documentId: initial.documentId,
    }),
  ).toMatchObject({ ok: true, status: "review_open" });
  const accept = page.getByRole("checkbox", { name: /I.ve checked/ });
  // Some ambiguous documents open crop review before final preparation.
  const apply = page.getByRole("button", { name: "Use these crops" });
  await expect(accept.or(apply)).toBeVisible();
  if (await apply.isVisible()) await apply.click();
  await expect(accept).toBeVisible();
  const state = await call(page, "cropotter_get_state");
  expect(
    await call(page, "cropotter_get_downloads", {
      documentId: state.documentId,
    }),
  ).toMatchObject({ ok: false, code: "REVIEW_REQUIRED" });
  expect(
    await call(page, "cropotter_set_output", {
      documentId: state.documentId,
      acknowledgeReview: true,
    }),
  ).toMatchObject({ ok: false });
  await accept.check();
  expect(
    await call(page, "cropotter_get_downloads", {
      documentId: state.documentId,
    }),
  ).toMatchObject({ ok: true });
});

test("a person cancelling a tool-started conversion receives no false success", async ({
  page,
}) => {
  await installSiteToolHost(page);
  const sample = await readFile(
    fileURLToPath(new URL("../../public/sample-label.pdf", import.meta.url)),
  );
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/sample-label.pdf", async (route) => {
    await gate;
    await route
      .fulfill({ contentType: "application/pdf", body: sample })
      .catch(() => {});
  });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => (window as any).__siteTools.size))
    .toBe(6);
  const pending = call(page, "cropotter_load_sample");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  release();
  expect(await pending).toMatchObject({ ok: false, code: "CANCELLED" });
  expect(await call(page, "cropotter_get_state")).toMatchObject({
    status: "empty",
    documentId: null,
  });
});

test("a failed tool-started sample reports failure and the visible error state", async ({
  page,
}) => {
  await installSiteToolHost(page);
  await page.route("**/sample-label.pdf", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => (window as any).__siteTools.size))
    .toBe(6);
  expect(await call(page, "cropotter_load_sample")).toMatchObject({
    ok: false,
    code: "OPERATION_FAILED",
  });
  expect(await call(page, "cropotter_get_state")).toMatchObject({
    status: "error",
    documentId: null,
  });
  await expect(page.getByRole("alert")).toBeVisible();
});

test.describe("native WebMCP", () => {
  test("discovers and executes tools through the actual Chromium browser API", async ({
    browserName,
    baseURL,
  }) => {
    test.skip(
      browserName !== "chromium",
      "Native WebMCP acceptance uses Chromium's experimental API; fallback is covered on all browsers.",
    );
    const browser = await chromium.launch({
      args: [
        "--enable-experimental-web-platform-features",
        "--enable-features=WebMCP",
        "--enable-blink-features=WebMCP",
      ],
    });
    try {
      const page = await browser.newPage();
      await page.goto(baseURL!);
      await expect
        .poll(() =>
          page.evaluate(
            async () =>
              (await (document as any).modelContext.getTools()).filter(
                (t: any) => t.name.startsWith("cropotter_"),
              ).length,
          ),
        )
        .toBe(6);
      const state = await page.evaluate(async () => {
        const context = (document as any).modelContext;
        const tool = (await context.getTools()).find(
          (t: any) => t.name === "cropotter_load_sample",
        );
        return JSON.parse(await context.executeTool(tool, {}));
      });
      expect(state).toMatchObject({ ok: true, status: "ready", labelCount: 1 });
      const downloading = page.waitForEvent("download");
      const result = await page.evaluate(async (documentId) => {
        const context = (document as any).modelContext;
        const tool = (await context.getTools()).find(
          (t: any) => t.name === "cropotter_download",
        );
        return JSON.parse(
          await context.executeTool(tool, { documentId, format: "pdf" }),
        );
      }, state.documentId);
      expect(result).toMatchObject({ ok: true, status: "download_started" });
      const pdf = await PDFDocument.load(
        await readFile((await (await downloading).path())!),
      );
      expect(pdf.getPage(0).getSize()).toEqual({ width: 288, height: 432 });
    } finally {
      await browser.close();
    }
  });
});
