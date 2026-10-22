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
import { HelpDialog } from "./HelpDialog.js";
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
  const [help, setHelp] = useState<"help" | "privacy">();
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
          <a
            href="#"
            className="brand"
            aria-label="CropOtter home"
            onClick={(e) => {
              e.preventDefault();
              reset();
            }}
          >
            <img
              src="/brand/CropOtter-CO-icon.svg"
              width="36"
              height="36"
              alt=""
            />
            <span>CropOtter</span>
          </a>
          <span className="header-purpose">YOUR LABELS. READY TO GO.</span>
          <nav aria-label="Main navigation">
            <button
              className="text-button"
              onClick={(e) => {
                e.currentTarget.focus();
                setHelp("help");
              }}
            >
              Help
            </button>
            <button
              className="text-button"
              onClick={(e) => {
                e.currentTarget.focus();
                setHelp("privacy");
              }}
            >
              Privacy
            </button>
          </nav>
        </header>
        <main className="app-workspace">
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
                onPrivacy={() => setHelp("privacy")}
                error={error}
              />
            )}
            {result && error && !busy && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </section>
        </main>
        <footer className="app-status">
          <span>
            <Icon name="shield" size={14} /> On your device. No account needed.
          </span>
        </footer>
      </div>
      {help && <HelpDialog section={help} onClose={() => setHelp(undefined)} />}
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
