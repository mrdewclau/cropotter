# No-cost agent access verification

Scope approved 2026-10-22: WebMCP, local MCP and executable Agent Skill, with no new recurring infrastructure. Base release 52d60da. See `agent-tools.md` for installation and client limits.

## Implementation and executed checks

| Gate | Evidence |
| --- | --- |
| Existing engine | 61 tests passed on Node 24.19.0/macOS; shared engine unchanged. |
| Website/service | 50 tests passed, including registration lifecycle/unsupported browser, stale/busy/review gates, static guide routes and archive MIME types. |
| Local package | 10 tests passed; actual SDK 2.3.1 subprocess clients negotiate 2026-07-28 and 2025-11-25, convert synthetic PDFs and read instance-scoped immutable artifact resources. |
| Packed installation | Clean npm install outside checkout; CLI analysis, portrait 288x432pt PDF, 1200x1800 PNG at 300 DPI, ZIP contents; actual MCP conversion/resource checksum and arbitrary-file read denial passed. |
| Executable skill | Three distribution tests passed; separate real skill ZIP extraction/install/conversion passed, with human-review withholding, 288x432pt PDF, 812x1218 PNG at 203 DPI, ZIP entries and SHA-256 checks. Skill metadata validator passed. |
| Typechecks/build | Root, web and local typechecks passed; local package/distribution and production web build passed. |
| Production dependency audit | `npm audit --omit=dev --json`: zero known advisories at verification. |
| Native WebMCP | Actual Chromium 156 experimental browser API discovered all six tools; `getTools`/`executeTool` loaded and converted the synthetic sample and initiated a valid PDF download. This is native browser acceptance, not proof of every AI product's discovery/attachment UI. |
| Browser callbacks | Real PDF/PNG/ZIP download bytes/geometry/names, shared resolution/name UI, review acknowledgement and UI cancellation tested. Native browser API tests are separate from the registration harness used for other browser contexts. |
| Full local browser matrix | 98 passed / 12 expected skips across desktop Chromium/Firefox/WebKit and iPhone/Android emulation. Includes viewport fit, crop review, editable names, actual PDF/PNG/ZIP downloads, accessibility, cancellation and errors. Skips cover private-input cases, phone-only nonapplicable geometry cases and native WebMCP in non-Chromium engines. |

Independent review found a false-success cancellation race and a potential aborted-controller edge. Regression reproduced the cancellation failure before the fix. Tool operations now check job ownership and publish final React state before reporting status. Human acknowledgement is bound to the specific conversion object, so newly rendered/cropped results cannot inherit an older review. Fresh review found no remaining P1/P2 issues in these changes.

## Deployment and cross-platform gates

Linux CI, production image identity and live release checks are recorded below after execution; until then they remain pending. Do not infer acceptance from source/build alone.

## Cost and privacy boundary

No new cloud resource, storage account, paid hosting plan, model API, DNS record or subscription is required or created by this feature. Static distribution uses the existing CropOtter host; existing bandwidth/account costs remain. MCP is a local stdio process with no HTTP listener or URL-fetch tool. Skill installation obtains public npm dependencies; conversion uses local files. WebMCP uses the existing browser engine and visible page state. Ordinary customer-file upload remains on-device; the pre-existing bounded PDF-link proxy is unchanged.

## Known limits

Node 24+, npm access on first install and a supported native canvas platform are required for local/skill execution. Native runtime tests executed here are macOS; Linux acceptance is a separate CI gate. Windows installation and native chat attachment presentation are not verified. Do not claim universal client/OS support or automatic discovery. Browser blob download links are limited to the live page and expire on output replacement/reset/close. Arbitrary local-file reads, overwriting files and automatic human-review acknowledgement are not exposed. Output directories must be private/stable during writing; Node does not provide a race-proof cross-platform directory-handle API. Physical printer scanning remains outside this release's acceptance.
