import type {
  Analysis,
  Rect,
  Selection,
  PageAnalysis,
} from "../../../../packages/engine/src/types.js";
type PageSize = Pick<PageAnalysis, "widthPt" | "heightPt">;
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(v, max));
export function fitRegion(region: Rect, page: PageSize): Rect {
  const width = clamp(region.width, Math.min(12, page.widthPt), page.widthPt),
    height = clamp(region.height, Math.min(12, page.heightPt), page.heightPt);
  return {
    x: clamp(region.x, 0, page.widthPt - width),
    y: clamp(region.y, 0, page.heightPt - height),
    width,
    height,
  };
}
export function moveRegion(
  region: Rect,
  dx: number,
  dy: number,
  page: PageSize,
): Rect {
  return fitRegion({ ...region, x: region.x + dx, y: region.y + dy }, page);
}
export function resizeRegion(
  region: Rect,
  corner: "nw" | "ne" | "sw" | "se",
  dx: number,
  dy: number,
  page: PageSize,
): Rect {
  const left = corner.includes("w")
    ? clamp(region.x + dx, 0, region.x + region.width - 12)
    : region.x;
  const top = corner.includes("n")
    ? clamp(region.y + dy, 0, region.y + region.height - 12)
    : region.y;
  const right = corner.includes("e")
    ? clamp(region.x + region.width + dx, left + 12, page.widthPt)
    : region.x + region.width;
  const bottom = corner.includes("s")
    ? clamp(region.y + region.height + dy, top + 12, page.heightPt)
    : region.y + region.height;
  return fitRegion(
    { x: left, y: top, width: right - left, height: bottom - top },
    page,
  );
}
export function initialSelections(analysis: Analysis): Selection[] {
  return analysis.pages.flatMap<Selection>((page) => {
    if (page.status === "blank")
      return [{ pageIndex: page.pageIndex, skip: true }];
    const choices = [...page.candidates].sort(
      (a, b) =>
        (a.confidence === "high" ? 0 : 1) - (b.confidence === "high" ? 0 : 1) ||
        a.region.width * a.region.height - b.region.width * b.region.height,
    );
    const kept: typeof choices = [];
    for (const candidate of choices) {
      const r = candidate.region;
      if (
        !kept.some((other) => {
          const s = other.region;
          const overlap =
            Math.max(
              0,
              Math.min(r.x + r.width, s.x + s.width) - Math.max(r.x, s.x),
            ) *
            Math.max(
              0,
              Math.min(r.y + r.height, s.y + s.height) - Math.max(r.y, s.y),
            );
          return (
            overlap / Math.min(r.width * r.height, s.width * s.height) > 0.75
          );
        })
      )
        kept.push(candidate);
    }
    return (
      kept.length
        ? kept.map((c) => ({ region: c.region, rotation: c.rotation }))
        : [
            {
              region: page.inkBounds ?? {
                x: 0,
                y: 0,
                width: page.widthPt,
                height: page.heightPt,
              },
              rotation: 0 as const,
            },
          ]
    ).map((s) => ({
      ...s,
      pageIndex: page.pageIndex,
      region: fitRegion(s.region, page),
    }));
  });
}
