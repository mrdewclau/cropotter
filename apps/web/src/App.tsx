import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import { bytesUrl, downloadName, makeArchive } from "./lib/downloads.js";
import {
  bindWebMCP,
  type AgentController,
  type AgentDownload,
  type AgentSnapshot,
  type ModelContextDocument,
} from "./lib/webmcp.js";
import {
  convert,
  exportConversion,
  getEngine,
  type Conversion,
} from "./lib/conversion.js";
import {
  fileStem,
  friendlyError,
  validateFile,
  validateLink,
} from "./lib/input.js";

const PROGRESS: Record<Progress["stage"], string> = {
  loading: "Opening your PDF",
  analyzing: "Finding the label",
  composing: "Making a clean 4 × 6 fit",
  validating: "Checking the cropped label",
  exporting: "Preparing your downloads",
};
type Source = { name: string; bytes: Uint8Array };
export function App() {
  const [outputName, setOutputName] = useState("");
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
  const [reviewedResult, setReviewedResult] = useState<Conversion>();
  const reviewAcknowledged = !!result && reviewedResult === result;
  function setReviewAcknowledged(value: boolean) {
    setReviewedResult(value ? result : undefined);
  }
  const bridgeTransactions = useRef(0);
  // A browser tool must observe the same committed result as the visible UI.
  function publish(change: () => void) {
    if (bridgeTransactions.current) flushSync(change);
    else change();
  }
  const running = useRef(false);
  const cleared = useRef(true);
  const sourceVersion = useRef(0);
  const current = useRef<{ id: number; controller: AbortController }>({
    id: 0,
    controller: new AbortController(),
  });
  const tool = useRef<HTMLElement>(null);
  const downloads = useMemo<AgentDownload[]>(() => {
    if (!result) return [];
    const stem = downloadName(outputName);
    const zip = makeArchive(
      stem,
      result.prepared.pdf,
      result.images.map((image, i) => ({
        name: `${stem}-${String(i + 1).padStart(3, "0")}-${result.dpi}dpi.png`,
        data: image.data,
      })),
      `${stem}.pdf`,
    );
    return [
      {
        format: "pdf",
        filename: `${stem}.pdf`,
        mimeType: "application/pdf",
        url: bytesUrl(result.prepared.pdf, "application/pdf"),
        bytes: result.prepared.pdf.byteLength,
      },
      ...result.images.map(
        (image, i): AgentDownload => ({
          format: "png",
          filename: `${stem}${result.images.length > 1 ? `-${i + 1}` : ""}.png`,
          mimeType: "image/png",
          url: bytesUrl(image.data, "image/png"),
          bytes: image.data.byteLength,
          label: i + 1,
        }),
      ),
      {
        format: "zip",
        filename: `${stem}.zip`,
        mimeType: "application/zip",
        url: bytesUrl(zip, "application/zip"),
        bytes: zip.byteLength,
      },
    ];
  }, [result, outputName]);
  useEffect(
    () => () => downloads.forEach((d) => URL.revokeObjectURL(d.url)),
    [downloads],
  );
  const view = useRef({
    source,
    result,
    analysis,
    error,
    outputName,
    reviewAcknowledged,
    downloads,
  });
  view.current = {
    source,
    result,
    analysis,
    error,
    outputName,
    reviewAcknowledged,
    downloads,
  };
  function snapshot(): AgentSnapshot {
    const state = view.current;
    const reviewRequired =
      !!state.result &&
      (state.result.prepared.report.status === "needs_review" ||
        state.result.images.some((i) => i.report.status === "needs_review"));
    return {
      status: running.current
        ? "processing"
        : state.error
          ? "error"
          : cleared.current || !state.source
            ? "empty"
            : state.analysis
              ? "review_open"
              : !state.result || reviewRequired
                ? "needs_review"
                : "ready",
      documentId:
        !cleared.current && state.source ? String(sourceVersion.current) : null,
      labelCount: state.result?.prepared.labels.length ?? 0,
      dpi: state.result?.dpi ?? 203,
      filename: downloadName(state.outputName),
      reviewRequired,
      reviewAcknowledged: state.reviewAcknowledged,
      warnings: state.result?.prepared.report.warnings,
    };
  }
  async function agentOperation(
    action: () => Promise<void>,
    signal: AbortSignal,
  ) {
    signal.throwIfAborted();
    bridgeTransactions.current++;
    const work = action();
    const ownedJob = current.current.id;
    const abort = () => {
      if (current.current.id === ownedJob) cancel();
    };
    signal.addEventListener("abort", abort, { once: true });
    const checkOwnership = () => {
      signal.throwIfAborted();
      if (current.current.id !== ownedJob)
        throw new DOMException(
          "The operation was cancelled or replaced.",
          "AbortError",
        );
    };
    try {
      await work;
      checkOwnership();
      if (view.current.error)
        throw new Error("The page could not complete the operation.");
    } finally {
      bridgeTransactions.current--;
      signal.removeEventListener("abort", abort);
    }
  }
  const agentController = useRef<AgentController>(null!);
  agentController.current = {
    snapshot,
    loadSample: (signal) => agentOperation(sample, signal),
    configure: async (options, signal) => {
      if (!view.current.result || view.current.analysis)
        throw new Error("Finish crop review first.");
      await agentOperation(async () => {
        if (options.filename !== undefined)
          publish(() => setOutputName(downloadName(options.filename!)));
        if (
          options.dpi !== undefined &&
          options.dpi !== view.current.result?.dpi
        )
          await changeDpi(options.dpi);
      }, signal);
    },
    openReview: (signal) => agentOperation(edit, signal),
    downloads: () => view.current.downloads,
    download: (format, label) => {
      const file = view.current.downloads.find(
        (d) => d.format === format && (format !== "png" || d.label === label),
      );
      if (!file) throw new Error("That output is unavailable.");
      const link = document.createElement("a");
      link.href = file.url;
      link.download = file.filename;
      document.body.append(link);
      link.click();
      link.remove();
    },
  };
  useEffect(() => {
    const facade: AgentController = {
      snapshot: () => agentController.current.snapshot(),
      loadSample: (s) => agentController.current.loadSample(s),
      configure: (o, s) => agentController.current.configure(o, s),
      openReview: (s) => agentController.current.openReview(s),
      downloads: () => agentController.current.downloads(),
      download: (f, l) => agentController.current.download(f, l),
    };
    const binding = bindWebMCP(
      facade,
      document as unknown as ModelContextDocument,
    );
    return binding.dispose;
  }, []);
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
    running.current = true;
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
    running.current = false;
    current.current.controller.abort();
    current.current.id++;
    setBusy(undefined);
  }
  function reset() {
    cleared.current = true;
    sourceVersion.current++;
    setReviewAcknowledged(false);
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
      publish(() => {
        setResult(converted);
        setAnalysis(undefined);
      });
    } else {
      if (converted.pages.every((p) => p.status === "blank"))
        throw new Error(
          "That PDF looks blank. Choose a PDF with a visible shipping label.",
        );
      publish(() => {
        setResult(undefined);
        setAnalysis(converted);
      });
    }
  }
  async function load(
    loadSource: (signal: AbortSignal) => Promise<Source>,
    message: string,
  ) {
    cleared.current = true;
    sourceVersion.current++;
    setReviewAcknowledged(false);
    const job = start(message);
    setResult(undefined);
    setAnalysis(undefined);
    setSelections(undefined);
    setSource(undefined);
    try {
      const value = await loadSource(job.controller.signal);
      if (!active(job.id)) return;
      cleared.current = false;
      setSource(value);
      setOutputName(`${fileStem(value.name)}-4x6`);
      await format(value, job);
    } catch (e) {
      if (active(job.id)) publish(() => setError(friendlyError(e)));
    } finally {
      if (active(job.id)) {
        running.current = false;
        publish(() => setBusy(undefined));
      }
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
    return load(async (signal) => {
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
      if (active(job.id)) publish(() => setAnalysis(next));
    } catch (e) {
      if (active(job.id)) publish(() => setError(friendlyError(e)));
    } finally {
      if (active(job.id)) {
        running.current = false;
        publish(() => setBusy(undefined));
      }
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
      if (active(job.id)) publish(() => setError(friendlyError(e)));
    } finally {
      if (active(job.id)) {
        running.current = false;
        publish(() => setBusy(undefined));
      }
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
      if (active(job.id)) publish(() => setResult(next));
    } catch (e) {
      if (active(job.id)) publish(() => setError(friendlyError(e)));
    } finally {
      if (active(job.id)) {
        running.current = false;
        publish(() => setBusy(undefined));
      }
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
            className={`converter ${result && !busy ? "has-result" : ""} ${!result && !busy ? "has-intake" : ""}`}
            aria-label="Label formatter"
            aria-busy={!!busy}
            tabIndex={-1}
          >
            {busy ? (
              <Processing {...busy} onCancel={cancel} />
            ) : result ? (
              <ResultPanel
                value={result}
                outputName={outputName}
                onOutputName={setOutputName}
                name={source?.name ?? "Your PDF"}
                onReset={reset}
                onEdit={() => void edit()}
                onDpi={(dpi) => void changeDpi(dpi)}
                downloads={downloads}
                reviewAcknowledged={reviewAcknowledged}
                onReviewAcknowledged={setReviewAcknowledged}
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
          <a
            className="text-button"
            href="/agents/#claude-desktop"
            target="_blank"
            rel="noopener noreferrer"
          >
            Use in Claude <span aria-hidden="true">↗</span>
          </a>
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
