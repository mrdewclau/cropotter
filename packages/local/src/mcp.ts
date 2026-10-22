#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import { parseArgs } from "node:util";
import { LocalService, convertSchema, safeError, VERSION } from "./service.js";
console.log = console.warn = console.info = () => {};
if (Number(process.versions.node.split(".")[0]) < 24) {
  process.stderr.write("CropOtter requires Node.js 24 or newer.\n");
  process.exit(1);
}
let workspace: string | undefined;
try {
  const { values } = parseArgs({
    options: { workspace: { type: "string" } },
    strict: true,
    allowPositionals: false,
  });
  workspace = values.workspace;
} catch {
  process.stderr.write("Use cropotter-mcp [--workspace /absolute/folder].\n");
  process.exit(1);
}
const handle = serveStdio(
  () => {
    const service = new LocalService({ workspace }),
      server = new McpServer({ name: "cropotter-local", version: VERSION });
    async function tool(work: () => Promise<object>) {
      try {
        const result = await work();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          structuredContent: result,
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                status: "error",
                error: safeError(error),
              }),
            },
          ],
        };
      }
    }
    server.registerTool(
      "cropotter_analyze",
      {
        title: "Analyze shipping label PDF",
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        description:
          "Analyze a local PDF (25 MiB maximum). Returns crop candidates and review warnings without document text or barcode values. No URL fetching.",
        inputSchema: z.object({ input: z.string().min(1).max(4096) }).strict(),
      },
      async (args, extra) =>
        tool(() => service.analyze(args.input, extra.mcpReq.signal)),
    );
    server.registerTool(
      "cropotter_convert",
      {
        title: "Convert to 4 × 6 label files",
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        },
        description:
          "Convert a local PDF to 4 × 6 PDF/PNG/ZIP files in the chosen local output directory. Never overwrites files. Uncertain/manual crops require deliberate acknowledgeReview after inspecting analysis. Returns local paths and instance-scoped artifact resources; host attachments vary.",
        inputSchema: convertSchema,
      },
      async (args, extra) =>
        tool(() => service.convert(args, extra.mcpReq.signal)),
    );
    server.registerResource(
      "cropotter-artifact",
      new ResourceTemplate("cropotter://artifacts/{id}/{name}", {
        list: undefined,
      }),
      {
        description:
          "Read only artifacts generated during this server instance; no arbitrary local files.",
      },
      async (uri) => ({
        contents: [{ uri: uri.href, ...service.readResource(uri.href) }],
      }),
    );
    return server;
  },
  {
    onerror: () =>
      process.stderr.write(
        "CropOtter protocol error. Check the client request.\n",
      ),
  },
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void handle.close();
  });
