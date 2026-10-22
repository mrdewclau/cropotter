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

| Release gate | Executed result |
| --- | --- |
| Public source | Implementation `86341ee779cbfcba100b9923427369ad03981fab` published on `main`. |
| Linux CI | [Run 39804881600](https://github.com/mrdewclau/cropotter/actions/runs/39804881600) succeeded: 61 engine, 50 web/service, 10 local and 3 distribution tests; clean packed/skill installs, typechecks/builds and 98 browser checks passed / 12 expected skips. |
| Production image | `sha256:c45c82aff049c1c368072d42a0555a9bc0c6978b73c44e40f49f48703e6dd33d`, tag `cropotter:release-20261022-agent-tools`, Node 24.22.1. |
| Live browser checks | 9 passed / 1 expected skip across Chromium and iPhone emulation, including actual exports, review gating, cancellation and errors. |
| Actual app browser | Six native WebMCP tools discovered without flags or a shim; sample converted, filename changed to Agent sample, 300 DPI selected, download metadata returned and PDF download initiated. |
| Public downloads | All four manifest artifact lengths, SHA-256 hashes and MIME types verified against actual live bytes. Fresh installations of the live tarball and live skill ZIP outside the checkout passed CLI/MCP/resource/skill conversion, including PDF 288x432pt and PNG 1200x1800. |
| Live shell | Converted desktop view at 1280x720 and agent guide at 1280x720 / 375x667 checked for document overflow; screenshots visually reviewed. Ignored diagnostics under `output/agent-release/`. |
| Host isolation | Same Droplet/container limits: healthy, 512 MiB, one CPU, read-only, OOMKilled=false, RestartCount=0. Caddy PID 885 and cloudflared PID 1750 unchanged; no DNS, proxy or unrelated-service changes. |

Published package: `cropotter-local-0.1.0.tgz`, 65,053 bytes, SHA-256 `6784e6ec3fab39504cb0c7f7166a46bb0893196fddf65b3afc76cd837dbd6107`. Published skill: `cropotter-skill-0.1.0.zip`, 71,616 bytes, SHA-256 `3f9995d24df17784d938e46e9aee3abd9dd52f29649a96f458596d11834efc8f`. Public installation guide: https://cropotter.com/agents/.

Rollback image preserved as `cropotter:before-agent-tools-20261022` (security release `sha256:d3b27a8e36d2010d66569917ea5f479684c32671e48beb05d3b35647ba9c9d58`). The first health request during container replacement received a transient connection reset; subsequent health and all live acceptance checks passed.

## Cost and privacy boundary

No new cloud resource, storage account, paid hosting plan, model API, DNS record or subscription is required or created by this feature. Static distribution uses the existing CropOtter host; existing bandwidth/account costs remain. MCP is a local stdio process with no HTTP listener or URL-fetch tool. Skill installation obtains public npm dependencies; conversion uses local files. WebMCP uses the existing browser engine and visible page state. Ordinary customer-file upload remains on-device; the pre-existing bounded PDF-link proxy is unchanged.

## Known limits

Node 24+, npm access on first install and a supported native canvas platform are required for local/skill execution. macOS execution and Linux CI installation/conversion passed. Windows installation and client-specific chat attachment presentation are not verified; the actual app-browser check establishes native tool discovery and browser download initiation. Do not claim universal client/OS support or automatic discovery. Browser blob download links are limited to the live page and expire on output replacement/reset/close. Arbitrary local-file reads, overwriting files and automatic human-review acknowledgement are not exposed. Output directories must be private/stable during writing; Node does not provide a race-proof cross-platform directory-handle API. Physical printer scanning remains outside this release's acceptance.
