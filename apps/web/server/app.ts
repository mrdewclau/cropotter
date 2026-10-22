import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { isIP } from "node:net";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchPublicPdf } from "./pdf-fetch.js";
import { LinkError } from "./url-policy.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".bcmap": "application/octet-stream",
  ".pfb": "application/octet-stream",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".tgz": "application/gzip",
  ".zip": "application/zip",
  ".ico": "image/x-icon",
};
const CSP =
  "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; font-src 'self'; connect-src 'self' blob:; worker-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
interface AppOptions {
  clientDirectory?: string;
  fetchPdf?: typeof fetchPublicPdf;
  trustProxy?: boolean;
}
function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}
async function readJson(req: IncomingMessage) {
  let total = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 8192)
      throw new LinkError(
        413,
        "REQUEST_TOO_LARGE",
        "That link is too long. Upload the PDF instead.",
      );
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
      url?: unknown;
    };
  } catch {
    throw new LinkError(
      400,
      "INVALID_REQUEST",
      "Paste a direct PDF link and try again.",
    );
  }
}

export function createApp(options: AppOptions = {}) {
  const root = resolve(
    options.clientDirectory ??
      fileURLToPath(new URL("../client", import.meta.url)),
  );
  const fetchPdf = options.fetchPdf ?? fetchPublicPdf;
  const trustProxy =
    options.trustProxy ?? process.env.TRUST_CROPOTTER_PROXY === "1";
  const clients = new Map<
    string,
    { tokens: number; updated: number; active: number }
  >();
  let active = 0,
    tokens = 30,
    last = Date.now();
  const server = createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Content-Security-Policy", CSP);
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.headers.host?.toLowerCase() === "www.cropotter.com") {
        res.writeHead(308, {
          Location: `https://cropotter.com${url.pathname}${url.search}`,
        });
        res.end();
        return;
      }
      if (url.pathname === "/healthz") {
        json(res, 200, { ok: true, service: "cropotter" });
        return;
      }
      if (url.pathname === "/api/pdf") {
        if (req.method !== "POST") {
          res.setHeader("Allow", "POST");
          json(res, 405, { message: "Use POST." });
          return;
        }
        if (req.headers.origin) {
          let origin: URL;
          try {
            origin = new URL(req.headers.origin);
          } catch {
            throw new LinkError(403, "ORIGIN", "Request not allowed.");
          }
          if (origin.host !== req.headers.host)
            throw new LinkError(403, "ORIGIN", "Request not allowed.");
        }
        if (
          req.headers["content-type"]?.split(";")[0].trim() !==
          "application/json"
        )
          throw new LinkError(415, "CONTENT_TYPE", "Send a PDF link as JSON.");
        const body = await readJson(req);
        if (typeof body?.url !== "string")
          throw new LinkError(
            400,
            "INVALID_REQUEST",
            "Paste a direct PDF link and try again.",
          );
        const forwarded = req.headers["x-cropotter-client-ip"];
        // Only the loopback-only production listener enables this header; Caddy overwrites it.
        const clientIp =
          trustProxy && typeof forwarded === "string" && isIP(forwarded)
            ? forwarded
            : (req.socket.remoteAddress ?? "unknown");
        const now = Date.now();
        let client = clients.get(clientIp);
        if (!client) {
          if (clients.size >= 4096) {
            for (const [ip, value] of clients)
              if (!value.active && now - value.updated > 600000)
                clients.delete(ip);
          }
          if (clients.size >= 4096)
            throw new LinkError(
              429,
              "BUSY",
              "The link service is busy. Upload your PDF or try again later.",
            );
          client = { tokens: 6, updated: now, active: 0 };
          clients.set(clientIp, client);
        }
        client.tokens = Math.min(
          6,
          client.tokens + (now - client.updated) / 6000,
        );
        client.updated = now;
        if (client.tokens < 1 || client.active >= 2) {
          res.setHeader("Retry-After", "6");
          throw new LinkError(
            429,
            "CLIENT_LIMIT",
            "Please wait a moment before opening another link, or upload your PDF.",
          );
        }
        tokens = Math.min(30, tokens + (now - last) / 500);
        last = now;
        if (active >= 4 || tokens < 1)
          throw new LinkError(
            429,
            "BUSY",
            "The link service is busy. Try again in a moment or upload your PDF.",
          );
        tokens--;
        client.tokens--;
        client.active++;
        active++;
        const abort = new AbortController();
        let deliveryTimer: ReturnType<typeof setTimeout> | undefined;
        let released = false;
        const release = () => {
          if (released) return;
          released = true;
          active--;
          client.active--;
          clearTimeout(deliveryTimer);
          res.off("finish", release);
          res.off("close", close);
        };
        const close = () => {
          abort.abort();
          release();
        };
        res.once("close", close);
        res.once("finish", release);
        const bytes = await fetchPdf(body.url, { signal: abort.signal });
        if (res.destroyed) {
          release();
          return;
        }
        // A queued response still owns its slot until delivery finishes.
        deliveryTimer = setTimeout(() => res.destroy(), 30000);
        deliveryTimer.unref();
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Length": bytes.length,
          "Cache-Control": "no-store",
          "Content-Disposition": 'attachment; filename="label.pdf"',
        });
        res.end(bytes);
        return;
      }
      if (req.method !== "GET" && req.method !== "HEAD") {
        json(res, 405, { message: "Method not allowed." });
        return;
      }
      let pathname: string;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        json(res, 404, { message: "Not found." });
        return;
      }
      if (
        pathname.includes("\0") ||
        pathname.includes("\\") ||
        pathname.split("/").some((part) => part.startsWith("."))
      ) {
        json(res, 404, { message: "Not found." });
        return;
      }
      if (pathname === "/agents") {
        res.writeHead(308, { Location: "/agents/" });
        res.end();
        return;
      }
      const file = resolve(
        root,
        "." +
          (pathname === "/"
            ? "/index.html"
            : pathname === "/agents/"
              ? "/agents/index.html"
              : pathname),
      );
      if (!file.startsWith(root + sep)) {
        json(res, 404, { message: "Not found." });
        return;
      }
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) {
        json(res, 404, { message: "Not found." });
        return;
      }
      // Small downloadable MP4 previews also support Safari's byte-range reads.
      if (extname(file) === ".mp4") {
        res.setHeader("Content-Type", "video/mp4");
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("Accept-Ranges", "bytes");
        let start = 0,
          end = info.size - 1;
        if (req.headers.range) {
          const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
          if (match && (match[1] || match[2])) {
            if (!match[1]) start = Math.max(0, info.size - Number(match[2]));
            else {
              start = Number(match[1]);
              if (match[2]) end = Math.min(end, Number(match[2]));
            }
          } else start = -1;
          if (
            !Number.isSafeInteger(start) ||
            !Number.isSafeInteger(end) ||
            start < 0 ||
            start > end ||
            start >= info.size
          ) {
            res.writeHead(416, {
              "Content-Range": `bytes */${info.size}`,
              "Content-Length": "0",
            });
            res.end();
            return;
          }
          res.statusCode = 206;
          res.setHeader("Content-Range", `bytes ${start}-${end}/${info.size}`);
        }
        res.setHeader("Content-Length", Math.max(0, end - start + 1));
        if (req.method === "HEAD" || info.size === 0) {
          res.end();
          return;
        }
        createReadStream(file, { start, end })
          .on("error", () => res.destroy())
          .pipe(res);
        return;
      }
      let served = file,
        encoding = "";
      const accepted = req.headers["accept-encoding"] ?? "";
      for (const [name, suffix] of [
        ["br", ".br"],
        ["gzip", ".gz"],
      ]) {
        if (
          accepted.includes(name) &&
          (await stat(file + suffix).catch(() => null))?.isFile()
        ) {
          served = file + suffix;
          encoding = name;
          break;
        }
      }
      const selected = served === file ? info : await stat(served);
      res.setHeader(
        "Content-Type",
        MIME[extname(file)] ?? "application/octet-stream",
      );
      res.setHeader(
        "Cache-Control",
        extname(file) === ".html" ||
          [
            "/agents/manifest.json",
            "/agents/SHA256SUMS",
            "/agents/guide.md",
          ].includes(pathname)
          ? "no-cache"
          : pathname.startsWith("/assets/") ||
              pathname.startsWith("/engine-assets/")
            ? "public, max-age=31536000, immutable"
            : "public, max-age=86400",
      );
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Length", selected.size);
      if (encoding) res.setHeader("Content-Encoding", encoding);
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      createReadStream(served)
        .on("error", () => res.destroy())
        .pipe(res);
    } catch (error) {
      if (res.destroyed || res.headersSent) return;
      const known =
        error instanceof LinkError
          ? error
          : new LinkError(
              500,
              "SERVICE_ERROR",
              "Something went wrong. Please try again.",
            );
      json(res, known.status, { code: known.code, message: known.message });
    }
  });
  server.requestTimeout = 35000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  return server;
}
