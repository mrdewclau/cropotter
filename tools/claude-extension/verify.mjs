import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";

if (process.platform !== "darwin")
  throw new Error("Run actual macOS bundle acceptance on macOS.");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const release = join(root, "output/claude-release");
const artifact = JSON.parse(
  await readFile(join(release, "extension-artifact.json"), "utf8"),
);
const checksum = (bytes) => createHash("sha256").update(bytes).digest("hex");
assert.equal(
  checksum(await readFile(join(release, artifact.filename))),
  artifact.sha256,
);
const temp = await mkdtemp(
  join(await realpath(tmpdir()), "cropotter-extension-"),
);
const evidence = [];
try {
  const installed = join(temp, "extension");
  execFileSync("/usr/bin/unzip", [
    "-q",
    join(release, artifact.filename),
    "-d",
    installed,
  ]);
  const manifest = JSON.parse(
    await readFile(join(installed, "manifest.json"), "utf8"),
  );
  assert.equal(manifest.server.type, "binary");
  assert.deepEqual(manifest.compatibility.platforms, ["darwin"]);
  const provenance = JSON.parse(
    await readFile(join(installed, "build-provenance.json"), "utf8"),
  );
  for (const runtime of provenance.runtimeDownloadsAtBuildOnly) {
    const binary = join(installed, "runtime", runtime.platform, "node");
    assert.equal(checksum(await readFile(binary)), runtime.binarySha256);
    assert.ok(
      (await stat(binary)).mode & 0o111,
      "Runtime executable mode must survive extraction",
    );
    assert.ok(
      (await readFile(join(installed, "runtime", runtime.platform, "LICENSE")))
        .length > 100,
    );
  }
  const workspace = join(temp, "Label workspace");
  await mkdir(workspace);
  const input = join(workspace, "synthetic.pdf");
  await copyFile(join(root, "apps/web/public/sample-label.pdf"), input);
  const outside = join(temp, "outside.pdf");
  await copyFile(input, outside);
  for (const architecture of ["arm64", "x86_64"]) {
    const client = new Client(
      { name: "cropotter-mcpb-acceptance", version: "1.0.0" },
      { versionNegotiation: { mode: "legacy" } },
    );
    const transport = new StdioClientTransport({
      command: "/usr/bin/sandbox-exec",
      args: [
        "-p",
        "(version 1)(allow default)(deny network*)",
        "/usr/bin/arch",
        `-${architecture}`,
        "/bin/sh",
        join(installed, "server/launch.sh"),
        workspace,
      ],
      cwd: temp,
      env: {
        PATH: "/nonexistent",
        NODE_OPTIONS: "--require /not-a-real-module",
        NODE_PATH: "/not-a-module-path",
      },
      stderr: "pipe",
    });
    let stderr = "";
    transport.stderr?.on("data", (chunk) => (stderr += chunk.toString()));
    try {
      await client.connect(transport);
      const { tools } = await client.listTools();
      assert.deepEqual(
        tools.map((tool) => tool.name),
        ["cropotter_analyze", "cropotter_convert"],
      );
      assert.equal(tools[0].annotations.readOnlyHint, true);
      assert.equal(tools[1].annotations.destructiveHint, false);
      const denied = await client.callTool({
        name: "cropotter_analyze",
        arguments: { input: outside },
      });
      assert.equal(denied.isError, true);
      assert.equal(
        JSON.parse(denied.content[0].text).error.code,
        "OUTSIDE_WORKSPACE",
      );
      const analyze = await client.callTool({
        name: "cropotter_analyze",
        arguments: { input },
      });
      assert.equal(analyze.structuredContent.analysis.status, "ready");
      const abort = new AbortController();
      const cancelOut = join(workspace, `cancelled-${architecture}`);
      let markSent;
      const sent = new Promise((resolveSent) => {
        markSent = resolveSent;
      });
      const send = transport.send.bind(transport);
      transport.send = async (message) => {
        await send(message);
        if (
          message.method === "tools/call" &&
          message.params?.arguments?.out === cancelOut
        )
          markSent();
      };
      const busy = client.callTool({
        name: "cropotter_analyze",
        arguments: { input },
      });
      const cancelled = client.callTool(
        { name: "cropotter_convert", arguments: { input, out: cancelOut } },
        { signal: abort.signal },
      );
      const rejected = assert.rejects(cancelled);
      await sent;
      abort.abort();
      await Promise.all([busy, rejected]);
      await client.callTool({
        name: "cropotter_analyze",
        arguments: { input },
      });
      assert.ok(
        !(await readdir(workspace)).includes(`cancelled-${architecture}`),
      );
      transport.send = send;
      const manual = await client.callTool({
        name: "cropotter_convert",
        arguments: {
          input,
          out: join(workspace, `review-${architecture}`),
          selections: [{ pageIndex: 0 }],
        },
      });
      assert.equal(manual.structuredContent.status, "review_required");
      assert.deepEqual(manual.structuredContent.artifacts, []);
      assert.ok(!(await readdir(workspace)).includes(`review-${architecture}`));
      const options = {
        input,
        out: join(workspace, `output-${architecture}`),
        formats: ["pdf", "png", "zip"],
        dpi: 300,
        name: "Desktop test",
      };
      const result = await client.callTool({
        name: "cropotter_convert",
        arguments: options,
      });
      assert.notEqual(result.isError, true, JSON.stringify(result));
      const data = result.structuredContent;
      assert.equal(data.status, "ready");
      assert.equal(data.artifacts.length, 4);
      for (const file of data.artifacts)
        assert.equal(checksum(await readFile(file.path)), file.sha256);
      const pdfArtifact = data.artifacts.find(
        (file) => file.mimeType === "application/pdf",
      );
      const pdfBytes = await readFile(pdfArtifact.path);
      const pdf = await PDFDocument.load(pdfBytes);
      assert.deepEqual(pdf.getPage(0).getSize(), { width: 288, height: 432 });
      const png = await readFile(
        data.artifacts.find((file) => file.mimeType === "image/png").path,
      );
      assert.equal(png.readUInt32BE(16), 1200);
      assert.equal(png.readUInt32BE(20), 1800);
      const zip = unzipSync(
        await readFile(
          data.artifacts.find((file) => file.mimeType === "application/zip")
            .path,
        ),
      );
      assert.deepEqual(Object.keys(zip), [
        "Desktop test.pdf",
        "Desktop test-001-300dpi.png",
      ]);
      const resource = await client.readResource({ uri: pdfArtifact.uri });
      assert.deepEqual(
        Buffer.from(resource.contents[0].blob, "base64"),
        pdfBytes,
      );
      await assert.rejects(client.readResource({ uri: "file:///etc/passwd" }));
      const repeated = await client.callTool({
        name: "cropotter_convert",
        arguments: options,
      });
      assert.equal(repeated.isError, true);
      assert.equal(
        JSON.parse(repeated.content[0].text).error.code,
        "OUTPUT_EXISTS",
      );
      assert.deepEqual(await readFile(pdfArtifact.path), pdfBytes);
      evidence.push({
        architecture,
        runtime: "24.22.1",
        network: "denied by macOS sandbox",
        nodeAndNpmOnPath: false,
        protocol: client.getNegotiatedProtocolVersion(),
        checks: [
          "tools and annotations",
          "outside workspace denied",
          "manual output withheld",
          "sent MCP request cancelled; no files and next job succeeds",
          "PDF 288x432pt",
          "PNG 1200x1800",
          "ZIP names",
          "artifact checksums",
          "MCP resource bytes",
          "arbitrary file read denied",
          "no overwrite",
        ],
      });
    } catch (error) {
      throw new Error(
        `${architecture} bundle acceptance failed: ${error.message}\n${stderr}`,
      );
    } finally {
      await client.close();
    }
  }
  await writeFile(
    join(release, "extension-verification.json"),
    `${JSON.stringify({ status: "passed", artifact: artifact.filename, sha256: artifact.sha256, checks: evidence, actualClaudeDesktopInstallation: "separate host UI gate" }, null, 2)}\n`,
  );
  console.log(JSON.stringify({ status: "passed", checks: evidence }));
} finally {
  await rm(temp, { recursive: true, force: true });
}
