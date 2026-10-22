import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
} from "react";
import type {
  Analysis,
  Rect,
  Rotation,
  Selection,
} from "../../../packages/engine/src/types.js";
import {
  initialSelections,
  fitRegion,
  moveRegion,
  resizeRegion,
} from "./lib/crop.js";
import { PagePreview } from "./PagePreview.js";
import { Icon } from "./Icon.js";
export function CropEditor({
  source,
  analysis,
  selections,
  onApply,
  onClose,
}: {
  source: Uint8Array;
  analysis: Analysis;
  selections?: Selection[];
  onApply: (s: Selection[]) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [choices, setChoices] = useState<Selection[]>(
    () => selections ?? initialSelections(analysis),
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState("");
  const drag = useRef<
    | {
        index: number;
        region: Rect;
        x: number;
        y: number;
        corner?: "nw" | "ne" | "sw" | "se";
        bounds: DOMRect;
      }
    | undefined
  >(undefined);
  const page = analysis.pages[pageIndex];
  const crops = choices
    .map((s, index) => ({ ...s, index }))
    .filter((s) => s.pageIndex === page.pageIndex && !s.skip && s.region);
  const crop = crops[Math.min(selected, crops.length - 1)];
  const skipped = !crops.length;
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      el.close();
    };
  }, []);
  function update(index: number, region: Rect) {
    setChoices((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, region: fitRegion(region, page) } : s,
      ),
    );
  }
  function begin(
    e: PointerEvent<HTMLElement>,
    index: number,
    corner?: "nw" | "ne" | "sw" | "se",
  ) {
    if (e.button !== 0 || !sheet.current) return;
    e.preventDefault();
    e.stopPropagation();
    setSelected(crops.findIndex((c) => c.index === index));
    drag.current = {
      index,
      region: { ...choices[index].region! },
      x: e.clientX,
      y: e.clientY,
      corner,
      bounds: sheet.current.getBoundingClientRect(),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = ((e.clientX - d.x) / d.bounds.width) * page.widthPt,
      dy = ((e.clientY - d.y) / d.bounds.height) * page.heightPt;
    update(
      d.index,
      d.corner
        ? resizeRegion(d.region, d.corner, dx, dy, page)
        : moveRegion(d.region, dx, dy, page),
    );
  }
  function keyMove(e: KeyboardEvent, index: number) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1,
      dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0,
      dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    update(
      index,
      e.altKey
        ? resizeRegion(choices[index].region!, "se", dx, dy, page)
        : moveRegion(choices[index].region!, dx, dy, page),
    );
  }
  function go(index: number) {
    setPageIndex(index);
    setSelected(0);
    setError("");
  }
  function skip(value: boolean) {
    setChoices((prev) => [
      ...prev.filter((s) => s.pageIndex !== page.pageIndex),
      ...(value
        ? [{ pageIndex: page.pageIndex, skip: true }]
        : initialSelections({ ...analysis, pages: [page] })),
    ]);
    setSelected(0);
  }
  function add() {
    setChoices((prev) => [
      ...prev.filter((s) => s.pageIndex !== page.pageIndex || !s.skip),
      {
        pageIndex: page.pageIndex,
        region: {
          x: page.widthPt * 0.2,
          y: page.heightPt * 0.2,
          width: page.widthPt * 0.45,
          height: page.heightPt * 0.55,
        },
        rotation: 0,
      },
    ]);
    setSelected(crops.length);
  }
  function remove() {
    if (!crop) return;
    setChoices((prev) => prev.filter((_, i) => i !== crop.index));
    setSelected(Math.max(0, selected - 1));
  }
  const total = choices.filter((c) => !c.skip && c.region).length;
  return (
    <dialog
      ref={dialog}
      className="crop-dialog"
      aria-labelledby="crop-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="editor-header">
        <div>
          <span className="eyebrow">A LITTLE FINE-TUNING</span>
          <h2 id="crop-title">THE CLEAN CUT.</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close crop editor"
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="editor-content">
        <div className="editor-preview-column">
          <div className="editor-page-nav">
            <button
              className="icon-button"
              onClick={() => go(pageIndex - 1)}
              disabled={!pageIndex}
              aria-label="Previous source page"
            >
              <Icon name="left" />
            </button>
            <label htmlFor="source-page" className="sr-only">
              Source page
            </label>
            <select
              id="source-page"
              value={pageIndex}
              onChange={(e) => go(Number(e.target.value))}
            >
              {analysis.pages.map((p, i) => (
                <option key={i} value={i}>
                  Page {i + 1} of {analysis.pages.length}
                  {p.status === "blank" ? " · blank" : ""}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              onClick={() => go(pageIndex + 1)}
              disabled={pageIndex >= analysis.pages.length - 1}
              aria-label="Next source page"
            >
              <Icon name="right" />
            </button>
          </div>
          <div
            className="source-sheet"
            ref={sheet}
            onPointerMove={move}
            onPointerUp={() => {
              drag.current = undefined;
            }}
            onPointerCancel={() => {
              drag.current = undefined;
            }}
          >
            <PagePreview
              source={source}
              pageIndex={page.pageIndex}
              width={page.widthPt}
              height={page.heightPt}
              onError={setError}
            >
              {crops.map((c, i) => {
                const r = c.region!;
                return (
                  <div
                    key={c.index}
                    role="group"
                    aria-label={`Crop ${i + 1}`}
                    className={`crop-box ${crop?.index === c.index ? "selected" : ""}`}
                    style={{
                      left: `${(r.x / page.widthPt) * 100}%`,
                      top: `${(r.y / page.heightPt) * 100}%`,
                      width: `${(r.width / page.widthPt) * 100}%`,
                      height: `${(r.height / page.heightPt) * 100}%`,
                    }}
                  >
                    <button
                      className="crop-move"
                      aria-label={`Move crop for label ${i + 1}`}
                      aria-describedby="crop-instructions"
                      onFocus={() => setSelected(i)}
                      onPointerDown={(e) => begin(e, c.index)}
                      onKeyDown={(e) => keyMove(e, c.index)}
                    />
                    <span className="crop-badge">{i + 1}</span>
                    {crop?.index === c.index &&
                      (["nw", "ne", "sw", "se"] as const).map((corner) => (
                        <button
                          key={corner}
                          className={`crop-handle ${corner}`}
                          aria-label={`Resize ${corner} corner of label ${i + 1}`}
                          onPointerDown={(e) => begin(e, c.index, corner)}
                          onKeyDown={(e) => keyMove(e, c.index)}
                        >
                          <span />
                        </button>
                      ))}
                  </div>
                );
              })}
            </PagePreview>
          </div>
          <p className="editor-instructions" id="crop-instructions">
            Drag the frame or its corners. Arrow keys move it; Shift moves
            faster. Alt + arrows resize.
          </p>
        </div>
        <aside className="editor-sidebar">
          <h3>
            Keep the label.
            <br />
            Leave the rest.
          </h3>
          <p>
            Select the whole shipping label, including every barcode. We’ll add
            the white margins.
          </p>
          <label className="review-check">
            <input
              type="checkbox"
              checked={skipped}
              disabled={page.status === "blank"}
              onChange={(e) => skip(e.target.checked)}
            />
            {page.status === "blank"
              ? "Blank page — skipped"
              : "Skip this page"}
          </label>
          {!!crops.length && (
            <>
              <label className="field-label" htmlFor="selected-crop">
                Label on this page
              </label>
              <select
                id="selected-crop"
                value={Math.min(selected, crops.length - 1)}
                onChange={(e) => setSelected(Number(e.target.value))}
              >
                {crops.map((_, i) => (
                  <option key={i} value={i}>
                    Label {i + 1} of {crops.length}
                  </option>
                ))}
              </select>
            </>
          )}
          {crop && (
            <>
              <div className="rotation-control">
                <span>Rotation: {crop.rotation ?? 0}°</span>
                <button
                  className="icon-button"
                  aria-label="Rotate label right"
                  onClick={() =>
                    setChoices((prev) =>
                      prev.map((s, i) =>
                        i === crop.index
                          ? {
                              ...s,
                              rotation: (((s.rotation ?? 0) + 90) %
                                360) as Rotation,
                            }
                          : s,
                      ),
                    )
                  }
                >
                  <Icon name="rotate" />
                </button>
              </div>
              <details className="fine-tune">
                <summary>Fine-tune the frame</summary>
                {(["x", "y", "width", "height"] as const).map((key, i) => {
                  const dimension = i % 2 === 0 ? page.widthPt : page.heightPt;
                  const r = crop.region!;
                  const maximum =
                    key === "x"
                      ? page.widthPt - r.width
                      : key === "y"
                        ? page.heightPt - r.height
                        : key === "width"
                          ? page.widthPt - r.x
                          : page.heightPt - r.y;
                  return (
                    <label key={key}>
                      {["Left edge", "Top edge", "Width", "Height"][i]}
                      <output>{Math.round((r[key] / dimension) * 100)}%</output>
                      <input
                        type="range"
                        min={key === "width" || key === "height" ? 12 : 0}
                        max={maximum}
                        step="0.5"
                        value={r[key]}
                        onChange={(e) =>
                          update(crop.index, {
                            ...r,
                            [key]: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  );
                })}
              </details>
              <button className="text-button remove-crop" onClick={remove}>
                <Icon name="close" size={16} /> Remove this crop
              </button>
            </>
          )}
          {page.status !== "blank" && (
            <button className="button secondary" onClick={add}>
              <Icon name="plus" size={18} /> Add another label
            </button>
          )}
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
        </aside>
      </div>
      <div className="editor-footer">
        <span>
          {total} {total === 1 ? "label" : "labels"} selected ·{" "}
          {analysis.pages.length} source{" "}
          {analysis.pages.length === 1 ? "page" : "pages"}
        </span>
        <div>
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button primary"
            disabled={!total || !!error}
            onClick={() =>
              onApply(
                analysis.pages.flatMap((p) =>
                  choices.filter((s) => s.pageIndex === p.pageIndex).length
                    ? choices.filter((s) => s.pageIndex === p.pageIndex)
                    : [{ pageIndex: p.pageIndex, skip: true }],
                ),
              )
            }
          >
            Use these crops <Icon name="arrow" size={18} />
          </button>
        </div>
      </div>
    </dialog>
  );
}
