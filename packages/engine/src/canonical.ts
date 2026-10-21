import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";
import { EngineError } from "./errors.js";
import { digest } from "./pixels.js";

const prefix = new TextEncoder().encode("/CropShipIntegrity (crop-ship-v1:");
const zeros = "0".repeat(64);
function slot(bytes: Uint8Array): number | undefined {
  let found: number | undefined;
  for (let i = 0; i <= bytes.length - prefix.length - 65; i++) {
    if (bytes[i] !== prefix[0]) continue;
    let matches = true;
    for (let j = 1; j < prefix.length; j++)
      if (bytes[i + j] !== prefix[j]) {
        matches = false;
        break;
      }
    if (!matches) continue;
    if (found !== undefined) return;
    found = i + prefix.length;
  }
  return found !== undefined && bytes[found + 64] === 41 ? found : undefined;
}
/** An exact-byte checksum for idempotence, not a security signature or content validator. */
export async function canonicalBytesIntact(
  bytes: Uint8Array,
): Promise<boolean> {
  const offset = slot(bytes);
  if (offset === undefined) return false;
  const expected = new TextDecoder().decode(
    bytes.subarray(offset, offset + 64),
  );
  if (!/^[a-f0-9]{64}$/.test(expected)) return false;
  const copy = bytes.slice();
  copy.fill(48, offset, offset + 64);
  return (await digest(copy)) === expected;
}
export async function saveCanonical(
  document: PDFDocument,
): Promise<Uint8Array> {
  const info = document.context.lookup(
    document.context.trailerInfo.Info,
    PDFDict,
  );
  info.set(
    PDFName.of("CropShipIntegrity"),
    PDFString.of("crop-ship-v1:" + zeros),
  );
  // The fixed-length uncompressed slot keeps xref offsets valid after hashing.
  const bytes = await document.save({ useObjectStreams: false });
  const offset = slot(bytes);
  if (offset === undefined)
    throw new EngineError(
      "EXPORT_FAILED",
      "The canonical PDF checksum could not be written.",
    );
  bytes.set(new TextEncoder().encode(await digest(bytes)), offset);
  return bytes;
}
