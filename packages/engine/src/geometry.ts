import { EngineError } from "./errors.js";
import type { Dpi, Matrix, Rect, Rotation } from "./types.js";

export const PAGE_WIDTH = 288;
export const PAGE_HEIGHT = 432;
export const MARGIN = 9;
export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];
export function fitToLabel(
  width: number,
  height: number,
): Rect & { scale: number } {
  if (![width, height].every((n) => Number.isFinite(n) && n > 0))
    throw new EngineError(
      "INVALID_SELECTION",
      "Region dimensions must be positive finite numbers.",
    );
  const scale = Math.min(
    (PAGE_WIDTH - 2 * MARGIN) / width,
    (PAGE_HEIGHT - 2 * MARGIN) / height,
  );
  return {
    x: (PAGE_WIDTH - width * scale) / 2,
    y: (PAGE_HEIGHT - height * scale) / 2,
    width: width * scale,
    height: height * scale,
    scale,
  };
}
export function rasterProfile(dpi: Dpi) {
  if (dpi !== 203 && dpi !== 300)
    throw new EngineError(
      "INVALID_SELECTION",
      "Resolution must be 203 or 300 DPI.",
    );
  return { dpi, width: dpi * 4, height: dpi * 6, margin: Math.ceil(dpi / 8) };
}
export function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
export function transformPoint(
  m: Matrix,
  x: number,
  y: number,
): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
export function invertMatrix(m: Matrix): Matrix {
  const d = m[0] * m[3] - m[1] * m[2];
  if (!Number.isFinite(d) || Math.abs(d) < 1e-12)
    throw new EngineError("INVALID_SELECTION", "Invalid coordinate transform.");
  return [
    m[3] / d,
    -m[1] / d,
    -m[2] / d,
    m[0] / d,
    (m[2] * m[5] - m[3] * m[4]) / d,
    (m[1] * m[4] - m[0] * m[5]) / d,
  ];
}
export function rotationMatrix(
  rotation: Rotation,
  width: number,
  height: number,
): Matrix {
  switch (rotation) {
    case 0:
      return [...IDENTITY];
    case 90:
      return [0, 1, -1, 0, height, 0];
    case 180:
      return [-1, 0, 0, -1, width, height];
    case 270:
      return [0, -1, 1, 0, 0, width];
    default:
      throw new EngineError(
        "INVALID_SELECTION",
        "Rotation must be a quarter turn.",
      );
  }
}
export function transformRect(m: Matrix, r: Rect): Rect {
  const pts = [
    [r.x, r.y],
    [r.x + r.width, r.y],
    [r.x, r.y + r.height],
    [r.x + r.width, r.y + r.height],
  ].map(([x, y]) => transformPoint(m, x, y));
  const xs = pts.map((p) => p[0]),
    ys = pts.map((p) => p[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}
export function contains(outer: Rect, inner: Rect, epsilon = 0.05): boolean {
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.width <= outer.x + outer.width + epsilon &&
    inner.y + inner.height <= outer.y + outer.height + epsilon
  );
}
export function validateRect(r: Rect, width: number, height: number): void {
  if (
    ![r.x, r.y, r.width, r.height].every(Number.isFinite) ||
    r.width <= 0 ||
    r.height <= 0 ||
    !contains({ x: 0, y: 0, width, height }, r)
  )
    throw new EngineError(
      "INVALID_SELECTION",
      "The crop must be a positive rectangle inside the visible page.",
    );
}
