import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function inView(locator: Locator, width: number, height: number) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(height + 1);
}

test("agent downloads keep the installer and review status visible without scrolling", async ({
  page,
}) => {
  for (const [width, height] of [
    [1280, 720],
    [320, 480],
    [375, 667],
    [568, 320],
    [844, 390],
    [701, 550],
    [2560, 1440],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/agents/#claude-desktop");
    await page.evaluate(() => document.fonts.ready);
    const panel = page.getByRole("tabpanel", {
      name: "Claude Desktop",
      exact: true,
    });
    await expect(panel).toBeVisible();
    expect(
      await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
      ]),
    ).toEqual([width, height]);
    expect(
      await panel.evaluate((el) => ({
        clippedX: el.scrollWidth > el.clientWidth + 1,
        clippedY: el.scrollHeight > el.clientHeight + 1,
      })),
    ).toEqual({ clippedX: false, clippedY: false });
    const download = panel.getByRole("link", {
      name: "Download for Mac",
      exact: true,
    });
    await inView(download, width, height);
    await expect(download).toHaveAttribute(
      "href",
      "https://github.com/mrdewclau/cropotter/releases/download/claude-desktop-v0.1.2/cropotter-0.1.2-macos-universal.mcpb",
    );
    await inView(
      page.getByRole("note", { name: "Directory status" }),
      width,
      height,
    );
    await inView(
      page.getByRole("link", { name: "Format a PDF" }),
      width,
      height,
    );
    await page.getByRole("tab", { name: "Other agents", exact: true }).click();
    const otherPanel = page.getByRole("tabpanel", {
      name: "Other agents",
      exact: true,
    });
    expect(
      await otherPanel.evaluate((el) => ({
        clippedX: el.scrollWidth > el.clientWidth + 1,
        clippedY: el.scrollHeight > el.clientHeight + 1,
      })),
    ).toEqual({ clippedX: false, clippedY: false });
    for (const name of [
      "Open formatter",
      "Download MCP package",
      "Download Agent Skill",
    ])
      await inView(
        otherPanel.getByRole("link", { name, exact: true }),
        width,
        height,
      );
    await page
      .getByRole("tab", { name: "Claude Desktop", exact: true })
      .click();
  }
  for (const [width, height] of [
    [1280, 720],
    [320, 568],
    [375, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    for (const name of ["Claude Desktop", "Other agents"]) {
      await page.getByRole("tab", { name, exact: true }).click();
      const panel = page.getByRole("tabpanel", { name, exact: true });
      expect(
        await panel.evaluate(
          (el) =>
            el.scrollHeight <= el.clientHeight + 1 &&
            el.scrollWidth <= el.clientWidth + 1,
        ),
      ).toBe(true);
      const panelBox = await panel.boundingBox();
      const statusBox = await page.locator(".workspace-status").boundingBox();
      expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(
        statusBox!.y + 1,
      );
      for (const link of await panel.getByRole("link").all())
        await inView(link, width, height);
    }
  }
});

test("agent download views and on-demand instructions work by keyboard without leaving the shell", async ({
  page,
}) => {
  await page.goto("/agents/#claude-desktop");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const other = page.getByRole("tab", { name: "Other agents", exact: true });
  await other.click();
  await expect(other).toHaveAttribute("aria-selected", "true");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const panel = page.getByRole("tabpanel", {
    name: "Other agents",
    exact: true,
  });
  await expect(
    panel.getByRole("link", { name: "Download MCP package" }),
  ).toHaveAttribute("href", /cropotter-local-\d+\.\d+\.\d+\.tgz$/);
  await expect(
    panel.getByRole("link", { name: "Download Agent Skill" }),
  ).toHaveAttribute("href", /cropotter-skill-\d+\.\d+\.\d+\.zip$/);
  await page.getByRole("button", { name: "Advanced setup" }).click();
  await expect(
    page.getByRole("dialog", { name: "Advanced agent setup" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Advanced setup" }),
  ).toBeFocused();
  await other.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "ChatGPT", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "ChatGPT", exact: true }).press("Home");
  await expect(
    page.getByRole("tab", { name: "Claude Desktop", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const install = page.getByRole("button", {
    name: "How to install",
    exact: true,
  });
  await install.click();
  const dialog = page.getByRole("dialog", {
    name: "Install CropOtter in Claude",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Label workspace");
  await expect(dialog).toContainText("unsigned");
  await page.keyboard.press("Escape");
  await expect(install).toBeFocused();
});

test("ChatGPT download keeps preview limits and essential controls visible across the shell", async ({
  page,
}) => {
  for (const [width, height, enlarged] of [
    [1280, 720, false],
    [320, 480, false],
    [375, 667, false],
    [568, 320, false],
    [844, 390, false],
    [701, 550, false],
    [2560, 1440, false],
    [1280, 720, true],
    [320, 568, true],
    [375, 667, true],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/agents/#chatgpt");
    await page.evaluate(async (enlarged) => {
      if (enlarged) document.documentElement.style.fontSize = "200%";
      await document.fonts.ready;
    }, enlarged);
    const tab = page.getByRole("tab", { name: "ChatGPT", exact: true });
    await expect(tab).toHaveAttribute("aria-selected", "true");
    const panel = page.getByRole("tabpanel", { name: "ChatGPT", exact: true });
    await expect(panel).toBeVisible();
    expect(
      await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.scrollHeight,
      ]),
    ).toEqual([width, height]);
    expect(
      await panel.evaluate((el) => ({
        clippedX: el.scrollWidth > el.clientWidth + 1,
        clippedY: el.scrollHeight > el.clientHeight + 1,
      })),
    ).toEqual({ clippedX: false, clippedY: false });
    for (const clientTab of await page.getByRole("tab").all())
      await inView(clientTab, width, height);
    const download = panel.getByRole("link", {
      name: "Download plugin ZIP",
      exact: true,
    });
    await inView(download, width, height);
    await expect(download).toHaveAttribute(
      "href",
      "https://github.com/mrdewclau/cropotter/releases/download/chatgpt-plugin-v0.1.0/cropotter-chatgpt-0.1.0.zip",
    );
    const note = page.getByRole("note", { name: "Directory status" });
    await inView(note, width, height);
    await expect(note).toContainText("Not submitted");
    const panelBox = await panel.boundingBox();
    const statusBox = await page.locator(".workspace-status").boundingBox();
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(
      statusBox!.y + 1,
    );
    const install = panel.getByRole("button", { name: "How to install" });
    await inView(install, width, height);
    await install.click();
    const dialog = page.getByRole("dialog", {
      name: "Install CropOtter in ChatGPT",
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Node 24");
    await expect(dialog).toContainText("local marketplace");
    await expect(dialog).toContainText("James Boyd");
    await inView(
      dialog.getByRole("button", { name: "Close ChatGPT installation guide" }),
      width,
      height,
    );
    await page.keyboard.press("Escape");
    await expect(install).toBeFocused();
  }
});

test("three agent tabs preserve keyboard, hash and dialog focus navigation", async ({
  page,
}) => {
  await page.goto("/agents/#chatgpt");
  const chatgpt = page.getByRole("tab", { name: "ChatGPT", exact: true });
  await expect(chatgpt).toHaveAttribute("aria-selected", "true");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await chatgpt.focus();
  await chatgpt.press("ArrowLeft");
  const claude = page.getByRole("tab", { name: "Claude Desktop", exact: true });
  await expect(claude).toBeFocused();
  await expect(page).toHaveURL(/#claude-desktop$/);
  await claude.press("ArrowRight");
  await expect(chatgpt).toBeFocused();
  await expect(page).toHaveURL(/#chatgpt$/);
  await page.getByRole("button", { name: "How to install" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Install CropOtter in ChatGPT",
  });
  await expect(dialog).toBeVisible();
  await page.evaluate(() => {
    location.hash = "other-agents";
  });
  await expect(dialog).not.toBeVisible();
  const other = page.getByRole("tab", { name: "Other agents", exact: true });
  await expect(other).toHaveAttribute("aria-selected", "true");
  await expect(other).toBeFocused();
  await other.press("Home");
  await expect(claude).toBeFocused();
  await claude.press("End");
  await expect(other).toBeFocused();
  await other.press("ArrowLeft");
  await expect(chatgpt).toBeFocused();
  await page
    .getByRole("button", { name: "Data handling", exact: true })
    .click();
  const privacy = page.getByRole("dialog", { name: "ChatGPT data handling" });
  await expect(privacy).toBeVisible();
  await expect(privacy).toContainText("OpenAI");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Data handling", exact: true }),
  ).toBeFocused();
});

test("formatter navigation and client discovery remain inside the viewport with enlarged text", async ({
  page,
}) => {
  for (const [width, height] of [
    [320, 900],
    [375, 667],
    [1280, 720],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(async () => {
      document.documentElement.style.fontSize = "200%";
      await document.fonts.ready;
    });
    for (const locator of [
      page.locator(".site-header"),
      page.getByRole("link", { name: "CropOtter home" }),
      page.getByRole("button", { name: "Help", exact: true }),
      page.getByRole("button", { name: "Privacy", exact: true }),
      page.locator(".app-status"),
      page.getByRole("link", { name: "Claude + ChatGPT" }),
    ])
      await inView(locator, width, height);
  }
});

test("closing an instruction dialog does not steal a newer navigation focus", async ({
  page,
}) => {
  await page.goto("/agents/#other-agents");
  const other = page.getByRole("tab", { name: "Other agents", exact: true });
  await page.getByRole("button", { name: "Advanced setup" }).click();
  await page.getByRole("dialog", { name: "Advanced agent setup" }).evaluate(
    (element: HTMLDialogElement) =>
      new Promise<void>((resolve) => {
        element.addEventListener("close", () => resolve(), { once: true });
        element.close();
        document.getElementById("other-tab")!.focus();
      }),
  );
  expect(await other.evaluate((el) => document.activeElement === el)).toBe(
    true,
  );
  await other.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "ChatGPT", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});
