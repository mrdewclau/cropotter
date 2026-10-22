import { constants } from "node:fs";
import { open, lstat, mkdir, link, unlink } from "node:fs/promises";
import { resolve, join, parse, relative, sep, isAbsolute } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { zipSync } from "fflate";
import { z } from "zod";
import { createNodeEngine } from "../../engine/src/adapters/node.js";
import { EngineError, checkAbort } from "../../engine/src/errors.js";
import type {
  Analysis,
  Selection,
  ValidationReport,
} from "../../engine/src/types.js";
export const VERSION = "0.1.2";
const INPUT_LIMIT = 25 * 1024 * 1024,
  OUTPUT_LIMIT = 64 * 1024 * 1024,
  RESOURCE_LIMIT = 128 * 1024 * 1024;
const selectionSchema = z
  .array(
    z
      .object({
        pageIndex: z.number().int().nonnegative(),
        region: z
          .object({
            x: z.number().finite(),
            y: z.number().finite(),
            width: z.number().positive().finite(),
            height: z.number().positive().finite(),
          })
          .strict()
          .optional(),
        rotation: z
          .union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)])
          .optional(),
        skip: z.boolean().optional(),
      })
      .strict(),
  )
  .max(100);
export const convertSchema = z
  .object({
    input: z.string().min(1).max(4096),
    out: z.string().min(1).max(4096),
    formats: z
      .array(z.enum(["pdf", "png", "zip"]))
      .min(1)
      .max(3)
      .default(["pdf"]),
    name: z.string().max(256).default("label"),
    dpi: z.union([z.literal(203), z.literal(300)]).default(203),
    selections: selectionSchema.optional(),
    acknowledgeReview: z.boolean().default(false),
  })
  .strict();
export type ConvertOptions = z.input<typeof convertSchema>;
export class LocalError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function safeError(error: unknown) {
  if (error instanceof LocalError)
    return { code: error.code, message: error.message };
  if (error instanceof EngineError)
    return {
      code: error.code,
      message:
        (
          {
            ABORTED: "Processing was cancelled.",
            LIMIT_EXCEEDED: "The document exceeds a processing limit.",
            INVALID_SELECTION: "Crop/page selections are invalid.",
          } as Record<string, string>
        )[error.code] ??
        "The PDF could not be processed. Check the document and crop selections.",
    };
  return {
    code: "OPERATION_FAILED",
    message:
      "The operation failed. Check the local input, output access and options.",
  };
}
function localPath(path: string) {
  if (!path || /^[a-z][a-z0-9+.-]*:\/\//i.test(path) || path.includes("\0"))
    throw new LocalError("INVALID_PATH", "Provide a local filesystem path.");
  return resolve(path);
}
async function assertNoSymlinks(path: string) {
  const full = localPath(path),
    root = parse(full).root;
  let current = root;
  for (const part of relative(root, full).split(sep).filter(Boolean)) {
    current = join(current, part);
    try {
      if ((await lstat(current)).isSymbolicLink())
        throw new LocalError("UNSAFE_PATH", "Symlink paths are not supported.");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return full;
}
async function boundedRead(path: string, limit: number, signal?: AbortSignal) {
  checkAbort(signal);
  const full = await assertNoSymlinks(path);
  const file = await open(
    full,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const info = await file.stat();
    if (!info.isFile())
      throw new LocalError(
        "INVALID_INPUT",
        "Input must be a regular local file.",
      );
    if (info.size > limit)
      throw new LocalError(
        "LIMIT_EXCEEDED",
        "The input exceeds its size limit.",
      );
    const data = Buffer.alloc(Math.min(info.size + 1, limit + 1));
    let total = 0;
    while (total < data.length) {
      checkAbort(signal);
      const r = await file.read(data, total, data.length - total, null);
      if (!r.bytesRead) break;
      total += r.bytesRead;
    }
    if (total > limit || total > info.size)
      throw new LocalError(
        "LIMIT_EXCEEDED",
        "The input changed or exceeds its size limit.",
      );
    return new Uint8Array(data.subarray(0, total));
  } finally {
    await file.close();
  }
}
export async function readSelections(path: string, signal?: AbortSignal) {
  try {
    return selectionSchema.parse(
      JSON.parse(
        Buffer.from(await boundedRead(path, 128 * 1024, signal)).toString(
          "utf8",
        ),
      ),
    );
  } catch (error) {
    if (error instanceof LocalError) throw error;
    throw new LocalError(
      "INVALID_SELECTION",
      "Selections must be a JSON array of explicit crop/page decisions.",
    );
  }
}
function stem(name: string) {
  return (
    name
      .replace(/\.(pdf|png|zip)$/i, "")
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N} _.-]/gu, "-")
      .replace(/^\.+|\.+$/g, "")
      .trim()
      .slice(0, 100) || "label"
  );
}
function summary(analysis: Analysis) {
  return {
    schemaVersion: analysis.schemaVersion,
    engineVersion: analysis.engineVersion,
    status: analysis.status,
    warnings: analysis.warnings,
    pages: analysis.pages.map(({ barcodes, ...page }) => ({
      ...page,
      barcodeCount: barcodes.length,
    })),
  };
}
function sha256(data: Uint8Array) {
  return createHash("sha256").update(data).digest("hex");
}
type FileArtifact = {
  name: string;
  mimeType: string;
  data: Uint8Array;
  report?: ValidationReport;
};
export class LocalService {
  constructor(private options: { workspace?: string } = {}) {}
  private async checkWorkspace(path: string) {
    if (this.options.workspace === undefined) return;
    const root = await assertNoSymlinks(this.options.workspace);
    try {
      if (
        !isAbsolute(this.options.workspace) ||
        !(await lstat(root)).isDirectory()
      )
        throw new Error("Invalid root");
    } catch {
      throw new LocalError(
        "INVALID_WORKSPACE",
        "Choose an existing absolute workspace folder in the extension settings.",
      );
    }
    const full = localPath(path);
    const rel = relative(root, full);
    if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel))
      throw new LocalError(
        "OUTSIDE_WORKSPACE",
        "Keep the input PDF and output folder inside the workspace selected in extension settings.",
      );
    await assertNoSymlinks(full);
  }
  private tail: Promise<unknown> = Promise.resolve();
  private resources = new Map<
    string,
    { data: Uint8Array; mimeType: string; name: string }
  >();
  private resourceBytes = 0;
  private serial<T>(work: () => Promise<T>) {
    const next = this.tail.then(work);
    this.tail = next.catch(() => {});
    return next;
  }
  analyze(input: string, signal?: AbortSignal) {
    return this.serial(async () => {
      await this.checkWorkspace(input);
      const bytes = await boundedRead(input, INPUT_LIMIT, signal),
        engine = await createNodeEngine();
      try {
        return {
          schemaVersion: 1,
          version: VERSION,
          status: "analyzed",
          analysis: summary(await engine.analyze(bytes, { signal })),
        };
      } finally {
        await engine.dispose();
      }
    });
  }
  convert(options: ConvertOptions, signal?: AbortSignal) {
    return this.serial(async () => {
      const parsed = convertSchema.safeParse(options);
      if (!parsed.success)
        throw new LocalError(
          "INVALID_OPTIONS",
          "Check conversion options, formats, DPI and crop/page decisions.",
        );
      const opts = parsed.data;
      await this.checkWorkspace(opts.input);
      await this.checkWorkspace(opts.out);
      const bytes = await boundedRead(opts.input, INPUT_LIMIT, signal),
        engine = await createNodeEngine(),
        name = stem(opts.name);
      try {
        const result = await engine.prepare(
          bytes,
          opts.selections as Selection[] | undefined,
          { signal },
        );
        const review = () => ({
          schemaVersion: 1,
          version: VERSION,
          status: "review_required",
          reviewAcknowledged: false,
          artifacts: [],
          ...("analysis" in result
            ? { analysis: summary(result.analysis) }
            : {}),
          warnings: result.prepared?.report.warnings ?? [],
          nextAction: result.prepared
            ? "Inspect the crop and warnings, then explicitly acknowledge review to produce files."
            : "Inspect analysis and provide explicit selections for every nonblank page; acknowledge review after inspecting the crop.",
        });
        if (
          !result.prepared ||
          ((result.status === "needs_review" ||
            opts.selections !== undefined) &&
            !opts.acknowledgeReview)
        )
          return review();
        const prepared = result.prepared,
          files: FileArtifact[] = [];
        let total = 0;
        const add = (file: FileArtifact) => {
          total += file.data.byteLength;
          if (total > OUTPUT_LIMIT)
            throw new LocalError(
              "LIMIT_EXCEEDED",
              "Generated output exceeds the size limit.",
            );
          files.push(file);
        };
        const formats = new Set(opts.formats),
          needPdf = formats.has("pdf") || formats.has("zip"),
          needPng = formats.has("png") || formats.has("zip");
        if (needPdf)
          for await (const artifact of engine.export(
            prepared,
            { format: "pdf" },
            { signal },
          ))
            add({
              name: `${name}.pdf`,
              mimeType: "application/pdf",
              data: artifact.data,
              report: artifact.report,
            });
        if (needPng) {
          let i = 0;
          for await (const artifact of engine.export(
            prepared,
            { format: "png", dpi: opts.dpi },
            { signal },
          ))
            add({
              name: `${name}-${String(++i).padStart(3, "0")}-${opts.dpi}dpi.png`,
              mimeType: "image/png",
              data: artifact.data,
              report: artifact.report,
            });
        }
        if (
          files.some((f) => f.report?.status === "needs_review") &&
          !opts.acknowledgeReview
        )
          return review();
        if (formats.has("zip"))
          add({
            name: `${name}.zip`,
            mimeType: "application/zip",
            data: zipSync(
              Object.fromEntries(files.map((f) => [f.name, f.data])),
              { level: 6 },
            ),
          });
        const selected = files.filter((f) =>
          formats.has(
            f.mimeType === "application/pdf"
              ? "pdf"
              : f.mimeType === "image/png"
                ? "png"
                : "zip",
          ),
        );
        const warnings = [
          ...new Set([
            ...prepared.report.warnings,
            ...files.flatMap((f) => f.report?.warnings ?? []),
          ]),
        ];
        const manifest = {
          schemaVersion: 1,
          version: VERSION,
          engineVersion: prepared.engineVersion,
          status: "ready",
          reviewAcknowledged: opts.acknowledgeReview,
          geometry: {
            widthInches: 4,
            heightInches: 6,
            widthPt: 288,
            heightPt: 432,
            marginInchesMinimum: 0.125,
            dpi: opts.dpi,
          },
          pages: prepared.pages,
          labels: prepared.labels.map(({ sourceBarcodes, ...label }) => label),
          warnings,
          validation: prepared.report,
          artifacts: selected.map((f) => ({
            name: f.name,
            mimeType: f.mimeType,
            bytes: f.data.byteLength,
            sha256: sha256(f.data),
          })),
        };
        const manifestFile = {
          name: `${name}-manifest.json`,
          mimeType: "application/json",
          data: new TextEncoder().encode(
            JSON.stringify(manifest, null, 2) + "\n",
          ),
        };
        const output = [...selected, manifestFile],
          retained = output.reduce((n, f) => n + f.data.length, 0);
        if (retained + this.resourceBytes > RESOURCE_LIMIT)
          throw new LocalError(
            "LIMIT_EXCEEDED",
            "This server has reached its artifact memory limit. Start a fresh server instance.",
          );
        await writeOutputs(opts.out, output, signal);
        const artifacts = output.map((f) => {
          const uri = `cropotter://artifacts/${randomUUID()}/${encodeURIComponent(f.name)}`;
          this.resources.set(uri, {
            data: f.data,
            mimeType: f.mimeType,
            name: f.name,
          });
          this.resourceBytes += f.data.length;
          return {
            name: f.name,
            path: join(localPath(opts.out), f.name),
            uri,
            mimeType: f.mimeType,
            bytes: f.data.length,
            sha256: sha256(f.data),
          };
        });
        return { ...manifest, artifacts };
      } finally {
        await engine.dispose();
      }
    });
  }
  readResource(uri: string) {
    const resource = this.resources.get(uri);
    if (!resource)
      throw new LocalError(
        "RESOURCE_UNAVAILABLE",
        "Only artifacts generated by this server instance are readable.",
      );
    if (resource.data.length > 6 * 1024 * 1024)
      throw new LocalError(
        "LIMIT_EXCEEDED",
        "This artifact exceeds the resource response limit. Use its local output file.",
      );
    return {
      mimeType: resource.mimeType,
      blob: Buffer.from(resource.data).toString("base64"),
    };
  }
}
async function writeOutputs(
  directory: string,
  files: FileArtifact[],
  signal?: AbortSignal,
) {
  const dir = await assertNoSymlinks(directory);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await assertNoSymlinks(dir);
  if (!(await lstat(dir)).isDirectory())
    throw new LocalError("UNSAFE_PATH", "Output must be a local directory.");
  // Link completed private temporary files atomically; existing files and symlinks always fail.
  const staged: string[] = [],
    published: string[] = [];
  try {
    for (const file of files) {
      checkAbort(signal);
      const dest = join(dir, file.name);
      try {
        await lstat(dest);
        throw new LocalError(
          "OUTPUT_EXISTS",
          "An output filename already exists. Choose a new name or directory.",
        );
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      const temp = join(dir, `.cropotter-${randomUUID()}.tmp`);
      const handle = await open(
        temp,
        constants.O_WRONLY |
          constants.O_CREAT |
          constants.O_EXCL |
          constants.O_NOFOLLOW,
        0o600,
      );
      staged.push(temp);
      try {
        await handle.writeFile(file.data);
        await handle.sync();
      } finally {
        await handle.close();
      }
    }
    await assertNoSymlinks(dir);
    for (let i = 0; i < files.length; i++) {
      checkAbort(signal);
      const dest = join(dir, files[i].name);
      try {
        await link(staged[i], dest);
        published.push(dest);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code !== "ENOTSUP" && code !== "EOPNOTSUPP") throw error;
        // ExFAT has no hard links. Exclusive creation still prevents replacement;
        // files become visible during writing, and failures roll back our outputs.
        const handle = await open(
          dest,
          constants.O_WRONLY |
            constants.O_CREAT |
            constants.O_EXCL |
            constants.O_NOFOLLOW,
          0o600,
        );
        published.push(dest);
        try {
          await handle.writeFile(files[i].data);
          await handle.sync();
        } finally {
          await handle.close();
        }
      }
    }
    checkAbort(signal);
  } catch (error) {
    await Promise.all(published.map((path) => unlink(path).catch(() => {})));
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw new LocalError(
        "OUTPUT_EXISTS",
        "An output filename already exists. Choose a new name or directory.",
      );
    throw error;
  } finally {
    await Promise.all(staged.map((path) => unlink(path).catch(() => {})));
  }
}
