import { useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "./Icon.js";
export function Intake({
  onFile,
  onLink,
  onSample,
  error,
}: {
  onFile: (files: FileList | null) => void;
  onLink: (url: string) => void;
  onSample: () => void;
  error: string;
}) {
  const [tab, setTab] = useState<"upload" | "link">("upload");
  const [url, setUrl] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  function tabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      setTab(tab === "upload" ? "link" : "upload");
      const buttons =
        event.currentTarget.parentElement?.querySelectorAll("button");
      buttons?.[tab === "upload" ? 1 : 0]?.focus();
    }
  }
  return (
    <>
      <div className="tool-heading">
        <span className="eyebrow">01 / THE LABEL FORMATTER</span>
        <span className="live-dot" aria-hidden="true" />
      </div>
      <h2>LET’S TIDY THAT LABEL.</h2>
      <p className="tool-intro">Send it over. We’ll find its perfect fit.</p>
      <div
        className="input-tabs"
        role="tablist"
        aria-label="Choose how to add your PDF"
      >
        <button
          role="tab"
          id="tab-upload"
          aria-controls="panel-upload"
          aria-selected={tab === "upload"}
          tabIndex={tab === "upload" ? 0 : -1}
          onKeyDown={tabKey}
          onClick={() => setTab("upload")}
        >
          <Icon name="upload" /> Upload PDF
        </button>
        <button
          role="tab"
          id="tab-link"
          aria-controls="panel-link"
          aria-selected={tab === "link"}
          tabIndex={tab === "link" ? 0 : -1}
          onKeyDown={tabKey}
          onClick={() => setTab("link")}
        >
          <Icon name="link" /> Paste a link
        </button>
      </div>
      {tab === "upload" ? (
        <div role="tabpanel" id="panel-upload" aria-labelledby="tab-upload">
          <input
            ref={input}
            type="file"
            id="label-file"
            aria-label="Upload PDF"
            accept=".pdf,application/pdf"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => onFile(e.target.files)}
          />
          <button
            className={`drop-zone ${dragging ? "is-dragging" : ""}`}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFile(e.dataTransfer.files);
            }}
          >
            <span className="crop-corner tl" />
            <span className="crop-corner tr" />
            <span className="crop-corner bl" />
            <span className="crop-corner br" />
            <span className="upload-icon">
              <Icon name="upload" size={30} />
            </span>
            <strong>Drop your PDF here</strong>
            <span>
              or <span className="text-link">choose a file</span>
            </span>
            <small>PDF · UP TO 25 MB · 50 PAGES</small>
          </button>
        </div>
      ) : (
        <form
          role="tabpanel"
          id="panel-link"
          aria-labelledby="tab-link"
          className="link-form"
          onSubmit={(e) => {
            e.preventDefault();
            onLink(url);
          }}
        >
          <label htmlFor="pdf-link">Your direct PDF link</label>
          <input
            id="pdf-link"
            type="url"
            inputMode="url"
            required
            maxLength={8192}
            autoComplete="off"
            spellCheck={false}
            placeholder="https://…/your-label.pdf"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-describedby="link-help"
          />
          <p id="link-help">
            Use the PDF’s download link. Pages that need a sign-in won’t work.
          </p>
          <button className="button primary" type="submit">
            Format link <Icon name="arrow" />
          </button>
        </form>
      )}
      {error && (
        <p className="error-message" role="alert">
          <Icon name="alert" />
          {error}
        </p>
      )}
      <div className="sample-row">
        <span>Just looking?</span>
        <button className="text-button" onClick={onSample}>
          Try a sample label <Icon name="arrow" size={16} />
        </button>
      </div>
      <p className="privacy-note">
        <Icon name="shield" size={16} /> Uploaded PDFs stay on your device.{" "}
        <a
          href="#privacy"
          onClick={() => {
            const el = document.getElementById("privacy");
            if (el instanceof HTMLDetailsElement) el.open = true;
          }}
        >
          The details
        </a>
      </p>
    </>
  );
}
export function Processing({
  message,
  completed,
  total,
  onCancel,
}: {
  message: string;
  completed: number;
  total: number;
  onCancel: () => void;
}) {
  return (
    <div className="processing">
      <span className="eyebrow">A LITTLE TIDYING IN PROGRESS</span>
      <div className="processing-art" aria-hidden="true">
        <span className="processing-page">
          <Icon name="crop" size={50} />
        </span>
        <span className="processing-scan" />
      </div>
      <h2>
        MAKING ROOM
        <br />
        FOR YOUR LABEL.
      </h2>
      <p role="status" aria-live="polite">
        {message}
        {total > 1 ? ` (${completed}/${total})` : ""}
      </p>
      <div className="progress-track" aria-hidden="true">
        <span
          style={{
            width: total ? `${Math.max(5, (completed / total) * 100)}%` : "8%",
          }}
        />
      </div>
      <button className="text-button" onClick={onCancel}>
        Cancel
      </button>
      <p className="processing-footnote">
        Keep this tab open while your label is formatted.
      </p>
    </div>
  );
}
