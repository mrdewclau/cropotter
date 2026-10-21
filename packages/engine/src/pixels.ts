import type { Raster, Rect } from "./types.js";

export function gray(data: Uint8ClampedArray, offset: number): number {
  const alpha = data[offset + 3] / 255;
  return Math.round(
    (0.299 * data[offset] +
      0.587 * data[offset + 1] +
      0.114 * data[offset + 2]) *
      alpha +
      255 * (1 - alpha),
  );
}
export function inkBounds(raster: Raster, threshold = 240): Rect | undefined {
  let minX = raster.width,
    minY = raster.height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < raster.height; y++)
    for (let x = 0; x < raster.width; x++)
      if (gray(raster.data, (y * raster.width + x) * 4) < threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
  return maxX < 0
    ? undefined
    : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
export function hasOutsideInk(
  raster: Raster,
  region: Rect,
  scale: number,
): boolean {
  const x0 = Math.floor(region.x * scale) - 2,
    y0 = Math.floor(region.y * scale) - 2,
    x1 = Math.ceil((region.x + region.width) * scale) + 2,
    y1 = Math.ceil((region.y + region.height) * scale) + 2;
  let count = 0;
  for (let y = 0; y < raster.height; y++)
    for (let x = 0; x < raster.width; x++)
      if (
        (x < x0 || x >= x1 || y < y0 || y >= y1) &&
        gray(raster.data, (y * raster.width + x) * 4) < 240
      ) {
        if (++count > 8) return true;
      }
  return false;
}
export function rasterRegions(raster: Raster, scale: number): Rect[] {
  const all = inkBounds(raster);
  if (!all) return [];
  const regions: Rect[] = [];
  const visit = (r: Rect, depth: number) => {
    if (depth >= 3) {
      regions.push(r);
      return;
    }
    let best:
      | { axis: "x" | "y"; start: number; end: number; length: number }
      | undefined;
    for (const axis of ["x", "y"] as const) {
      const start = Math.ceil(axis === "x" ? r.x : r.y),
        end = Math.floor(axis === "x" ? r.x + r.width : r.y + r.height);
      let gap = -1;
      for (let p = start; p <= end; p++) {
        let occupied = false;
        if (p < end)
          for (
            let q = Math.ceil(axis === "x" ? r.y : r.x);
            q < Math.floor(axis === "x" ? r.y + r.height : r.x + r.width);
            q++
          ) {
            const x = axis === "x" ? p : q,
              y = axis === "x" ? q : p;
            if (gray(raster.data, (y * raster.width + x) * 4) < 240) {
              occupied = true;
              break;
            }
          }
        if (!occupied && p < end) {
          if (gap < 0) gap = p;
        } else if (gap >= 0) {
          const length = p - gap;
          if (
            gap > start &&
            p < end &&
            length >= 12 * scale &&
            (!best || length > best.length)
          )
            best = { axis, start: gap, end: p, length };
          gap = -1;
        }
      }
    }
    if (!best) {
      regions.push(r);
      return;
    }
    const b = best;
    if (b.axis === "x") {
      visit({ ...r, width: b.start - r.x }, depth + 1);
      visit({ ...r, x: b.end, width: r.x + r.width - b.end }, depth + 1);
    } else {
      visit({ ...r, height: b.start - r.y }, depth + 1);
      visit({ ...r, y: b.end, height: r.y + r.height - b.end }, depth + 1);
    }
  };
  visit(all, 0);
  return regions
    .filter((r) => r.width / scale > 30 && r.height / scale > 30)
    .map((r) => ({
      x: r.x / scale,
      y: r.y / scale,
      width: r.width / scale,
      height: r.height / scale,
    }));
}
export function packMono(raster: Raster) {
  const stride = Math.ceil(raster.width / 8),
    data = new Uint8Array(stride * raster.height);
  const pixels = new Uint8ClampedArray(raster.data.length);
  pixels.fill(255);
  for (let y = 0; y < raster.height; y++)
    for (let x = 0; x < raster.width; x++) {
      const i = (y * raster.width + x) * 4;
      if (gray(raster.data, i) < 128) {
        data[y * stride + (x >> 3)] |= 0x80 >> (x & 7);
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
      }
    }
  return {
    stride,
    data,
    pixels: { width: raster.width, height: raster.height, data: pixels },
  };
}
export async function digest(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new Uint8Array(bytes).buffer,
  );
  return Array.from(new Uint8Array(hash), (v) =>
    v.toString(16).padStart(2, "0"),
  ).join("");
}
