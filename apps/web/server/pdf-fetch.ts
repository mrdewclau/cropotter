import { lookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { LinkError, isPublicAddress, validatePdfUrl } from "./url-policy.js";

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
export interface Address {
  address: string;
  family: number;
}
interface RemoteResponse {
  status: number;
  headers: Record<string, string>;
  body: AsyncIterable<Uint8Array>;
  cancel(): void;
}
export type Transport = (
  url: URL,
  address: Address,
  signal: AbortSignal,
) => Promise<RemoteResponse>;
interface FetchOptions {
  resolve?: (hostname: string) => Promise<Address[]>;
  request?: Transport;
  maxBytes?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const nativeTransport: Transport = (url, target, signal) =>
  new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "GET",
        agent: false,
        signal,
        family: target.family,
        servername: isIP(url.hostname) ? undefined : url.hostname,
        lookup: (_host, _options, callback) =>
          callback(null, target.address, target.family),
        maxHeaderSize: 16 * 1024,
        headers: {
          Accept: "application/pdf, application/octet-stream;q=0.9",
          "Accept-Encoding": "identity",
          "User-Agent": "CropOtter/1.0",
        },
      },
      (response) => {
        const headers: Record<string, string> = {};
        for (const [key, value] of Object.entries(response.headers))
          if (typeof value === "string") headers[key] = value;
        resolve({
          status: response.statusCode ?? 502,
          headers,
          body: response,
          cancel: () => {
            response.destroy();
            req.destroy();
          },
        });
      },
    );
    req.once("error", reject);
    req.end();
  });

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(
        new LinkError(
          504,
          "PDF_TIMEOUT",
          "The PDF took too long to arrive. Try again or upload the file.",
        ),
      );
    // Always observe the operation's rejection, even if cancellation won
    // before this wrapper was entered.
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function fetchPublicPdf(
  value: string,
  options: FetchOptions = {},
): Promise<Uint8Array> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 30000,
  );
  const signal = options.signal
    ? AbortSignal.any([options.signal, controller.signal])
    : controller.signal;
  const resolve =
    options.resolve ??
    ((hostname) => lookup(hostname, { all: true, verbatim: true }));
  const request = options.request ?? nativeTransport;
  const maximum = options.maxBytes ?? MAX_PDF_BYTES;
  let remote: RemoteResponse | undefined;
  try {
    let url = validatePdfUrl(value);
    for (let redirects = 0; redirects <= 4; redirects++) {
      const host = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = isIP(host)
        ? [{ address: host, family: isIP(host) }]
        : await abortable(resolve(host), signal);
      if (
        !addresses.length ||
        addresses.some((item) => !isPublicAddress(item.address))
      )
        throw new LinkError(
          400,
          "PRIVATE_URL",
          "That link is not a public PDF address. Upload the file instead.",
        );
      const address =
        addresses.find((item) => item.family === 4) ?? addresses[0];
      remote = await abortable(request(url, address, signal), signal);
      if ([301, 302, 303, 307, 308].includes(remote.status)) {
        const location = remote.headers.location;
        remote.cancel();
        remote = undefined;
        if (!location || redirects === 4)
          throw new LinkError(
            422,
            "REDIRECT_LIMIT",
            "That link redirects too many times. Upload the PDF instead.",
          );
        url = validatePdfUrl(new URL(location, url).href);
        continue;
      }
      if (remote.status !== 200)
        throw new LinkError(
          422,
          "PDF_UNAVAILABLE",
          "That PDF could not be opened. The link may have expired or need a sign-in. You can upload the file instead.",
        );
      const length = Number(remote.headers["content-length"]);
      if (Number.isFinite(length) && length > maximum)
        throw new LinkError(
          413,
          "PDF_TOO_LARGE",
          "That PDF is too large. Choose a file smaller than 25 MB.",
        );
      const chunks: Uint8Array[] = [];
      let total = 0;
      const iterator = remote.body[Symbol.asyncIterator]();
      while (true) {
        const item = await abortable(iterator.next(), signal);
        if (item.done) break;
        total += item.value.byteLength;
        if (total > maximum)
          throw new LinkError(
            413,
            "PDF_TOO_LARGE",
            "That PDF is too large. Choose a file smaller than 25 MB.",
          );
        chunks.push(new Uint8Array(item.value));
      }
      const bytes = new Uint8Array(total);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
      if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes("%PDF-"))
        throw new LinkError(
          422,
          "NOT_PDF",
          "That link did not return a PDF. Use the PDF download link or upload the file.",
        );
      return bytes;
    }
    throw new LinkError(
      422,
      "REDIRECT_LIMIT",
      "Please upload the PDF instead.",
    );
  } catch (error) {
    if (error instanceof LinkError) throw error;
    if (signal.aborted)
      throw new LinkError(
        504,
        "PDF_TIMEOUT",
        "The PDF took too long to arrive. Try again or upload the file.",
      );
    throw new LinkError(
      422,
      "FETCH_FAILED",
      "That PDF could not be opened. Check the link or upload the file instead.",
    );
  } finally {
    clearTimeout(timer);
    remote?.cancel();
  }
}
