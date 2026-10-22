import { it, expect } from "vitest";
import {
  fitRegion,
  moveRegion,
  resizeRegion,
  initialSelections,
} from "../src/lib/crop.js";
import type { Analysis } from "../../../packages/engine/src/types.js";
const page = { widthPt: 600, heightPt: 800 };
it("keeps a moved crop intact inside the page, including touch drags beyond the edge", () => {
  const result = moveRegion(
    { x: 10, y: 20, width: 200, height: 300 },
    -1000,
    2000,
    page,
  );
  expect(result).toEqual({ x: 0, y: 500, width: 200, height: 300 });
});
it("resizes the correct corner without moving the opposite corner or crossing the page", () => {
  const box = { x: 100, y: 100, width: 200, height: 300 };
  expect(resizeRegion(box, "nw", -200, -200, page)).toEqual({
    x: 0,
    y: 0,
    width: 300,
    height: 400,
  });
  const tiny = resizeRegion(box, "se", -1000, -1000, page);
  expect(tiny.width).toBeGreaterThanOrEqual(12);
  expect(tiny.height).toBeGreaterThanOrEqual(12);
  expect(fitRegion({ x: -10, y: -20, width: 700, height: 900 }, page)).toEqual({
    x: 0,
    y: 0,
    width: 600,
    height: 800,
  });
});
it("accounts for every page and preserves separate labels without duplicate suggestions", () => {
  const region = { x: 10, y: 20, width: 200, height: 300 };
  const candidate = (id: string, r = region) => ({
    id,
    pageIndex: 0,
    region: r,
    rotation: 0,
    confidence: "high",
    method: "isolated-region",
    reasons: [],
  });
  const analysis = {
    pages: [
      {
        pageIndex: 0,
        ...page,
        status: "needs_review",
        candidates: [
          candidate("a"),
          candidate("duplicate"),
          candidate("b", { ...region, x: 350 }),
        ],
      },
      { pageIndex: 1, ...page, status: "blank", candidates: [] },
    ],
  } as unknown as Analysis;
  const selections = initialSelections(analysis);
  expect(selections.filter((s) => s.pageIndex === 0)).toHaveLength(2);
  expect(selections.find((s) => s.pageIndex === 1)).toMatchObject({
    skip: true,
  });
});
