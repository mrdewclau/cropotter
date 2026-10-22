import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFObjectStreamParser,
  PDFParser,
  PDFRawStream,
  type PDFContext,
  type PDFObject,
} from "pdf-lib";
import { checkAbort, EngineError } from "./errors.js";
import type { Limits } from "./types.js";

export async function inflateBounded(
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
      if (size > cap) throw limit();
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
function limit() {
  return new EngineError(
    "LIMIT_EXCEEDED",
    "The decoded PDF structure exceeds the processing limit.",
  );
}

/**
 * Adapter for pinned pdf-lib 1.17.1. Its normal load() inflates ObjStm/XRef
 * synchronously before callers can enforce a budget. Defer those streams on
 * this parser instance, then decode and parse them within per-document limits.
 * No shared parser factories/prototypes are changed.
 */
export async function loadBoundedPdf(
  bytes: Uint8Array,
  limits: Limits,
  signal?: AbortSignal,
) {
  checkAbort(signal);
  if (bytes.length > limits.maxBytes) throw limit();
  const maximumObjects = Math.min(
    50_000,
    Math.max(100, Math.floor(limits.maxBytes / 8)),
  );
  const parser = PDFParser.forBytesWithOptions(bytes, 100, true, true);
  const deferred: { stream: PDFRawStream; type: PDFName }[] = [];
  let count = 0,
    depth = 0;
  let violation: EngineError | undefined;
  function guard(target: { parseObject(): PDFObject }, deferStreams: boolean) {
    const parse = target.parseObject.bind(target);
    target.parseObject = () => {
      checkAbort(signal);
      if (++count > maximumObjects || depth >= 64) {
        violation = limit();
        throw violation;
      }
      depth++;
      try {
        const object = parse();
        if (object instanceof PDFRawStream) {
          const type = object.dict.lookup(PDFName.of("Type"));
          // An unresolved /Type could become ObjStm/XRef after this scan and
          // bypass the bounded decoder. Refuse it before the parser continues.
          if (object.dict.has(PDFName.of("Type")) && !type) {
            violation = new EngineError(
              "UNSUPPORTED_CONTENT",
              "Forward-referenced PDF stream types are unsupported. Export a fresh PDF copy.",
            );
            throw violation;
          }
          if (
            type instanceof PDFName &&
            (type === PDFName.of("ObjStm") || type === PDFName.of("XRef"))
          ) {
            if (!deferStreams)
              throw new EngineError(
                "INVALID_PDF",
                "Nested PDF structure streams are invalid.",
              );
            deferred.push({ stream: object, type });
            object.dict.delete(PDFName.of("Type"));
            if (type === PDFName.of("XRef")) {
              // pdf-lib scans all objects and does not use cross-reference
              // offsets. Retain trailer metadata without enumerating /Size.
              object.dict.context.trailerInfo = {
                Root: object.dict.get(PDFName.of("Root")),
                Encrypt: object.dict.get(PDFName.of("Encrypt")),
                Info: object.dict.get(PDFName.of("Info")),
                ID: object.dict.get(PDFName.of("ID")),
              };
            }
          }
        }
        return object;
      } finally {
        depth--;
      }
    };
  }
  guard(parser, true);
  let context: PDFContext;
  try {
    context = await parser.parseDocument();
  } catch (error) {
    if (violation) throw violation;
    throw error;
  }
  checkAbort(signal);
  if (context.trailerInfo.Encrypt)
    throw new EngineError(
      "ENCRYPTED_PDF",
      "Encrypted PDFs are unsupported. Export an unencrypted copy.",
    );
  let decodedBytes = 0;
  for (const { stream, type } of deferred) {
    checkAbort(signal);
    stream.dict.set(PDFName.of("Type"), type);
    const objectCount = stream.dict
      .lookupMaybe(
        PDFName.of(type === PDFName.of("ObjStm") ? "N" : "Size"),
        PDFNumber,
      )
      ?.asNumber();
    if (!Number.isSafeInteger(objectCount) || objectCount! < 0)
      throw new EngineError(
        "INVALID_PDF",
        "A PDF structure stream has an invalid object count.",
      );
    if (objectCount! > maximumObjects) throw limit();
    let data = stream.getContents();
    const filter = stream.dict.lookup(PDFName.of("Filter"));
    const filters =
      filter instanceof PDFArray
        ? filter.asArray().map((item) => context.lookup(item))
        : filter
          ? [filter]
          : [];
    const parms = stream.dict.lookup(PDFName.of("DecodeParms"));
    const params =
      parms instanceof PDFArray
        ? parms.asArray().map((item) => context.lookup(item))
        : parms
          ? [parms]
          : [];
    if (
      params.some(
        (param) =>
          param !== PDFNull &&
          (!(param instanceof PDFDict) ||
            (param
              .lookupMaybe(PDFName.of("Predictor"), PDFNumber)
              ?.asNumber() ?? 1) !== 1),
      )
    )
      throw new EngineError(
        "UNSUPPORTED_CONTENT",
        "Predictor-encoded PDF structure streams are unsupported. Export a fresh PDF copy.",
      );
    if (filters.length > 4) throw limit();
    for (const item of filters) {
      if (item !== PDFName.of("FlateDecode") && item !== PDFName.of("Fl"))
        throw new EngineError(
          "UNSUPPORTED_CONTENT",
          "This PDF uses an unsupported structure-stream filter. Export a fresh PDF copy.",
        );
      data = await inflateBounded(data, limits.maxBytes - decodedBytes, signal);
    }
    decodedBytes += data.length;
    if (decodedBytes > limits.maxBytes) throw limit();
    if (type === PDFName.of("XRef")) {
      const widths = stream.dict.lookup(PDFName.of("W"));
      if (
        !(widths instanceof PDFArray) ||
        widths.size() !== 3 ||
        widths.asArray().some((item) => {
          const width = context.lookup(item);
          return (
            !(width instanceof PDFNumber) ||
            !Number.isSafeInteger(width.asNumber()) ||
            width.asNumber() < 0 ||
            width.asNumber() > 8
          );
        })
      )
        throw new EngineError(
          "INVALID_PDF",
          "The PDF cross-reference widths are invalid.",
        );
      const index = stream.dict.lookup(PDFName.of("Index"));
      if (index instanceof PDFArray) {
        let entries = 0;
        for (let i = 0; i < index.size(); i += 2) {
          const length = index.lookup(i + 1, PDFNumber).asNumber();
          if (!Number.isSafeInteger(length) || length < 0)
            throw new EngineError(
              "INVALID_PDF",
              "The PDF cross-reference index is invalid.",
            );
          entries += length;
          if (entries > maximumObjects) throw limit();
        }
      }
      continue;
    }
    const first = stream.dict
      .lookupMaybe(PDFName.of("First"), PDFNumber)
      ?.asNumber();
    if (!Number.isSafeInteger(first) || first! < 0 || first! > data.length)
      throw new EngineError(
        "INVALID_PDF",
        "A PDF object stream has an invalid offset.",
      );
    const dictionary = stream.dict.clone(context);
    dictionary.delete(PDFName.of("Filter"));
    dictionary.delete(PDFName.of("DecodeParms"));
    const objectParser = PDFObjectStreamParser.forStream(
      PDFRawStream.of(dictionary, data),
    );
    guard(objectParser, false);
    await objectParser.parseIntoContext();
  }
  checkAbort(signal);
  // pdf-lib's constructor is private only in TypeScript. Keep this pinned
  // adapter isolated, avoiding a second unbounded parse through load().
  const Document = PDFDocument as unknown as new (
    context: PDFContext,
    ignoreEncryption: boolean,
    updateMetadata: boolean,
  ) => PDFDocument;
  return new Document(context, true, false);
}
