import { execFileSync } from "node:child_process";
import { mkdtemp, realpath, readFile, copyFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { unzipSync } from "fflate";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const env = {
  ...process.env,
  PATH: dirname(process.execPath) + delimiter + process.env.PATH,
};
const temp = await mkdtemp(join(await realpath(tmpdir()), "cropotter-packed-"));
try {
  execFileSync(
    process.execPath,
    [join(repo, "packages/local/scripts/build.mjs")],
    { cwd: repo, env, stdio: "pipe" },
  );
  const pack = JSON.parse(
    execFileSync(
      "npm",
      [
        "pack",
        "--workspace",
        "packages/local",
        "--pack-destination",
        temp,
        "--json",
      ],
      { cwd: repo, env, encoding: "utf8" },
    ),
  );
  execFileSync(
    "npm",
    [
      "install",
      "--prefix",
      temp,
      join(temp, pack[0].filename),
      "--omit=dev",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: temp, env, stdio: "pipe", timeout: 180000 },
  );
  const cli = join(temp, "node_modules/cropotter-local/dist/cli.mjs"),
    mcp = join(temp, "node_modules/cropotter-local/dist/mcp.mjs"),
    input = join(temp, "synthetic.pdf");
  await copyFile(join(repo, "apps/web/public/sample-label.pdf"), input);
  const analyze = JSON.parse(
    execFileSync(process.execPath, [cli, "analyze", "--input", input], {
      cwd: temp,
      env,
      encoding: "utf8",
    }),
  );
  assert.equal(analyze.analysis.status, "ready");
  const out = join(temp, "labels");
  const converted = JSON.parse(
    execFileSync(
      process.execPath,
      [
        cli,
        "convert",
        "--input",
        input,
        "--out",
        out,
        "--formats",
        "pdf,png,zip",
        "--name",
        "Packed labels",
        "--dpi",
        "300",
      ],
      { cwd: temp, env, encoding: "utf8", timeout: 90000 },
    ),
  );
  assert.equal(converted.status, "ready");
  const pdf = await PDFDocument.load(
    await readFile(join(out, "Packed labels.pdf")),
  );
  assert.deepEqual(pdf.getPage(0).getSize(), { width: 288, height: 432 });
  const png = await readFile(join(out, "Packed labels-001-300dpi.png"));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 1800);
  assert.deepEqual(
    Object.keys(unzipSync(await readFile(join(out, "Packed labels.zip")))),
    ["Packed labels.pdf", "Packed labels-001-300dpi.png"],
  );
  const client = new Client(
    { name: "cropotter-packed-check", version: "1.0.0" },
    { versionNegotiation: { mode: "auto" } },
  );
  try {
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [mcp],
        cwd: temp,
        env,
        stderr: "pipe",
      }),
    );
    assert.equal(client.getNegotiatedProtocolVersion(), "2026-07-28");
    const result = await client.callTool({
      name: "cropotter_convert",
      arguments: {
        input,
        out: join(temp, "mcp-labels"),
        formats: ["pdf", "png", "zip"],
        name: "Packed MCP",
      },
    });
    assert.notEqual(result.isError, true);
    assert.equal(result.structuredContent.status, "ready");
    assert.equal(result.structuredContent.artifacts.length, 4);
    const artifact = result.structuredContent.artifacts[0],
      resource = await client.readResource({ uri: artifact.uri });
    assert.equal(
      createHash("sha256")
        .update(Buffer.from(resource.contents[0].blob, "base64"))
        .digest("hex"),
      artifact.sha256,
    );
    await assert.rejects(() =>
      client.readResource({ uri: "file:///etc/passwd" }),
    );
  } finally {
    await client.close();
  }
  console.log(
    JSON.stringify({
      status: "passed",
      package: `cropotter-local@${converted.version}`,
      cleanInstall: true,
      cli: ["analysis", "pdf-288x432pt", "png-1200x1800", "zip"],
      mcp: [
        "2026-07-28",
        "actual-conversion",
        "immutable-resource",
        "arbitrary-file-denied",
      ],
    }),
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}
