import { describe, expect, it } from "vitest";
import * as geometry from "../src/geometry.js";

describe("label geometry", () => {
  it("fits a 4 x 6 region without stretching and preserves white margins", () => {
    const fit = geometry.fitToLabel(288, 432);
    expect(fit).toEqual({
      x: 9,
      y: 13.5,
      width: 270,
      height: 405,
      scale: 0.9375,
    });
  });
  it("returns exact raster sizes and rounds safe margins inward", () => {
    expect(geometry.rasterProfile(203)).toEqual({
      dpi: 203,
      width: 812,
      height: 1218,
      margin: 26,
    });
    expect(geometry.rasterProfile(300)).toEqual({
      dpi: 300,
      width: 1200,
      height: 1800,
      margin: 38,
    });
  });
  it("transforms points through all four rotations and their inverse", () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const m = geometry.rotationMatrix(rotation, 288, 432);
      const out = geometry.transformPoint(m, 17, 29);
      const original = geometry.transformPoint(
        geometry.invertMatrix(m),
        ...out,
      );
      expect(original[0]).toBeCloseTo(17);
      expect(original[1]).toBeCloseTo(29);
    }
  });
  it("rejects invalid dimensions rather than generating corrupt placements", () => {
    expect(() => geometry.fitToLabel(0, 432)).toThrow();
    expect(() => geometry.fitToLabel(NaN, 432)).toThrow();
  });
});
