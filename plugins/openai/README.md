# CropOtter for ChatGPT — test package

Skills-only native OpenAI plugin: the existing CropOtter engine runs in the caller's supported execution environment. No new remote MCP endpoint, subscription, API key or owner-paid conversion service. Caller plan/usage and first-use npm access still apply. Requires Node 24+, npm and native canvas support. This package is not a ChatGPT public-directory approval or a universal-runtime claim.

Build with `npm run build:chatgpt-plugin`; verify with `npm run test:chatgpt-plugin`. The ZIP has a portable root `plugin.json`, complete `skills/cropotter/`, bundled hash-bound engine tarball, synthetic PDF, CropOtter icon and license. Source skill instructions remain canonical under `skills/cropotter`; `host-note.md` adds ChatGPT-specific writable workspace and actual-attachment guidance.

Install privately using the account's supported plugin creation/import workflow, or extract into a local marketplace for ChatGPT Work desktop. Test in a fresh chat by selecting CropOtter, asking for the bundled synthetic sample, then uploading a synthetic PDF. Inspect/download the actual PDF/PNG/ZIP and verify the manual-review withholding case. Public submission, legal terms and broader publication are separate from private host testing.

Model-generated code must not replace the engine. A host without local files/process execution, supported Node, npm registry access or file attachment presentation must report that limitation honestly. If installed plugin resources are read-only, copy only the packaged skill to a new private writable task folder before running; never change global plugin files.
