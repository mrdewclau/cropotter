---
name: cropotter
description: Convert local shipping-label PDFs into reviewed portrait 4 by 6 inch PDF, PNG or ZIP files with the bundled CropOtter engine. Use for label fitting, page selection and crop review; not general PDF editing or direct printing.
---

Use the bundled engine through `scripts/run.mjs`; do not recreate PDF conversion in model-generated code. Node.js 24+, npm, local process execution and a supported native canvas platform are required. First use installs the bundled package and its public npm dependencies inside this skill's `.runtime` directory. No CropOtter account, API key, model API, remote conversion server or new subscription is required. Host model access and existing internet/data costs are separate.

Resolve `SKILL_DIR` to this skill's actual folder. Resolve the user's PDF attachment to a local path using the host's attachment tools. If this host cannot provide local files or execute Node, explain that limitation and direct the user to https://cropotter.com; do not upload documents elsewhere or claim a hosted download exists.

Analyze before converting:

```sh
node "$SKILL_DIR/scripts/run.mjs" analyze --input "/absolute/path/source.pdf"
node "$SKILL_DIR/scripts/run.mjs" convert --input "/absolute/path/source.pdf" --out "/absolute/path/new-output" --formats pdf,png,zip --name "shipment-4x6" --dpi 203
```

Use a new output directory. Inputs are local PDF paths, never remote URLs. Preserve explicit decisions for every page; read [references/page-decisions.md](references/page-decisions.md) when pages need skipping, rotation or manual crops. Output remains portrait 4 × 6 inches with at least ⅛ inch white margins, preserved label proportions and no added branding. The generated manifest records geometry, warnings, filenames and SHA-256 values.

The local engine rejects symlink paths. Resolve the explicitly chosen input file and existing output parent with the runtime's `fs.realpath` before invoking it, then choose a new private output directory beneath that parent. This matters for macOS `/tmp` and `/var` aliases. Do not scan the machine or follow unrelated file references to locate documents.

Exit code 2 means human review is required and final output has been withheld. Show the analysis warnings and arrange deliberate human crop review. Never add `--acknowledge-review` on your own, infer consent from the original conversion request, or hide warnings. Only after the user has reviewed the relevant crop/page decisions and explicitly acknowledged them may you rerun conversion with `--acknowledge-review` and the reviewed `--selections` file. Stopping the foreground command cancels local work; inspect the output directory before retrying and choose a new directory if any files already exist.

After success, inspect the returned manifest and attach the actual generated PDF/PNG/ZIP using the host's file attachment mechanism. Preserve safe requested filenames and list which formats were produced. Where local Markdown links are supported, link to absolute output paths. A filesystem path is not a public URL; if the host cannot present downloads, disclose that limitation and provide the local paths. Do not promise automatic skill discovery, a particular chat attachment UI or direct printer access.
