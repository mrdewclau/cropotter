import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFRawStream,
  type PDFObject,
} from "pdf-lib";
import { checkAbort, EngineError } from "./errors.js";
import type { Limits } from "./types.js";

const white = (c: number) =>
  c === 0 || c === 9 || c === 10 || c === 12 || c === 13 || c === 32;
const delimiter = (c: number) =>
  white(c) || [40, 41, 60, 62, 91, 93, 123, 125, 47, 37].includes(c);

/** Read PDF tokens only until the first inline image. Binary image data is never parsed. */
export function hasInlineImage(bytes: Uint8Array): boolean {
  let i = 0;
  while (i < bytes.length) {
    const c = bytes[i];
    if (white(c)) {
      i++;
      continue;
    }
    if (c === 37) {
      while (i < bytes.length && bytes[i] !== 10 && bytes[i] !== 13) i++;
      continue;
    }
    if (c === 40) {
      let depth = 1;
      i++;
      while (i < bytes.length && depth) {
        if (bytes[i] === 92) {
          i += 2;
          continue;
        }
        if (bytes[i] === 40) depth++;
        if (bytes[i] === 41) depth--;
        i++;
      }
      continue;
    }
    if (c === 60 && bytes[i + 1] !== 60) {
      while (i < bytes.length && bytes[i] !== 62) i++;
      i++;
      continue;
    }
    if (c === 47) {
      i++;
      while (i < bytes.length && !delimiter(bytes[i])) i++;
      continue;
    }
    if (c === 60 && bytes[i + 1] === 60) {
      i += 2;
      continue;
    }
    if (delimiter(c)) {
      i++;
      continue;
    }
    const start = i;
    while (i < bytes.length && !delimiter(bytes[i])) i++;
    if (i - start === 2 && bytes[start] === 66 && bytes[start + 1] === 73)
      return true;
  }
  return false;
}
async function inflate(
  bytes: Uint8Array,
  cap: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const reader = new Blob([new Uint8Array(bytes).buffer])
    .stream()
    .pipeThrough(new DecompressionStream("deflate"))
    .getReader();
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      checkAbort(signal);
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > cap)
        throw new EngineError(
          "LIMIT_EXCEEDED",
          "The decoded PDF content exceeds the processing limit.",
        );
      chunks.push(item.value);
    }
    checkAbort(signal);
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  } finally {
    await reader.cancel().catch(() => {});
    signal?.removeEventListener("abort", abort);
  }
}
function joined(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0];
  const result = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
export async function preflightPdf(
  bytes: Uint8Array,
  limits: Limits,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const source = await PDFDocument.load(bytes, {
      ignoreEncryption: true,
      updateMetadata: false,
      throwOnInvalidObject: true,
    });
    if (source.isEncrypted)
      throw new EngineError(
        "ENCRYPTED_PDF",
        "Encrypted PDFs are unsupported. Export an unencrypted copy.",
      );
    if (source.getPageCount() > limits.maxPages)
      throw new EngineError(
        "LIMIT_EXCEEDED",
        "The PDF exceeds the page limit.",
      );
    // These programs contain nested drawing operations that PDF.js may silently
    // omit after a decoder failure. Keep them explicitly unsupported in v1.
    const objects: PDFObject[] = source.context
      .enumerateIndirectObjects()
      .map(([, object]) => object);
    const seen = new Set<PDFObject>();
    while (objects.length) {
      checkAbort(signal);
      const object = objects.pop()!;
      if (seen.has(object)) continue;
      seen.add(object);
      if (object instanceof PDFRawStream) {
        if (
          object.dict
            .lookupMaybe(PDFName.of("PatternType"), PDFNumber)
            ?.asNumber() === 1
        )
          throw new EngineError(
            "UNSUPPORTED_CONTENT",
            "Tiling-pattern PDFs are unsupported. Export a fresh PDF copy.",
          );
        objects.push(object.dict);
      } else if (object instanceof PDFDict) {
        if (object.lookup(PDFName.of("Subtype")) === PDFName.of("Type3"))
          throw new EngineError(
            "UNSUPPORTED_CONTENT",
            "Type3-font PDFs are unsupported. Export a fresh PDF copy.",
          );
        for (const [, value] of object.entries()) objects.push(value);
      } else if (object instanceof PDFArray) objects.push(...object.asArray());
    }
    const groups: PDFRawStream[][] = [];
    for (const page of source.getPages()) {
      const contents = page.node.Contents();
      if (contents instanceof PDFArray)
        groups.push(
          contents.asArray().map((item) => {
            const stream = source.context.lookup(item);
            if (!(stream instanceof PDFRawStream))
              throw new EngineError(
                "INVALID_PDF",
                "A page contains an invalid content stream.",
              );
            return stream;
          }),
        );
      else if (contents instanceof PDFRawStream) groups.push([contents]);
    }
    for (const [, object] of source.context.enumerateIndirectObjects())
      if (object instanceof PDFRawStream) {
        if (object.dict.lookup(PDFName.of("Subtype")) === PDFName.of("Form"))
          groups.push([object]);
        if (object.dict.lookup(PDFName.of("Subtype")) !== PDFName.of("Image"))
          continue;
        const width = object.dict
          .lookupMaybe(PDFName.of("Width"), PDFNumber)
          ?.asNumber();
        const height = object.dict
          .lookupMaybe(PDFName.of("Height"), PDFNumber)
          ?.asNumber();
        if (
          !Number.isSafeInteger(width) ||
          !Number.isSafeInteger(height) ||
          width! <= 0 ||
          height! <= 0
        )
          throw new EngineError(
            "INVALID_PDF",
            "An embedded image has invalid dimensions.",
          );
        if (width! * height! > limits.maxRenderPixels)
          throw new EngineError(
            "LIMIT_EXCEEDED",
            "An embedded image exceeds the render size limit.",
          );
      }
    const decoded = new Map<PDFRawStream, Uint8Array>();
    let total = 0;
    for (const group of groups) {
      const chunks: Uint8Array[] = [];
      for (const stream of group) {
        checkAbort(signal);
        let data = decoded.get(stream);
        if (!data) {
          data = stream.getContents();
          const filter = stream.dict.lookup(PDFName.of("Filter"));
          const filters =
            filter instanceof PDFArray
              ? filter.asArray().map((item) => source.context.lookup(item))
              : filter
                ? [filter]
                : [];
          const parms = stream.dict.lookup(PDFName.of("DecodeParms"));
          const params =
            parms instanceof PDFArray
              ? parms.asArray().map((item) => source.context.lookup(item))
              : parms
                ? [parms]
                : [];
          if (
            params.some(
              (p) =>
                p !== PDFNull &&
                (!(p instanceof PDFDict) ||
                  (p
                    .lookupMaybe(PDFName.of("Predictor"), PDFNumber)
                    ?.asNumber() ?? 1) !== 1),
            )
          )
            throw new EngineError(
              "UNSUPPORTED_CONTENT",
              "Predictor-encoded content streams are unsupported. Export a fresh PDF copy.",
            );
          for (const item of filters) {
            if (item !== PDFName.of("FlateDecode") && item !== PDFName.of("Fl"))
              throw new EngineError(
                "UNSUPPORTED_CONTENT",
                "This PDF uses an unsupported content-stream filter. Export a fresh PDF copy.",
              );
            data = await inflate(data, limits.maxBytes - total, signal);
          }
          total += data.length;
          if (total > limits.maxBytes)
            throw new EngineError(
              "LIMIT_EXCEEDED",
              "The decoded PDF content exceeds the processing limit.",
            );
          decoded.set(stream, data);
        }
        chunks.push(data);
      }
      if (
        chunks.reduce((size, chunk) => size + chunk.length, 0) > limits.maxBytes
      )
        throw new EngineError(
          "LIMIT_EXCEEDED",
          "The decoded PDF content exceeds the processing limit.",
        );
      if (hasInlineImage(joined(chunks)))
        throw new EngineError(
          "UNSUPPORTED_CONTENT",
          "Inline-image PDFs are unsupported. Export a fresh PDF with separate image objects.",
        );
    }
  } catch (error) {
    checkAbort(signal);
    if (error instanceof EngineError) throw error;
    throw new EngineError(
      "INVALID_PDF",
      "The PDF could not be parsed completely.",
    );
  }
}
