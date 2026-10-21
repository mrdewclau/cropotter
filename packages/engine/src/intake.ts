import { checkAbort, DEFAULT_LIMITS, EngineError } from "./errors.js";
import type { PdfSource } from "./types.js";

export async function loadSource(
  source: PdfSource,
  options: {
    signal?: AbortSignal;
    maxBytes?: number;
    timeoutMs?: number;
    fetch?: typeof fetch;
  } = {},
): Promise<Uint8Array> {
  checkAbort(options.signal);
  const maxBytes = options.maxBytes ?? DEFAULT_LIMITS.maxBytes;
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0)
    throw new EngineError(
      "LIMIT_EXCEEDED",
      "The input limit must be positive.",
    );
  let bytes: Uint8Array;
  if (source instanceof Uint8Array) {
    if (source.byteLength > maxBytes)
      throw new EngineError(
        "LIMIT_EXCEEDED",
        "The PDF exceeds the input size limit.",
      );
    bytes = new Uint8Array(source);
  } else {
    if (!source || typeof source.url !== "string")
      throw new EngineError(
        "INVALID_SOURCE",
        "Provide PDF bytes or an HTTP(S) PDF URL.",
      );
    let url: URL;
    try {
      url = new URL(source.url);
    } catch {
      throw new EngineError(
        "INVALID_SOURCE",
        "Provide a valid HTTP(S) PDF URL.",
      );
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new EngineError(
        "INVALID_SOURCE",
        "Only HTTP(S) PDF URLs without embedded credentials are supported.",
      );
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, options.timeoutMs ?? 30_000);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await (options.fetch ?? globalThis.fetch)(source.url, {
        signal: controller.signal,
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      if (response.body) reader = response.body.getReader();
      if (!response.ok || !reader)
        throw new EngineError(
          "URL_UNAVAILABLE",
          "The label URL could not be downloaded. Upload the PDF instead.",
        );
      if (Number(response.headers.get("content-length")) > maxBytes)
        throw new EngineError(
          "LIMIT_EXCEEDED",
          "The PDF exceeds the input size limit.",
        );
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        checkAbort(options.signal);
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > maxBytes)
          throw new EngineError(
            "LIMIT_EXCEEDED",
            "The PDF exceeds the input size limit.",
          );
        chunks.push(value);
      }
      bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
    } catch (error) {
      checkAbort(options.signal);
      if (error instanceof EngineError) throw error;
      throw new EngineError(
        "URL_UNAVAILABLE",
        "The label URL could not be downloaded. Upload the PDF instead.",
      );
    } finally {
      if (reader) await reader.cancel().catch(() => {});
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }
  checkAbort(options.signal);
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!/%PDF-\d\.\d/.test(header) || /^\s*</.test(header))
    throw new EngineError("INVALID_PDF", "The input is not a PDF document.");
  return bytes;
}
