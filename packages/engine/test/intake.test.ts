import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import * as intake from "../src/intake.js";

const pdf = new TextEncoder().encode("%PDF-1.7\nsynthetic test document");
let server: Server;
let origin: string;
let seenQuery = "";
beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url?.startsWith("/label")) {
      seenQuery = req.url;
      res.setHeader("Content-Type", "application/octet-stream");
      res.end(pdf);
    } else if (req.url === "/large") {
      res.write(pdf);
      res.end(new Uint8Array(100));
    } else if (req.url === "/html") {
      res.end("<html>not a label</html>");
    } else if (req.url === "/slow") {
      setTimeout(() => res.end(pdf), 100);
    } else {
      res.statusCode = 403;
      res.end("expired");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("bounded PDF intake", () => {
  it("owns a copy of file bytes", async () => {
    const bytes = pdf.slice();
    const result = await intake.loadSource(bytes);
    expect(result).toEqual(pdf);
    expect(result.buffer).not.toBe(bytes.buffer);
  });
  it("preserves signed URL query bytes and accepts PDF content with a generic MIME type", async () => {
    await expect(
      intake.loadSource({
        url: origin + "/label?signature=a%2Bb%2F&disposition=x%20y",
      }),
    ).resolves.toEqual(pdf);
    expect(seenQuery).toBe("/label?signature=a%2Bb%2F&disposition=x%20y");
  });
  it("rejects HTML regardless of filename or response headers", async () => {
    await expect(
      intake.loadSource({ url: origin + "/html" }),
    ).rejects.toMatchObject({ code: "INVALID_PDF" });
  });
  it("enforces the byte cap even when Content-Length is absent", async () => {
    await expect(
      intake.loadSource({ url: origin + "/large" }, { maxBytes: 40 }),
    ).rejects.toMatchObject({ code: "LIMIT_EXCEEDED" });
  });
  it("does not expose signed URLs in download failures", async () => {
    const error = await intake
      .loadSource({ url: origin + "/expired?secret=private" })
      .catch((error) => error);
    expect(error.code).toBe("URL_UNAVAILABLE");
    expect(error.message).not.toContain("private");
  });
  it("supports cancellation and timeouts", async () => {
    await expect(
      intake.loadSource(pdf, { signal: AbortSignal.abort() }),
    ).rejects.toMatchObject({ code: "ABORTED" });
    await expect(
      intake.loadSource({ url: origin + "/slow" }, { timeoutMs: 5 }),
    ).rejects.toMatchObject({ code: "URL_UNAVAILABLE" });
  });
  it("rejects non-HTTP source schemes", async () => {
    await expect(
      intake.loadSource({ url: "file:///etc/passwd" }),
    ).rejects.toMatchObject({ code: "INVALID_SOURCE" });
  });
});
