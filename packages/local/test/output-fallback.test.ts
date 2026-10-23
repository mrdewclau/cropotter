import { vi, it, expect } from "vitest";
import {
  mkdtemp,
  realpath,
  rm,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { LocalService } from "../src/service.js";
const failures = vi.hoisted(() => ({ manifestWrite: false }));

// CI cannot mount ExFAT. Only its unsupported hard-link operation is simulated;
// file creation, writing, syncing, validation, no-clobber and cleanup use real I/O.
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    link: vi.fn(async () => {
      throw Object.assign(new Error("unsupported hard links"), {
        code: "ENOTSUP",
      });
    }),
    open: async (...args: Parameters<typeof actual.open>) => {
      const handle = await actual.open(...args);
      if (
        failures.manifestWrite &&
        String(args[0]).endsWith("/label-manifest.json")
      ) {
        const write = handle.writeFile.bind(handle);
        Object.defineProperty(handle, "writeFile", {
          value: async () => {
            await write("partial manifest");
            throw Object.assign(new Error("disk full"), { code: "ENOSPC" });
          },
        });
      }
      return handle;
    },
  };
});
const input = fileURLToPath(
  new URL("../../../apps/web/public/sample-label.pdf", import.meta.url),
);

it("converts on a filesystem without hard links and never overwrites existing output", async () => {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "cropotter-exfat-"));
  try {
    const out = join(dir, "new folder"),
      service = new LocalService();
    const result = await service.convert({
      input,
      out,
      formats: ["pdf", "png", "zip"],
      name: "File with spaces",
      dpi: 300,
    });
    expect(result.status).toBe("ready");
    const pdfBytes = await readFile(join(out, "File with spaces.pdf"));
    expect((await PDFDocument.load(pdfBytes)).getPage(0).getSize()).toEqual({
      width: 288,
      height: 432,
    });
    expect(
      (await readdir(out)).some((name) => name.startsWith(".cropotter-")),
    ).toBe(false);
    await expect(
      service.convert({
        input,
        out,
        formats: ["pdf"],
        name: "File with spaces",
      }),
    ).rejects.toMatchObject({ code: "OUTPUT_EXISTS" });
    expect(await readFile(join(out, "File with spaces.pdf"))).toEqual(pdfBytes);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("publishes nothing when a later filename already exists", async () => {
  const dir = await mkdtemp(
    join(await realpath(tmpdir()), "cropotter-exfat-rollback-"),
  );
  try {
    await writeFile(join(dir, "label-manifest.json"), "preserve existing");
    await expect(
      new LocalService().convert({ input, out: dir, formats: ["pdf", "png"] }),
    ).rejects.toMatchObject({ code: "OUTPUT_EXISTS" });
    expect(await readdir(dir)).toEqual(["label-manifest.json"]);
    expect(await readFile(join(dir, "label-manifest.json"), "utf8")).toBe(
      "preserve existing",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("rolls back partial and complete fallback outputs after a write failure", async () => {
  const dir = await mkdtemp(
    join(await realpath(tmpdir()), "cropotter-exfat-partial-"),
  );
  try {
    failures.manifestWrite = true;
    await expect(
      new LocalService().convert({ input, out: dir, formats: ["pdf", "png"] }),
    ).rejects.toMatchObject({ code: "ENOSPC" });
    expect(await readdir(dir)).toEqual([]);
  } finally {
    failures.manifestWrite = false;
    await rm(dir, { recursive: true, force: true });
  }
});
