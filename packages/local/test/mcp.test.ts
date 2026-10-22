import { fileURLToPath } from "node:url";
import { it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { mkdtemp, realpath, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";

it.each(["legacy", "auto"] as const)(
  "real SDK %s stdio client converts synthetic PDF and reads only generated instance resources",
  async (mode) => {
    const dir = await mkdtemp(join(await realpath(tmpdir()), "cropotter-mcp-"));
    const client = new Client(
        { name: "cropotter-integration", version: "1.0.0" },
        { versionNegotiation: { mode } },
      ),
      transport = new StdioClientTransport({
        command: process.execPath,
        args: [fileURLToPath(new URL("../dist/mcp.mjs", import.meta.url))],
        stderr: "pipe",
      });
    let stderr = "";
    transport.stderr?.on("data", (chunk) => (stderr += chunk.toString()));
    try {
      await client.connect(transport);
      expect(client.getNegotiatedProtocolVersion()).toBe(
        mode === "auto" ? "2026-07-28" : "2025-11-25",
      );
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name)).toEqual([
        "cropotter_analyze",
        "cropotter_convert",
      ]);
      const analysis = await client.callTool({
        name: "cropotter_analyze",
        arguments: {
          input: fileURLToPath(
            new URL(
              "../../../apps/web/public/sample-label.pdf",
              import.meta.url,
            ),
          ),
        },
      });
      expect(analysis.isError).not.toBe(true);
      expect(
        (analysis.structuredContent as { analysis: { status: string } })
          .analysis.status,
      ).toBe("ready");
      const result = await client.callTool({
        name: "cropotter_convert",
        arguments: {
          input: fileURLToPath(
            new URL(
              "../../../apps/web/public/sample-label.pdf",
              import.meta.url,
            ),
          ),
          out: join(dir, "output"),
          formats: ["pdf", "png", "zip"],
          name: "agent",
          dpi: 300,
        },
      });
      expect(result.isError, JSON.stringify(result)).not.toBe(true);
      const data = result.structuredContent as {
        status: string;
        artifacts: { uri: string; path: string; sha256: string }[];
      };
      expect(data.status).toBe("ready");
      expect(data.artifacts).toHaveLength(4);
      const artifact = data.artifacts[0];
      const resource = await client.readResource({ uri: artifact.uri });
      const contents = resource.contents[0];
      expect("blob" in contents).toBe(true);
      const bytes = Buffer.from((contents as { blob: string }).blob, "base64");
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        artifact.sha256,
      );
      const pdf = await PDFDocument.load(bytes);
      expect(pdf.getPage(0).getSize()).toEqual({ width: 288, height: 432 });
      // The output file is caller-owned. Replacing it must never grant a read of replacement data.
      await writeFile(artifact.path, "replaced-file-private-content");
      const stillOriginal = await client.readResource({ uri: artifact.uri });
      expect(
        Buffer.from(
          (stillOriginal.contents[0] as { blob: string }).blob,
          "base64",
        ),
      ).toEqual(bytes);
      await expect(
        client.readResource({ uri: "file:///etc/passwd" }),
      ).rejects.toThrow();
      await expect(
        client.readResource({
          uri: "cropotter://artifacts/unregistered/private.pdf",
        }),
      ).rejects.toThrow();
      const second = new Client({ name: "other-instance", version: "1.0.0" });
      try {
        await second.connect(
          new StdioClientTransport({
            command: process.execPath,
            args: [fileURLToPath(new URL("../dist/mcp.mjs", import.meta.url))],
            stderr: "pipe",
          }),
        );
        await expect(
          second.readResource({ uri: artifact.uri }),
        ).rejects.toThrow();
      } finally {
        await second.close();
      }
      expect(stderr).not.toContain("CROPSHIP");
      expect(await readFile(artifact.path, "utf8")).toBe(
        "replaced-file-private-content",
      );
    } finally {
      await client.close();
      await rm(dir, { recursive: true, force: true });
    }
  },
);
