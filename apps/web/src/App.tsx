import { useEffect, useRef, useState } from "react";
import type {
  Analysis,
  Dpi,
  Progress,
  Selection,
} from "../../../packages/engine/src/types.js";
import { Intake, Processing } from "./Converter.js";
import { ResultPanel } from "./ResultPanel.js";
import { CropEditor } from "./CropEditor.js";
import { HeroScene } from "./HeroScene.js";
import { Icon } from "./Icon.js";
import {
  convert,
  exportConversion,
  getEngine,
  type Conversion,
} from "./lib/conversion.js";
import { friendlyError, validateFile, validateLink } from "./lib/input.js";

const PROGRESS: Record<Progress["stage"], string> = {
  loading: "Opening your PDF",
  analyzing: "Finding the label",
  composing: "Making a clean 4 × 6 fit",
  validating: "Checking the cropped label",
  exporting: "Preparing your downloads",
};
type Source = { name: string; bytes: Uint8Array };
export function App() {
  const [source, setSource] = useState<Source>();
  const [result, setResult] = useState<Conversion>();
  const [analysis, setAnalysis] = useState<Analysis>();
  const [selections, setSelections] = useState<Selection[]>();
  const [busy, setBusy] = useState<{
    message: string;
    completed: number;
    total: number;
  }>();
  const [error, setError] = useState("");
  const current = useRef<{ id: number; controller: AbortController }>({
    id: 0,
    controller: new AbortController(),
  });
  const tool = useRef<HTMLElement>(null);
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      current.current.controller.abort();
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);
  function start(message: string) {
    current.current.controller.abort();
    const job = {
      id: current.current.id + 1,
      controller: new AbortController(),
    };
    current.current = job;
    setError("");
    setBusy({ message, completed: 0, total: 1 });
    return job;
  }
  function active(id: number) {
    return (
      id === current.current.id && !current.current.controller.signal.aborted
    );
  }
  function cancel() {
    current.current.controller.abort();
    current.current.id++;
    setBusy(undefined);
  }
  function reset() {
    cancel();
    setResult(undefined);
    setSource(undefined);
    setAnalysis(undefined);
    setSelections(undefined);
    setError("");
  }
  function progress(id: number) {
    return (p: Progress) => {
      if (active(id))
        setBusy({
          message: PROGRESS[p.stage],
          completed: p.completed,
          total: p.total,
        });
    };
  }
  async function format(
    value: Source,
    job: ReturnType<typeof start>,
    choices?: Selection[],
    dpi: Dpi = 203,
  ) {
    const converted = await convert(value.bytes, value.name, dpi, choices, {
      signal: job.controller.signal,
      onProgress: progress(job.id),
    });
    if (!active(job.id)) return;
    if ("prepared" in converted) {
      setResult(converted);
      setAnalysis(undefined);
    } else {
      if (converted.pages.every((p) => p.status === "blank"))
        throw new Error(
          "That PDF looks blank. Choose a PDF with a visible shipping label.",
        );
      setResult(undefined);
      setAnalysis(converted);
    }
  }
  async function load(
    loadSource: (signal: AbortSignal) => Promise<Source>,
    message: string,
  ) {
    const job = start(message);
    setResult(undefined);
    setAnalysis(undefined);
    setSelections(undefined);
    setSource(undefined);
    try {
      const value = await loadSource(job.controller.signal);
      if (!active(job.id)) return;
      setSource(value);
      await format(value, job);
    } catch (e) {
      if (active(job.id)) setError(friendlyError(e));
    } finally {
      if (active(job.id)) setBusy(undefined);
    }
  }
  function fromFiles(files: FileList | null) {
    if (!files?.length) return;
    if (files.length !== 1) {
      setError("Choose one PDF at a time. A PDF can contain multiple labels.");
      return;
    }
    const file = files[0];
    void load(async () => {
      validateFile(file);
      return {
        name: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
      };
    }, "Opening your PDF");
  }
  function fromLink(value: string) {
    void load(async (signal) => {
      const url = validateLink(value);
      const response = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.message ||
            "That PDF could not be opened. Try uploading the file instead.",
        );
      }
      return {
        name: "linked-label.pdf",
        bytes: new Uint8Array(await response.arrayBuffer()),
      };
    }, "Fetching your PDF");
  }
  function sample() {
    void load(async (signal) => {
      const response = await fetch("/sample-label.pdf", { signal });
      if (!response.ok)
        throw Error("The sample could not load. Please try again.");
      return {
        name: "sample-label.pdf",
        bytes: new Uint8Array(await response.arrayBuffer()),
      };
    }, "Opening the sample label");
  }
  async function edit() {
    if (!source) return;
    const job = start("Opening the crop editor");
    try {
      const next =
        result?.analysis ??
        (await (
          await getEngine()
        ).analyze(source.bytes, {
          signal: job.controller.signal,
          onProgress: progress(job.id),
        }));
      if (active(job.id)) setAnalysis(next);
    } catch (e) {
      if (active(job.id)) setError(friendlyError(e));
    } finally {
      if (active(job.id)) setBusy(undefined);
    }
  }
  async function apply(choices: Selection[]) {
    if (!source) return;
    setAnalysis(undefined);
    setSelections(choices);
    const job = start("Applying your crop");
    try {
      await format(source, job, choices, result?.dpi ?? 203);
    } catch (e) {
      if (active(job.id)) setError(friendlyError(e));
    } finally {
      if (active(job.id)) setBusy(undefined);
    }
  }
  async function changeDpi(dpi: Dpi) {
    if (!result || !source) return;
    const job = start("Preparing your images");
    try {
      const next = await exportConversion(
        result.prepared,
        source.name,
        dpi,
        { signal: job.controller.signal, onProgress: progress(job.id) },
        result.analysis,
      );
      if (active(job.id)) setResult(next);
    } catch (e) {
      if (active(job.id)) setError(friendlyError(e));
    } finally {
      if (active(job.id)) setBusy(undefined);
    }
  }
  return (
    <>
      <a className="skip-link" href="#converter">
        Skip to label formatter
      </a>
      <div className="site-shell">
        <header className="site-header">
          <a href="#" className="brand" aria-label="CropOtter home">
            <img
              src="/brand/CropOtter-CO-icon.svg"
              width="48"
              height="48"
              alt=""
            />
            <span>CropOtter</span>
          </a>
          <nav aria-label="Main navigation">
            <a className="desktop-link" href="#how-it-works">
              How it works
            </a>
            <a href="#faq">Help</a>
            <a className="button nav-button" href="#converter">
              Format a label <Icon name="arrow" size={18} />
            </a>
          </nav>
        </header>
        <main>
          <section className="hero" aria-label="Format your shipping label">
            <div className="hero-lead">
              <p className="eyebrow hero-eyebrow">
                <span /> A CLEAN CUT. A BETTER SEND-OFF.
              </p>
              <h1>
                YOUR LABELS.
                <br />
                <span>READY TO GO.</span>
              </h1>
              <p className="hero-description">
                Big PDF? Awkward margins? Let’s fix that.
                <br className="desktop-break" /> Turn your shipping label into a
                tidy 4 × 6.
              </p>
              <HeroScene />
              <div className="hero-caption">
                <span className="orange-square" /> LESS FUSS. MORE SEND.
              </div>
            </div>
            <section
              id="converter"
              ref={tool}
              className={`converter ${result && !busy ? "has-result" : ""}`}
              aria-label="Label formatter"
              aria-busy={!!busy}
              tabIndex={-1}
            >
              {busy ? (
                <Processing {...busy} onCancel={cancel} />
              ) : result ? (
                <ResultPanel
                  value={result}
                  name={source?.name ?? "Your PDF"}
                  onReset={reset}
                  onEdit={() => void edit()}
                  onDpi={(dpi) => void changeDpi(dpi)}
                />
              ) : (
                <Intake
                  onFile={fromFiles}
                  onLink={fromLink}
                  onSample={sample}
                  error={error}
                />
              )}
              {result && error && !busy && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
            </section>
          </section>
          <div className="benefit-strip">
            <span>
              <Icon name="crop" /> A proper 4 × 6 fit
            </span>
            <span>
              <Icon name="check" /> Room on every side
            </span>
            <span>
              <Icon name="download" /> PDF + PNG downloads
            </span>
            <span>
              <Icon name="shield" /> No account needed
            </span>
          </div>
          <section id="how-it-works" className="how-section">
            <div className="section-intro">
              <p className="eyebrow">FROM MESSY PDF TO READY-TO-GO LABEL</p>
              <h2>
                THREE SMALL STEPS.
                <br />
                ONE LESS THING TO DO.
              </h2>
              <p>
                For the label on a full page, the link in your inbox,
                <br className="desktop-break" /> and the package waiting by the
                door.
              </p>
            </div>
            <div className="steps">
              <article>
                <span className="step-number">01</span>
                <h3>SEND IT OVER.</h3>
                <p>
                  Drop in a PDF, choose a file, or paste its direct download
                  link.
                </p>
              </article>
              <article>
                <span className="step-number">02</span>
                <h3>GIVE IT A CLEAN CUT.</h3>
                <p>
                  We find the label and fit it to 4 × 6. Want to fine-tune it?
                  Adjust the crop.
                </p>
              </article>
              <article>
                <span className="step-number">03</span>
                <h3>TAKE IT AWAY.</h3>
                <p>
                  Download a PDF for printing, a PNG for sharing, or both
                  together.
                </p>
              </article>
            </div>
          </section>
          <section className="mailroom-note">
            <div>
              <p className="eyebrow">A LITTLE ORDER FOR YOUR PACKING TABLE</p>
              <h2>
                THE LABEL IS THE IMPORTANT BIT.
                <br />
                LET’S MAKE ROOM FOR IT.
              </h2>
            </div>
            <img
              src="/brand/CropOtter-stamp-web.webp"
              width="240"
              height="178"
              alt="CropOtter mailroom stamp"
              loading="lazy"
            />
          </section>
          <section id="faq" className="faq-section">
            <div className="section-intro">
              <p className="eyebrow">A FEW THINGS, BEFORE YOU SEND</p>
              <h2>GOOD QUESTIONS.</h2>
              <p>Here’s what to know about your next clean cut.</p>
            </div>
            <div className="faq-list">
              <details>
                <summary>
                  What PDFs can I use?<span aria-hidden="true">+</span>
                </summary>
                <p>
                  Use a shipping-label PDF, including a label sitting on a
                  full-size page. If the crop needs a closer look, you can
                  adjust it before downloading. The limit is 25 MB and 50 pages
                  per PDF.
                </p>
              </details>
              <details>
                <summary>
                  What size will my label be?<span aria-hidden="true">+</span>
                </summary>
                <p>
                  A portrait 4 × 6 inch label, with at least ⅛ inch of white
                  space on every side. We keep its proportions so the content
                  stays in shape. PNGs are available at 203 or 300 DPI.
                </p>
              </details>
              <details>
                <summary>
                  Can I print straight to my label printer?
                  <span aria-hidden="true">+</span>
                </summary>
                <p>
                  For now, download the PDF and print it from your usual PDF
                  viewer. Choose 4 × 6 inch paper and actual size (100%). A
                  direct printer connection is planned for a later release.
                </p>
              </details>
              <details>
                <summary>
                  Why won’t my pasted link open?
                  <span aria-hidden="true">+</span>
                </summary>
                <p>
                  We need a public HTTPS link that returns the PDF itself. A
                  sign-in page, a sharing page or an expired download link won’t
                  work. Download the PDF from the sender, then upload that file
                  here.
                </p>
              </details>
              <details id="privacy">
                <summary>
                  What happens to my shipping label?
                  <span aria-hidden="true">+</span>
                </summary>
                <p>
                  Uploaded files are formatted in your browser and are not sent
                  to our server. If you paste a link, our server fetches the PDF
                  and passes it back to your browser without storing it. We
                  don’t keep a label history or account database. Clear the
                  result or close the tab to release the label from this page.
                </p>
                <p>
                  Your downloads remain wherever you choose to save them. No
                  analytics or advertising trackers are included in this
                  website.
                </p>
              </details>
            </div>
          </section>
        </main>
        <footer className="site-footer">
          <a href="#" className="brand footer-brand">
            <img
              src="/brand/CropOtter-CO-icon.svg"
              width="36"
              height="36"
              alt=""
            />
            <span>CropOtter</span>
          </a>
          <span className="eyebrow">LESS FUSS. MORE SEND.</span>
          <div>
            <a href="#faq">Help</a>
            <a
              href="#privacy"
              onClick={() => {
                const el = document.getElementById("privacy");
                if (el instanceof HTMLDetailsElement) el.open = true;
              }}
            >
              Privacy
            </a>
            <span>© {new Date().getFullYear()} CropOtter</span>
          </div>
        </footer>
        <div className="postal-edge" aria-hidden="true" />
      </div>
      {analysis && source && (
        <CropEditor
          source={source.bytes}
          analysis={analysis}
          selections={selections}
          onApply={(choices) => void apply(choices)}
          onClose={() => {
            setAnalysis(undefined);
            if (!result) reset();
          }}
        />
      )}
    </>
  );
}
