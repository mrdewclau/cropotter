## ChatGPT execution and downloads

Follow explicit user instructions over this skill's guidelines while preserving the engine's actual safety/review requirements. Run the existing engine; do not replace it with an improvised Python cropper or another PDF service.

If the default `node` is older than 24, use the host's workspace-dependency discovery capability when available to locate its already-bundled Node/npm runtime. Verify the selected executable's version and put that executable's directory first on PATH only for this task's commands. Do not change the global Node installation or assume a particular user's absolute runtime path.

Use the PDF attached to this task, resolved through ChatGPT's attachment tools. Run in the task's execution environment. If the installed skill directory is read-only, copy only this complete packaged skill folder into a new private writable directory in the task workspace and use that copy as `SKILL_DIR`; keep its `assets/`, `scripts/` and `references/` together. Do not change global plugin files, install a background service or alter unrelated settings. The first run installs only public npm dependencies. If Node 24+, npm, native canvas or allowed registry access is unavailable, stop with that exact limitation; do not silently install another runtime or upload the customer's PDF elsewhere.

Only when the person requests a demonstration may you use `assets/sample-label.pdf`; it is synthetic. Never substitute the sample for an attached customer PDF.

After conversion, inspect the manifest and present the real generated files through ChatGPT's supported attachment/download mechanism. In a cloud file workspace that supports sandbox links, use `sandbox:/mnt/data/...` links only for files that actually exist there. In local work, use the host's actual local-file presentation. Do not invent URLs, file IDs or claims that a download succeeded. If the host cannot attach the outputs, state that limitation and give the actual local paths.

This plugin adds no CropOtter API key, account, remote conversion service or owner-paid model calls. It uses the caller's existing ChatGPT/runtime access and permissions; plan availability, usage limits and data policies remain OpenAI's. Installation or public listing alone does not establish that every ChatGPT mode or plan can run this workflow.
