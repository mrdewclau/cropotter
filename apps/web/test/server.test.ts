import { describe, it, expect, vi } from "vitest";
import { validatePdfUrl, isPublicAddress } from "../server/url-policy.js";
import { fetchPublicPdf, type Transport } from "../server/pdf-fetch.js";
import { createApp } from "../server/app.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { request as httpRequest } from "node:http";

const pdf = new TextEncoder().encode("%PDF-1.7\nsynthetic test bytes");
const resolve = vi.fn(async () => [
  { address: "93.184.216.34", family: 4 as const },
]);
function response(
  status = 200,
  headers: Record<string, string> = {},
  chunks: Uint8Array[] = [pdf],
) {
  return {
    status,
    headers,
    body: (async function* () {
      yield* chunks;
    })(),
    cancel: vi.fn(),
  };
}

describe("public PDF URL policy", () => {
  it("preserves signed query parameters exactly", () => {
    const value =
      "https://bucket.s3.eu-central-1.amazonaws.com/label?X-Amz-Signature=a%2Fb%2Bc&x=hello%20world";
    expect(validatePdfUrl(value).href).toBe(value);
  });
  it.each([
    "http://example.com/a.pdf",
    "https://user:secret@example.com/a.pdf",
    "https://example.com:444/a.pdf",
    "https://localhost/a",
    "https://127.1/a",
    "https://[::1]/a",
    "https://169.254.169.254/a",
    "https://10.0.0.1/a",
    "file:///private/a",
  ])("rejects unsafe input %s", (value) => {
    expect(() => validatePdfUrl(value)).toThrow();
  });
  it.each([
    "127.0.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "10.0.0.1",
    "172.20.0.1",
    "192.168.1.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("rejects non-public address %s", (value) =>
    expect(isPublicAddress(value)).toBe(false),
  );
  it("accepts public IPv4 and IPv6 addresses", () => {
    expect(isPublicAddress("1.1.1.1")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });
  it("rejects a public-looking hostname if any DNS answer is private", async () => {
    const request = vi.fn();
    await expect(
      fetchPublicPdf("https://example.com/a", {
        resolve: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "127.0.0.1", family: 4 },
        ],
        request,
      }),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("pins the validated public address and revalidates redirects", async () => {
    const request: Transport = vi.fn(async (url, address) => {
      expect(address.address).toBe("93.184.216.34");
      return url.pathname === "/a"
        ? response(302, { location: "/b" })
        : response();
    });
    expect(
      await fetchPublicPdf("https://example.com/a", { resolve, request }),
    ).toEqual(pdf);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("never follows a private redirect", async () => {
    const request = vi.fn(async () =>
      response(302, { location: "https://169.254.169.254/secrets" }),
    );
    await expect(
      fetchPublicPdf("https://example.com/a", { resolve, request }),
    ).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("limits streamed bytes even without Content-Length", async () => {
    const result = response(200, {}, [pdf, pdf]);
    await expect(
      fetchPublicPdf("https://example.com/a", {
        resolve,
        request: async () => result,
        maxBytes: pdf.length,
      }),
    ).rejects.toThrow(/large/i);
    expect(result.cancel).toHaveBeenCalled();
  });
  it("rejects HTML without exposing the supplied signed URL", async () => {
    await expect(
      fetchPublicPdf("https://example.com/private?secret=abc", {
        resolve,
        request: async () =>
          response(200, {}, [new TextEncoder().encode("<html>Sign in</html>")]),
      }),
    ).rejects.toThrow(/PDF/);
  });
  it("bounds the whole operation including a stalled DNS resolution", async () => {
    await expect(
      fetchPublicPdf("https://example.com/a", {
        resolve: () => new Promise(() => {}),
        timeoutMs: 20,
      }),
    ).rejects.toMatchObject({ code: "PDF_TIMEOUT" });
  });
});

describe("HTTP service", () => {
  it("keeps response slots until slow readers finish or disconnect", async () => {
    const fetchPdf = vi.fn(async () => new Uint8Array(25 * 1024 * 1024));
    const server = createApp({ fetchPdf });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const a = server.address();
    if (!a || typeof a === "string") throw Error("address");
    const port = a.port;
    const clients: ReturnType<typeof httpRequest>[] = [];
    async function pausedRequest() {
      return new Promise<number>((resolve, reject) => {
        const req = httpRequest(
          {
            hostname: "127.0.0.1",
            port,
            path: "/api/pdf",
            method: "POST",
            agent: false,
            headers: { "Content-Type": "application/json" },
          },
          (res) => {
            res.pause();
            res.on("error", () => {});
            resolve(res.statusCode!);
          },
        );
        clients.push(req);
        req.on("error", reject);
        req.end(JSON.stringify({ url: "https://example.com/label.pdf" }));
      });
    }
    try {
      for (let i = 0; i < 4; i++) expect(await pausedRequest()).toBe(200);
      expect(await pausedRequest()).toBe(429);
      expect(fetchPdf).toHaveBeenCalledTimes(4);
      clients[0].destroy();
      // Let the server observe the disconnected response before retrying.
      await new Promise((r) => setTimeout(r, 30));
      expect(await pausedRequest()).toBe(200);
      expect(fetchPdf).toHaveBeenCalledTimes(5);
    } finally {
      clients.forEach((req) => req.destroy());
      server.closeAllConnections();
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("returns an error for an oversized chunked body without dropping the response socket", async () => {
    const server = createApp();
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const a = server.address();
    if (!a || typeof a === "string") throw Error("address");
    try {
      const status = await new Promise<number>((resolve, reject) => {
        const req = httpRequest(
          {
            hostname: "127.0.0.1",
            port: a.port,
            path: "/api/pdf",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Transfer-Encoding": "chunked",
            },
          },
          (res) => {
            res.resume();
            resolve(res.statusCode!);
          },
        );
        req.on("error", reject);
        req.write("x".repeat(9000));
        setTimeout(() => req.end("more"), 40);
      });
      expect(status).toBe(413);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
  it("serves the app, health, bounded PDF API, and rejects traversal/cross-origin posts", async () => {
    const root = await mkdtemp(join(tmpdir(), "cropotter-http-"));
    await writeFile(join(root, "index.html"), "<title>CropOtter</title>");
    const fetchPdf = vi.fn(async () => pdf);
    const server = createApp({ clientDirectory: root, fetchPdf });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const a = server.address();
    if (!a || typeof a === "string") throw Error("address");
    const base = `http://127.0.0.1:${a.port}`;
    try {
      expect((await fetch(base + "/healthz")).status).toBe(200);
      expect(await (await fetch(base)).text()).toContain("CropOtter");
      expect((await fetch(base + "/%2e%2e%2fpackage.json")).status).toBe(404);
      expect((await fetch(base + "/missing.wasm")).status).toBe(404);
      const result = await fetch(base + "/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "https://example.com/test.pdf" }),
      });
      expect(result.headers.get("cache-control")).toBe("no-store");
      expect(result.headers.get("content-type")).toBe("application/pdf");
      expect(new Uint8Array(await result.arrayBuffer())).toEqual(pdf);
      const forbidden = await fetch(base + "/api/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://another.example",
        },
        body: "{}",
      });
      expect(forbidden.status).toBe(403);
      expect(
        (
          await fetch(base + "/api/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "x".repeat(9000),
          })
        ).status,
      ).toBe(413);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
      await rm(root, { recursive: true });
    }
  });
});

it("serves preview MP4s with video MIME, byte ranges and HEAD support", async () => {
  const root = await mkdtemp(join(tmpdir(), "cropotter-preview-"));
  const bytes = Buffer.from("0123456789");
  await writeFile(join(root, "preview.mp4"), bytes);
  const server = createApp({ clientDirectory: root });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const address = server.address();
  if (!address || typeof address === "string") throw Error("address");
  const url = `http://127.0.0.1:${address.port}/preview.mp4`;
  try {
    const full = await fetch(url);
    expect(full.headers.get("content-type")).toBe("video/mp4");
    expect(Buffer.from(await full.arrayBuffer())).toEqual(bytes);
    for (const [range, expected, contentRange] of [
      ["bytes=2-5", "2345", "bytes 2-5/10"],
      ["bytes=-3", "789", "bytes 7-9/10"],
      ["bytes=8-", "89", "bytes 8-9/10"],
    ]) {
      const res = await fetch(url, { headers: { Range: range! } });
      expect(res.status).toBe(206);
      expect(res.headers.get("content-range")).toBe(contentRange);
      expect(await res.text()).toBe(expected);
    }
    const head = await fetch(url, { method: "HEAD" });
    expect(head.headers.get("accept-ranges")).toBe("bytes");
    expect(head.headers.get("content-length")).toBe("10");
    expect(await head.text()).toBe("");
    const invalid = await fetch(url, { headers: { Range: "bytes=50-60" } });
    expect(invalid.status).toBe(416);
    expect(invalid.headers.get("content-range")).toBe("bytes */10");
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
    await rm(root, { recursive: true, force: true });
  }
});
