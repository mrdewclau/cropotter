import { useEffect, useRef } from "react";
import { Icon } from "./Icon.js";

export function HelpDialog({
  section,
  onClose,
}: {
  section: "help" | "privacy";
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const el = dialog.current!;
    el.showModal();
    return () => {
      el.close();
      if (previous instanceof HTMLElement)
        previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="help-dialog"
      aria-labelledby="help-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header className="editor-header">
        <h2 id="help-title">
          {section === "privacy" ? "Your label stays yours." : "A little help."}
        </h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close help"
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="help-content">
        {section === "privacy" ? (
          <>
            <p>
              Uploaded PDFs are formatted on your device. They are not uploaded
              to our server.
            </p>
            <p>
              When you paste a public PDF link, our server fetches it and passes
              it back without storing it. We keep no label history or account
              database, and use no analytics or advertising trackers.
            </p>
            <p>
              Start a new PDF or close the tab to release the label. Downloads
              remain wherever you save them.
            </p>
          </>
        ) : (
          <>
            <h3>Upload. Check. Download.</h3>
            <p>
              Choose a shipping-label PDF or paste its direct HTTPS download
              link. Files can be up to 25 MB and 50 pages.
            </p>
            <h3>Make it fit.</h3>
            <p>
              We preserve proportions and fit your label onto portrait 4 × 6
              inch paper, with at least ⅛ inch of white margin. Use Adjust crop
              to select the whole label, including every barcode. Review any
              flagged crop before downloading.
            </p>
            <h3>Ready for your printer.</h3>
            <p>
              Download PDF for printing, PNG at 203 or 300 DPI, or both in a
              ZIP. In your PDF viewer choose 4 × 6 paper and actual size (100%).
              Direct printer connections are not available yet.
            </p>
            <h3>Link not opening?</h3>
            <p>
              The link must return the PDF itself. Sign-in pages, sharing pages
              and expired links will not work. Download the file from the
              sender, then upload it here.
            </p>
            <h3>Use with AI agents.</h3>
            <p>
              Compatible browser agents can use this page's tools. For local MCP
              and the executable skill, open the{" "}
              <a href="/agents/">agent guide and downloads</a>. Conversions run
              in your browser or agent runtime.
            </p>
          </>
        )}
      </div>
    </dialog>
  );
}
