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
  await page
    .locator("input[type=file]")
    .setInputFiles({
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
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() =>
    Object.defineProperty(window, "WebGL2RenderingContext", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/");
  await expect(page.locator(".scene-fallback")).toBeVisible();
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
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to label formatter" }),
  ).toBeFocused();
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
