import { fileURLToPath } from "node:url";
import { it, expect } from "vitest";
import {
  mkdtemp,
  realpath,
  rm,
  writeFile,
  readdir,
  mkdir,
  symlink,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { LocalService } from "../src/service.js";
const input = fileURLToPath(
  new URL("../../../apps/web/public/sample-label.pdf", import.meta.url),
);
it("restricted service rejects outside inputs, sibling-prefix outputs and symlinks before processing", async () => {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "cropotter-scope-"));
  try {
    const workspace = join(dir, "allowed");
    await mkdir(workspace);
    const localInput = join(workspace, "sample.pdf");
    await copyFile(input, localInput);
    const service = new LocalService({ workspace });
    await expect(service.analyze(input)).rejects.toMatchObject({
      code: "OUTSIDE_WORKSPACE",
    });
    await expect(
      service.convert({
        input: localInput,
        out: join(dir, "allowed-sibling", "out"),
      }),
    ).rejects.toMatchObject({ code: "OUTSIDE_WORKSPACE" });
    await symlink(input, join(workspace, "alias.pdf"));
    await expect(
      service.analyze(join(workspace, "alias.pdf")),
    ).rejects.toMatchObject({ code: "UNSAFE_PATH" });
    expect(await readdir(dir)).toEqual(["allowed"]);
    expect((await service.analyze(localInput)).analysis.status).toBe("ready");
    const result = await service.convert({
      input: localInput,
      out: join(workspace, "output"),
      formats: ["pdf"],
    });
    expect(result.status).toBe("ready");
    expect(await readdir(join(workspace, "output"))).toEqual([
      "label-manifest.json",
      "label.pdf",
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("restricted service refuses a missing or symlink workspace without expanding access", async () => {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "cropotter-root-"));
  try {
    await expect(
      new LocalService({ workspace: join(dir, "missing") }).analyze(input),
    ).rejects.toMatchObject({ code: "INVALID_WORKSPACE" });
    await symlink(dir, join(dir, "alias"));
    await expect(
      new LocalService({ workspace: join(dir, "alias") }).analyze(input),
    ).rejects.toMatchObject({ code: "UNSAFE_PATH" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("manual selections require acknowledgement even if barcode validation is ready", async () => {
  const dir = await mkdtemp(
    join(await realpath(tmpdir()), "cropotter-manual-"),
  );
  try {
    const service = new LocalService();
    const result = await service.convert({
      input,
      out: join(dir, "out"),
      selections: [
        { pageIndex: 0, region: { x: 36, y: 90, width: 288, height: 432 } },
      ],
    });
    expect(result.status).toBe("review_required");
    expect("analysis" in result && result.analysis?.pages.length).toBe(1);
    expect(result.artifacts).toEqual([]);
    expect(await readdir(dir)).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("cancelled queued conversion never writes files and does not block the next job", async () => {
  const dir = await mkdtemp(
    join(await realpath(tmpdir()), "cropotter-cancel-"),
  );
  try {
    const service = new LocalService(),
      abort = new AbortController();
    const first = service.analyze(input);
    const cancelled = service.convert(
      { input, out: join(dir, "out") },
      abort.signal,
    );
    const rejection = expect(cancelled).rejects.toMatchObject({
      code: "ABORTED",
    });
    abort.abort();
    await Promise.all([first, rejection]);
    expect(await readdir(dir)).toEqual([]);
    expect((await service.analyze(input)).status).toBe("analyzed");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it("sanitizes traversal names and refuses symlink target files without publishing other outputs", async () => {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "cropotter-path-"));
  try {
    const service = new LocalService();
    const result = await service.convert({
      input,
      out: join(dir, "safe"),
      name: "../../Escape.pdf",
      formats: ["pdf"],
    });
    expect(result.status).toBe("ready");
    expect(
      result.artifacts.every(
        (a) => !a.name.includes("/") && !a.name.startsWith("."),
      ),
    ).toBe(true);
    const out = join(dir, "blocked");
    await mkdir(out);
    const target = join(dir, "untouched");
    await writeFile(target, "preserve");
    await symlink(target, join(out, "label-manifest.json"));
    await expect(
      service.convert({ input, out, formats: ["pdf", "png"] }),
    ).rejects.toMatchObject({ code: "OUTPUT_EXISTS" });
    expect(await readdir(out)).toEqual(["label-manifest.json"]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
