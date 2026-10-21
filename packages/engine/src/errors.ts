export type ErrorCode =
  | "INVALID_SOURCE"
  | "INVALID_PDF"
  | "ENCRYPTED_PDF"
  | "UNSUPPORTED_CONTENT"
  | "LIMIT_EXCEEDED"
  | "ABORTED"
  | "URL_UNAVAILABLE"
  | "INVALID_SELECTION"
  | "EXPORT_FAILED"
  | "DISPOSED";
export class EngineError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EngineError";
  }
}
export function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted)
    throw new EngineError("ABORTED", "Processing was cancelled.");
}
export const DEFAULT_LIMITS = Object.freeze({
  maxBytes: 25 * 1024 * 1024,
  maxPages: 50,
  maxRenderPixels: 16_000_000,
  maxLabels: 100,
});
