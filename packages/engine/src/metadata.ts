import { EngineError } from "./errors.js";
import type { Dpi } from "./types.js";

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
export function pngDensity(input: Uint8Array, dpi: Dpi): Uint8Array {
  if (input.length < 33 || input[0] !== 137 || input[1] !== 80)
    throw new EngineError(
      "EXPORT_FAILED",
      "The PNG encoder returned invalid data.",
    );
  const phys = new Uint8Array(21),
    view = new DataView(phys.buffer);
  view.setUint32(0, 9);
  phys.set(new TextEncoder().encode("pHYs"), 4);
  const ppm = Math.round(dpi / 0.0254);
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  phys[16] = 1;
  view.setUint32(17, crc32(phys.subarray(4, 17)));
  const chunks = [input.subarray(0, 33), phys];
  let offset = 33;
  while (offset < input.length) {
    if (offset + 12 > input.length)
      throw new EngineError(
        "EXPORT_FAILED",
        "The PNG encoder returned truncated data.",
      );
    const length = new DataView(
        input.buffer,
        input.byteOffset + offset,
        4,
      ).getUint32(0),
      end = offset + 12 + length;
    if (end > input.length)
      throw new EngineError(
        "EXPORT_FAILED",
        "The PNG encoder returned truncated data.",
      );
    if (
      new TextDecoder().decode(input.subarray(offset + 4, offset + 8)) !==
      "pHYs"
    )
      chunks.push(input.subarray(offset, end));
    offset = end;
  }
  const result = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}
export function jpgDensity(input: Uint8Array, dpi: Dpi): Uint8Array {
  if (input[0] !== 255 || input[1] !== 216)
    throw new EngineError(
      "EXPORT_FAILED",
      "The JPEG encoder returned invalid data.",
    );
  const result = input.slice();
  let offset = 2;
  while (offset + 4 < result.length && result[offset] === 255) {
    const marker = result[offset + 1];
    if (marker === 218 || marker === 217) break;
    const size = result[offset + 2] * 256 + result[offset + 3];
    if (size < 2 || offset + 2 + size > result.length) break;
    if (
      marker === 224 &&
      new TextDecoder().decode(result.subarray(offset + 4, offset + 9)) ===
        "JFIF\0"
    ) {
      result[offset + 11] = 1;
      result[offset + 12] = dpi >> 8;
      result[offset + 13] = dpi & 255;
      result[offset + 14] = dpi >> 8;
      result[offset + 15] = dpi & 255;
      return result;
    }
    offset += 2 + size;
  }
  const header = new Uint8Array([
    255,
    224,
    0,
    16,
    74,
    70,
    73,
    70,
    0,
    1,
    1,
    1,
    dpi >> 8,
    dpi & 255,
    dpi >> 8,
    dpi & 255,
    0,
    0,
  ]);
  const out = new Uint8Array(input.length + header.length);
  out.set(input.subarray(0, 2));
  out.set(header, 2);
  out.set(input.subarray(2), 20);
  return out;
}
