import { test, expect, type Page, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import AxeBuilder from "@axe-core/playwright";

const fixture = (name: string) =>
  fileURLToPath(
    new URL(`../../../../output/demo/${name}.pdf`, import.meta.url),
  );

test("keeps the single-tool workspace and downloads inside the viewport", async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 480],
    [375, 480],
    [320, 568],
    [375, 667],
    [390, 844],
    [568, 320],
    [701, 550],
    [800, 600],
    [1280, 720],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const fits = async () => {
      expect(
        await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
        })),
      ).toEqual({
        width,
        height,
        viewportWidth: width,
        viewportHeight: height,
      });
    };
    const inView = async (locator: Locator) => {
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    };
    await fits();
    await inView(page.getByRole("button", { name: /Drop your PDF here/ }));
    await inView(page.getByRole("button", { name: "Try a sample label" }));
    const guide = page.getByRole("complementary", {
      name: "How CropOtter works",
    });
    await inView(guide);
    expect(
      await guide.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
    ).toBe(true);
    await page.getByRole("tab", { name: "Paste a link" }).click();
    await inView(page.getByLabel("Your direct PDF link"));
    await inView(page.getByRole("button", { name: "Format link" }));
    await page.getByRole("tab", { name: "Upload PDF" }).click();
    await page.getByRole("button", { name: "Try a sample label" }).click();
    await ready(page);
    await fits();
    await inView(page.getByLabel("File name", { exact: true }));
    for (const name of ["Download PDF", "Download PNG"]) {
      await inView(page.getByRole("link", { name, exact: true }));
    }
    await inView(page.getByRole("button", { name: "Start a new PDF" }));
    await inView(page.getByRole("button", { name: "Adjust crop" }));
    await inView(page.getByRole("img", { name: /Formatted shipping label/ }));
    await page.getByRole("button", { name: "Adjust crop" }).click();
    await expect(
      page.getByRole("button", { name: "Move crop for label 1", exact: true }),
    ).toBeVisible();
    await inView(page.getByRole("button", { name: "Use these crops" }));
    await inView(page.getByRole("button", { name: "Close crop editor" }));
    await inView(
      page.getByRole("img", { name: "Original PDF page 1", exact: true }),
    );
    const ratio = await page
      .locator(".source-page canvas")
      .evaluate((canvas: HTMLCanvasElement) => {
        const bounds = canvas.getBoundingClientRect();
        return Math.abs(
          bounds.width / bounds.height - canvas.width / canvas.height,
        );
      });
    expect(ratio).toBeLessThan(0.01);
  }
});

test("demonstrates the PDF crop transformation in aligned panels and can pause it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  const guide = page.getByRole("complementary", {
    name: "How CropOtter works",
  });
  await expect(guide).toBeVisible();
  await expect(
    guide.getByRole("heading", { name: /A FULL PAGE IN/ }),
  ).toBeVisible();
  const drop = await page
    .getByRole("button", { name: /Drop your PDF here/ })
    .boundingBox();
  const explanation = await guide.boundingBox();
  expect(explanation!.x).toBeGreaterThanOrEqual(drop!.x + drop!.width);
  const inputPanel = await page.locator(".intake-input").boundingBox();
  expect(Math.abs(inputPanel!.y - explanation!.y)).toBeLessThan(2);
  expect(Math.abs(inputPanel!.height - explanation!.height)).toBeLessThan(2);
  const canvas = guide.locator(".three-canvas");
  await expect(canvas).toHaveCount(1);
  const still = await canvas.screenshot();
  await expect
    .poll(async () => Buffer.compare(still, await canvas.screenshot()))
    .not.toBe(0);
  await expect(guide.locator(".demo-stage")).toHaveAttribute(
    "data-phase",
    "2",
    { timeout: 12000 },
  );
  await guide.getByRole("button", { name: "Pause demonstration" }).click();
  await expect(
    guide.getByRole("button", { name: "Play demonstration" }),
  ).toBeVisible();
  const pausedFrame = await canvas.screenshot();
  await page.waitForTimeout(350);
  expect((await canvas.screenshot()).equals(pausedFrame)).toBe(true);
  await guide.getByRole("button", { name: "Play demonstration" }).click();
  await expect(guide.locator(".demo-stage")).toHaveAttribute(
    "data-phase",
    "3",
    { timeout: 12000 },
  );
});

test("opens help and privacy on demand without leaving the workspace", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A little help." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Help", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Privacy", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your label stays yours." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close help" }).click();
  await expect(
    page.getByRole("button", { name: /Drop your PDF here/ }),
  ).toBeVisible();
});
async function ready(page: Page) {
  await expect(
    page.getByRole("heading", { name: /Looking good\./i }),
  ).toBeVisible({ timeout: 90000 });
}
async function download(page: Page, link: Locator) {
  const pending = page.waitForEvent("download");
  await link.click();
  const result = await pending;
  const path = await result.path();
  if (!path) throw Error("No downloaded file");
  return readFile(path);
}
async function checkPdf(bytes: Uint8Array, count = 1) {
  const doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(count);
  for (const page of doc.getPages()) {
    expect(page.getSize()).toEqual({ width: 288, height: 432 });
  }
}

test("formats the sample and offers actual PDF, PNG and ZIP downloads", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample label" }).click();
  await ready(page);
  await checkPdf(
    await download(
      page,
      page.getByRole("link", { name: "Download PDF", exact: true }),
    ),
  );
  const png = await download(
    page,
    page.getByRole("link", { name: "Download PNG", exact: true }),
  );
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([812, 1218]);
  const zip = unzipSync(
    await download(page, page.getByRole("link", { name: /PDF \+ PNG/ })),
  );
  expect(Object.keys(zip)).toHaveLength(2);
  expect(Object.keys(zip).some((x) => x.endsWith(".pdf"))).toBe(true);
  await page.getByLabel("PNG resolution").selectOption("300");
  await ready(page);
  const high = await download(
    page,
    page.getByRole("link", { name: "Download PNG", exact: true }),
  );
  expect([high.readUInt32BE(16), high.readUInt32BE(20)]).toEqual([1200, 1800]);
  expect(errors).toEqual([]);
});

test("renames every downloaded asset and archive contents", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample label" }).click();
  await ready(page);
  await page.getByLabel("File name", { exact: true }).fill("Order 204.pdf");
  for (const [label, expected] of [
    ["Download PDF", "Order 204.pdf"],
    ["Download PNG", "Order 204.png"],
  ]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("link", { name: label, exact: true }).click();
    expect((await pending).suggestedFilename()).toBe(expected);
  }
  const archiveBytes = await page
    .getByRole("link", { name: /PDF \+ PNG/ })
    .evaluate(async (el) =>
      Array.from(
        new Uint8Array(
          await (await fetch((el as HTMLAnchorElement).href)).arrayBuffer(),
        ),
      ),
    );
  expect(Object.keys(unzipSync(new Uint8Array(archiveBytes)))).toEqual([
    "Order 204.pdf",
    "Order 204-001-203dpi.png",
  ]);
  const pending = page.waitForEvent("download");
  await page.getByRole("link", { name: /PDF \+ PNG/ }).click();
  const bundle = await pending;
  expect(bundle.suggestedFilename()).toBe("Order 204.zip");
  expect(
    Object.keys(unzipSync(await readFile((await bundle.path())!))),
  ).toEqual(["Order 204.pdf", "Order 204-001-203dpi.png"]);
  await page.getByLabel("PNG resolution").selectOption("300");
  await ready(page);
  await expect(page.getByLabel("File name", { exact: true })).toHaveValue(
    "Order 204",
  );
  await page.getByLabel("File name", { exact: true }).fill(" /:*? ");
  await page.getByLabel("File name", { exact: true }).press("Tab");
  await expect(
    page.getByRole("link", { name: "Download PDF", exact: true }),
  ).toHaveAttribute("download", "label.pdf");
});

test("opens a real PDF crop preview, supports movement and requires review acknowledgement", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles(fixture("native"));
  await ready(page);
  await page.getByRole("button", { name: "Adjust crop" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const crop = dialog.getByRole("button", {
    name: "Move crop for label 1",
    exact: true,
  });
  await expect(crop).toBeVisible();
  if (isMobile) {
    await crop.tap();
    await dialog.getByRole("button", { name: "Rotate label right" }).tap();
  } else {
    await crop.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowLeft");
  }
  await dialog.getByRole("button", { name: "Use these crops" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: /One last look\./i }),
  ).toBeVisible({ timeout: 90000 });
  const pdf = page.locator('a[download$=".pdf"]');
  await expect(pdf).toHaveAttribute("aria-disabled", "true");
  await expect(pdf).not.toHaveAttribute("href", /^blob:/);
  await page.getByLabel("I’ve checked the crop and all label details.").check();
  await expect(pdf).toHaveAttribute("href", /^blob:/);
  await checkPdf(await download(page, pdf));
});

test("accepts a signed PDF link, reports a link error and ignores a cancelled fetch", async ({
  page,
}) => {
  const bytes = await readFile(fixture("native"));
  let mode = "success";
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/api/pdf", async (route) => {
    expect(route.request().postDataJSON().url).toBe(
      "https://example.com/label.pdf?sig=a%2Fb%2Bc",
    );
    if (mode === "slow") await gate;
    try {
      await route.fulfill(
        mode === "error"
          ? {
              status: 422,
              contentType: "application/json",
              body: JSON.stringify({
                message: "That link has expired. Upload the PDF instead.",
              }),
            }
          : { status: 200, contentType: "application/pdf", body: bytes },
      );
    } catch {
      /* A cancelled request has no consumer. */
    }
  });
  async function submit() {
    await page.getByRole("tab", { name: "Paste a link" }).click();
    await page
      .getByLabel("Your direct PDF link")
      .fill("https://example.com/label.pdf?sig=a%2Fb%2Bc");
    await page.getByRole("button", { name: "Format link" }).click();
  }
  await page.goto("/");
  await submit();
  await ready(page);
  await page.getByRole("button", { name: "Start a new PDF" }).click();
  mode = "error";
  await submit();
  await expect(page.getByRole("alert")).toContainText("expired");
  mode = "slow";
  await submit();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  release();
  await page.getByRole("button", { name: "Try a sample label" }).click();
  await ready(page);
  await expect(page.locator(".source-name")).toHaveText("sample-label.pdf");
});

test("preserves both labels in a multi-page PDF and packages every image", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles(fixture("multipage"));
  await ready(page);
  await expect(
    page.getByAltText("Formatted shipping label 1 of 2"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next label", exact: true }).click();
  await expect(
    page.getByAltText("Formatted shipping label 2 of 2"),
  ).toBeVisible();
  await checkPdf(
    await download(
      page,
      page.getByRole("link", { name: "Download PDF", exact: true }),
    ),
    2,
  );
  const zip = unzipSync(
    await download(page, page.getByRole("link", { name: /PDF \+ PNG/ })),
  );
  expect(Object.keys(zip).filter((x) => x.endsWith(".png"))).toHaveLength(2);
  expect(Object.keys(zip)).toHaveLength(3);
});

test("recovers from a file that is not a PDF", async ({ page }) => {
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "broken.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("<html>not a PDF</html>"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "does not look like a PDF",
  );
  await page.locator("input[type=file]").setInputFiles(fixture("native"));
  await ready(page);
});

test("converts with reduced motion and without WebGL", async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    Object.defineProperty(window, "WebGL2RenderingContext", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Drop your PDF here/ }),
  ).toBeVisible();
  await expect(page.locator(".scene-fallback")).toBeVisible();
  const fallback = await page.locator(".demo-static-label").boundingBox();
  const scene = await page.locator(".hero-scene").boundingBox();
  expect(fallback!.height).toBeLessThanOrEqual(scene!.height);
  expect(fallback!.y + fallback!.height).toBeLessThanOrEqual(
    scene!.y + scene!.height + 1,
  );
  await expect(page.locator(".three-canvas")).toHaveCount(0);
  await page.getByRole("button", { name: "Try a sample label" }).click();
  await ready(page);
});

test("has no horizontal overflow from small phones to large desktops, including enlarged text", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "The desktop browser matrix covers fluid viewport resizing; phone projects cover actual touch contexts.",
  );
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  for (const width of [
    320, 360, 390, 430, 568, 640, 768, 820, 1024, 1280, 1440, 1920, 2560,
  ]) {
    await page.setViewportSize({ width, height: width === 568 ? 320 : 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Page overflow at ${width}px`,
    ).toBe(true);
    const h1 = await page.locator("h1").boundingBox();
    expect(h1!.x + h1!.width).toBeLessThanOrEqual(width + 1);
    const box = await page
      .getByRole("button", { name: /Drop your PDF here/ })
      .boundingBox();
    expect(box!.width).toBeGreaterThan(200);
  }
  for (const width of [320, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(
      () => (document.documentElement.style.fontSize = "200%"),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Large-text overflow at ${width}px`,
    ).toBe(true);
  }
});

test("passes accessibility checks and preserves visible keyboard focus", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  if (!isMobile) {
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to label formatter" }),
    ).toBeFocused();
  }
  const initial = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(initial.violations).toEqual([]);
  await page.getByRole("button", { name: "Try a sample label" }).click();
  await ready(page);
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});

test("keeps download-panel focus outlines inside the clipped pane", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a sample label" }).click();
  await ready(page);
  await page.getByLabel("File name", { exact: true }).click();
  await page.keyboard.press("Tab");
  const clearance = await page.getByLabel("PNG resolution").evaluate((el) => {
    const box = el.getBoundingClientRect();
    const pane = el.closest(".result-actions")!.getBoundingClientRect();
    const css = getComputedStyle(el);
    const extent = parseFloat(css.outlineWidth) + parseFloat(css.outlineOffset);
    return {
      focused: el.matches(":focus-visible"),
        arrowSpace: parseFloat(css.paddingRight),
      right: pane.right - box.right - extent,
    };
  });
  expect(clearance.focused).toBe(true);
  expect(clearance.right).toBeGreaterThanOrEqual(0);
  expect(clearance.arrowSpace).toBeGreaterThanOrEqual(40);
});

test("the actual supplied private PDF converts through the website", async ({
  page,
}) => {
  test.skip(
    !process.env.CROPOTTER_PRIVATE_PDF,
    "Private acceptance fixture is intentionally not checked in.",
  );
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles(process.env.CROPOTTER_PRIVATE_PDF!);
  await ready(page);
  await checkPdf(
    await download(
      page,
      page.getByRole("link", { name: "Download PDF", exact: true }),
    ),
  );
});
