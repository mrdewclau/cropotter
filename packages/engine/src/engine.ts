import { loadSource } from "./intake.js";
import { checkAbort, DEFAULT_LIMITS, EngineError } from "./errors.js";
import { digest } from "./pixels.js";
import { PdfBackend } from "./pdf.js";
import { analyzeDocument } from "./detection.js";
import { compose, resolveSelections } from "./composition.js";
import {
  exportArtifacts,
  makeThermalBitmap,
  validatePrepared,
} from "./outputs.js";
import type {
  EngineOptions,
  EngineRuntime,
  ExportRequest,
  OperationOptions,
  PdfSource,
  PreparationResult,
  PreparedDocument,
  Selection,
} from "./types.js";

export function createEngine(
  runtime: EngineRuntime,
  options: EngineOptions = {},
) {
  const limits = { ...DEFAULT_LIMITS, ...options.limits };
  for (const value of Object.values(limits))
    if (!Number.isSafeInteger(value) || value <= 0)
      throw new EngineError(
        "LIMIT_EXCEEDED",
        "Resource limits must be positive finite integers.",
      );
  if (
    options.downloadTimeoutMs !== undefined &&
    (!Number.isSafeInteger(options.downloadTimeoutMs) ||
      options.downloadTimeoutMs <= 0)
  )
    throw new EngineError(
      "INVALID_SOURCE",
      "The download timeout must be a positive finite integer.",
    );
  const backend = new PdfBackend(runtime, limits);
  let disposed = false;
  let tail = Promise.resolve();
  const controllers = new Set<AbortController>();
  const work = new Set<Promise<unknown>>();

  function exclusive<T>(
    action: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    const pending = (async () => {
      try {
        await previous;
        checkAbort(signal);
        return await action();
      } finally {
        release();
      }
    })();
    work.add(pending);
    void pending.finally(() => work.delete(pending)).catch(() => {});
    return pending;
  }
  function operation(opts: OperationOptions) {
    if (disposed)
      throw new EngineError(
        "DISPOSED",
        "This engine instance has been disposed.",
      );
    const controller = new AbortController(),
      abort = () => controller.abort();
    if (opts.signal?.aborted) controller.abort();
    else opts.signal?.addEventListener("abort", abort, { once: true });
    controllers.add(controller);
    return {
      options: { ...opts, signal: controller.signal, limits },
      finish: () => {
        controllers.delete(controller);
        opts.signal?.removeEventListener("abort", abort);
      },
    };
  }
  return {
    async analyze(source: PdfSource, opts: OperationOptions = {}) {
      const op = operation(opts);
      try {
        return await exclusive(async () => {
          let doc;
          try {
            op.options.onProgress?.({
              stage: "loading",
              completed: 0,
              total: 1,
            });
            const bytes = await loadSource(source, {
              signal: op.options.signal,
              maxBytes: limits.maxBytes,
              timeoutMs: options.downloadTimeoutMs,
              fetch: runtime.fetch,
            });
            doc = await backend.open(bytes, op.options.signal);
            return await analyzeDocument(
              backend,
              doc,
              await digest(bytes),
              op.options,
            );
          } finally {
            await doc?.loadingTask.destroy();
          }
        }, op.options.signal);
      } finally {
        op.finish();
      }
    },
    async prepare(
      source: PdfSource,
      selection?: Selection[],
      opts: OperationOptions = {},
    ): Promise<PreparationResult> {
      const op = operation(opts);
      try {
        return await exclusive(async (): Promise<PreparationResult> => {
          let doc;
          try {
            op.options.onProgress?.({
              stage: "loading",
              completed: 0,
              total: 1,
            });
            const bytes = await loadSource(source, {
              signal: op.options.signal,
              maxBytes: limits.maxBytes,
              timeoutMs: options.downloadTimeoutMs,
              fetch: runtime.fetch,
            });
            doc = await backend.open(bytes, op.options.signal);
            const analysis = await analyzeDocument(
              backend,
              doc,
              await digest(bytes),
              op.options,
            );
            const chosen = resolveSelections(analysis, selection);
            if (!chosen?.length) return { status: "needs_review", analysis };
            const prepared = await compose(
              backend,
              doc,
              bytes,
              analysis,
              chosen,
              op.options,
            );
            prepared.report = await validatePrepared(
              runtime,
              prepared,
              op.options,
            );
            checkAbort(op.options.signal);
            return prepared.report.status === "ready"
              ? { status: "ready", prepared }
              : { status: "needs_review", analysis, prepared };
          } finally {
            await doc?.loadingTask.destroy();
          }
        }, op.options.signal);
      } finally {
        op.finish();
      }
    },
    async *export(
      prepared: PreparedDocument,
      request: ExportRequest,
      opts: OperationOptions = {},
    ) {
      const op = operation(opts),
        iterator = exportArtifacts(runtime, prepared, request, op.options);
      try {
        while (true) {
          const item = await exclusive(
            () => iterator.next(),
            op.options.signal,
          );
          if (item.done) return;
          // Rendering resources have been released before yielding to a potentially slow consumer.
          yield item.value;
        }
      } finally {
        await iterator.return(undefined);
        op.finish();
      }
    },
    async thermalBitmap(
      prepared: PreparedDocument,
      labelId: string,
      opts: OperationOptions & { dpi?: 203 | 300 } = {},
    ) {
      const op = operation(opts);
      try {
        return await exclusive(
          () =>
            makeThermalBitmap(runtime, prepared, labelId, {
              ...op.options,
              dpi: opts.dpi,
            }),
          op.options.signal,
        );
      } finally {
        op.finish();
      }
    },
    async dispose() {
      disposed = true;
      for (const controller of controllers) controller.abort();
      await Promise.allSettled([...work]);
      controllers.clear();
    },
  };
}
export type Engine = ReturnType<typeof createEngine>;
