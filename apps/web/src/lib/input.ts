export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export function validateFile(file: {
  name: string;
  size: number;
  type: string;
}) {
  if (!file.size)
    throw new Error("That file is empty. Choose a PDF with a shipping label.");
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Choose a PDF smaller than 25 MB.");
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf")
    throw new Error(
      "Choose a PDF file. Images can be downloaded after formatting.",
    );
}
export function assertPdfBytes(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_FILE_BYTES)
    throw new Error("Choose a PDF smaller than 25 MB.");
  if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes("%PDF-"))
    throw new Error(
      "That file does not look like a PDF. Download a fresh copy and try again.",
    );
}
export function validateLink(value: string): string {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("Paste the full HTTPS link to your PDF.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    trimmed.length > 8192
  )
    throw new Error(
      "Use a direct HTTPS PDF link without a username, password or custom port.",
    );
  return trimmed;
}
export function fileStem(name: string) {
  return (
    name
      .split(/[\\/]/)
      .at(-1)!
      .replace(/\.pdf$/i, "")
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "label"
  );
}
export function friendlyError(error: unknown): string {
  if (!(error instanceof Error))
    return "Something went wrong. Please try again.";
  const code = (error as Error & { code?: string }).code;
  if (code === "LIMIT_EXCEEDED")
    return "That PDF is too large or complex to process here. Try a smaller file, up to 25 MB and 50 pages.";
  if (code === "ENCRYPTED_PDF")
    return "That PDF is password protected. Save an unlocked copy and try again.";
  if (code === "UNSUPPORTED_CONTENT")
    return "This PDF uses a feature we cannot read yet. Try downloading a fresh PDF from the sender.";
  if (code === "MALFORMED_PDF" || code === "INVALID_PDF")
    return "That PDF could not be read. Try downloading a fresh copy.";
  return error.message;
}
