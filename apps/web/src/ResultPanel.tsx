import { useEffect, useMemo, useRef, useState } from "react";
import type { Dpi } from "../../../packages/engine/src/types.js";
import { downloadName } from "./lib/downloads.js";
import type { Conversion } from "./lib/conversion.js";
import type { AgentDownload } from "./lib/webmcp.js";
import { Icon } from "./Icon.js";
export function ResultPanel({
  value,
  outputName,
  onOutputName,
  name,
  onReset,
  onEdit,
  onDpi,
  downloads,
  reviewAcknowledged: ack,
  onReviewAcknowledged: setAck,
}: {
  value: Conversion;
  outputName: string;
  onOutputName: (name: string) => void;
  name: string;
  onReset: () => void;
  onEdit: () => void;
  onDpi: (dpi: Dpi) => void;
  downloads: AgentDownload[];
  reviewAcknowledged: boolean;
  onReviewAcknowledged: (value: boolean) => void;
}) {
  const [index, setIndex] = useState(0);
  const [shareError, setShareError] = useState("");
  const stem = downloadName(outputName);
  const [draftName, setDraftName] = useState(outputName);
  useEffect(() => setDraftName(outputName), [outputName]);
  const zipUrl = downloads.find((d) => d.format === "zip")?.url;
  const heading = useRef<HTMLHeadingElement>(null);
  const links = {
    pdf: downloads.find((d) => d.format === "pdf")?.url,
    images: downloads.filter((d) => d.format === "png").map((d) => d.url),
  };
  useEffect(() => {
    setIndex(0);
    heading.current?.focus({ preventScroll: true });
  }, [value]);
  const selected = Math.min(index, value.images.length - 1);
  const review =
    value.prepared.report.status === "needs_review" ||
    value.images.some((i) => i.report.status === "needs_review");
  const allowed = !review || ack;
  const pdfFile = useMemo(
    () =>
      new File([new Uint8Array(value.prepared.pdf).buffer], `${stem}.pdf`, {
        type: "application/pdf",
      }),
    [value, stem],
  );
  const canShare =
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [pdfFile] });
  const downloadProps = allowed
    ? {}
    : {
        "aria-disabled": true as const,
        tabIndex: -1,
        onClick: (e: React.MouseEvent) => e.preventDefault(),
      };
  return (
    <>
      <div className="result-heading">
        <div className="tool-heading">
          <span className="eyebrow">02 / YOUR FORMATTED LABEL</span>
          <button
            className="icon-button"
            aria-label="Start a new PDF"
            onClick={onReset}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="result-title">
          <h2 ref={heading} tabIndex={-1}>
            {review ? "One last look." : "Looking good."}
          </h2>
          <span className={`status-chip ${review ? "review" : ""}`}>
            <Icon name={review ? "alert" : "check"} size={14} />
            {review ? "CHECK THE CROP" : "READY TO GO"}
          </span>
        </div>
        <p className="source-name" title={name}>
          {name}
        </p>
      </div>
      <div className="result-workspace">
        <div className="result-preview">
          <div className="label-preview-wrap">
            <span className="preview-dimension top-dimension">4 IN</span>
            <img
              className="label-preview"
              src={links.images[selected]}
              width="812"
              height="1218"
              alt={`Formatted shipping label ${selected + 1} of ${value.images.length}`}
            />
            <span className="preview-dimension side-dimension">6 IN</span>
            <span className="preview-note">EVEN MARGINS. A CLEAN FIT.</span>
          </div>
          <div className="preview-controls">
            <button className="text-button" onClick={onEdit}>
              <Icon name="crop" size={17} /> Adjust crop
            </button>
            <div className="label-pages">
              <button
                className="icon-button"
                disabled={selected === 0}
                aria-label="Previous label"
                onClick={() => setIndex(selected - 1)}
              >
                <Icon name="left" />
              </button>
              <span aria-live="polite">
                {selected + 1} / {value.images.length}
              </span>
              <button
                className="icon-button"
                disabled={selected >= value.images.length - 1}
                aria-label="Next label"
                onClick={() => setIndex(selected + 1)}
              >
                <Icon name="right" />
              </button>
            </div>
          </div>
        </div>
        <div className="result-actions">
          {review && (
            <div className="review-notice">
              <p>
                <Icon name="alert" size={18} />
                <strong>Check against your original.</strong>
              </p>
              <p>
                Make sure the whole label and every barcode are present and
                readable.
              </p>
              <label className="review-check">
                <input
                  type="checkbox"
                  checked={ack}
                  onChange={(e) => setAck(e.target.checked)}
                />{" "}
                I’ve checked the crop and all label details.
              </label>
            </div>
          )}
          <div className="output-name">
            <label htmlFor="output-name">File name</label>
            <input
              id="output-name"
              value={draftName}
              maxLength={120}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => {
                const name = downloadName(draftName);
                setDraftName(name);
                onOutputName(name);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder="label"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="resolution">
            <label htmlFor="resolution">PNG resolution</label>
            <select
              id="resolution"
              value={value.dpi}
              onChange={(e) => onDpi(Number(e.target.value) as Dpi)}
            >
              <option value={203}>203 DPI — standard</option>
              <option value={300}>300 DPI — high resolution</option>
            </select>
          </div>
          <div className="download-grid">
            <a
              className="button primary"
              href={allowed ? links.pdf : undefined}
              download={`${stem}.pdf`}
              {...downloadProps}
            >
              <Icon name="download" /> Download PDF
            </a>
            <a
              className="button secondary"
              href={allowed ? links.images[selected] : undefined}
              download={`${stem}${value.images.length > 1 ? `-${selected + 1}` : ""}.png`}
              {...downloadProps}
            >
              <Icon name="download" /> Download PNG
            </a>
          </div>
          <a
            className="bundle-link"
            href={allowed ? zipUrl : undefined}
            download={`${stem}.zip`}
            {...downloadProps}
          >
            <Icon name="zip" size={16} /> PDF + PNG
            {value.images.length > 1 ? "s" : ""} together{" "}
            <span>
              .ZIP · {value.images.length > 1 ? "ALL LABELS" : "BOTH FILES"}
            </span>
          </a>
          {canShare && (
            <button
              className="text-button native-share"
              disabled={!allowed}
              onClick={() =>
                void navigator
                  .share({ files: [pdfFile], title: "Your CropOtter label" })
                  .catch((e) => {
                    if (e.name !== "AbortError")
                      setShareError(
                        "Sharing could not open. You can download the PDF instead.",
                      );
                  })
              }
            >
              <Icon name="share" size={17} /> Share PDF
            </button>
          )}
          {shareError && (
            <p role="status" className="muted">
              {shareError}
            </p>
          )}
          <p className="result-footnote">
            PDF includes{" "}
            {value.images.length === 1
              ? "your label"
              : `all ${value.images.length} labels`}
            . PNG downloads the label shown.
          </p>
        </div>
      </div>
    </>
  );
}
