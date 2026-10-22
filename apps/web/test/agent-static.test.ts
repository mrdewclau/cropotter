import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.js";

it("serves the agent guide and binary downloads with the correct types without changing ordinary routes", async () => {
  const root = await mkdtemp(join(tmpdir(), "cropotter-static-"));
  await mkdir(join(root, "agents"));
  await writeFile(join(root, "agents/index.html"), "<h1>Agent tools</h1>");
  await writeFile(join(root, "agents/guide.md"), "# Local conversion");
  await writeFile(join(root, "agents/manifest.json"), "{}");
  await writeFile(
    join(root, "agents/package.tgz"),
    new Uint8Array([31, 139, 8]),
  );
  await writeFile(join(root, "agents/skill.zip"), "PK");
  const server = createApp({ clientDirectory: root });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    for (const path of ["/agents", "/agents/"]) {
      const response = await fetch(base + path);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
    }
    for (const [file, type] of [
      ["guide.md", "text/markdown"],
      ["package.tgz", "application/gzip"],
      ["skill.zip", "application/zip"],
    ]) {
      const response = await fetch(`${base}/agents/${file}`);
      expect(response.headers.get("content-type")).toContain(type);
    }
    expect(
      (await fetch(`${base}/agents/manifest.json`)).headers.get(
        "cache-control",
      ),
    ).toBe("no-cache");
    expect((await fetch(`${base}/missing/`)).status).toBe(404);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(root, { recursive: true, force: true });
  }
});
