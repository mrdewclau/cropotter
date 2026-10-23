# Pick up CropOtter here

Last updated: **2026-10-22 (America/New_York)**. The public repository is deployed on DigitalOcean and GoDaddy DNS points cropotter.com to it. See `docs/deployment-2026-10-22.md` for the latest production record.

## Continue locally

The repository is checked out at `/Volumes/extra_space/cropotter`. Read `AGENTS.md` and `deploy/README.md` before changes. Production is on DigitalOcean Droplet `597065633` (`fww-desk`, `138.197.81.94`), in `/opt/cropotter`, with Docker Compose project `cropotter` and Caddy HTTPS. Preserve all other host applications and DNS records.

Use Node 24+. Run `npm ci --no-audit`, `npm run dev:web` (port 4174), or `npm run build:web` and `npm run start:web` (port 8080). The npm audit endpoint timed out during the initial deployment. Fresh full and production audits passed with zero known advisories during the 2026-10-22 security review; keep auditing separate from image installation.

## Required design model

The user's global preference is a viewport-fitting app shell for EVERYTHING, without document scrolling. Never return CropOtter to a marketing/landing-page stack. The approved shell has fixed framing, upload on the left and a contained Three.js/typography guide on the right. On phones the compact guide and upload area share the available workspace. Results keep the preview and download controls visible; help/privacy open on demand. Only bounded supporting panes may scroll. Check short portrait, landscape, enlarged text, primary control reachability and crop aspect ratio; overflow:hidden alone is not acceptance.

## What is finished

- Working shared PDF engine and customer website: upload/drop/direct HTTPS link, automatic fitting, crop editor and PDF/PNG/ZIP downloads.
- Exact portrait 4 × 6 inch output, proportions preserved, minimum ⅛ inch white margin on every side. No branding added to output.
- 203/300 DPI images, all-label ZIP, multi-page decisions, rotation, explicit skipping, manual-review acknowledgement, cancel/retry and stale-job protection.
- Approved CropOtter identity **04 — The Mailroom Stamp**, complete brand board, editable Tesseract source, clean vector companions, fonts and design tokens under `brand/`.
- Fluid 320–2560 CSS-pixel layouts, large text, keyboard controls, phone controls, Three.js process demonstration and static reduced-motion/no-WebGL fallback.
- Standalone Node service and multi-stage Docker build; local engine assets and fonts; readiness route; Docker Compose and Caddy examples.
- URL proxy rejects private addresses and private redirects, validates all DNS answers, pins the selected address, limits bytes/time/concurrency and bounds slow response delivery. Files/links are never persisted.

## Original verification checkpoint (before app-shell replacement)

Engine: 52/52 tests and typecheck passed. Website: 39/39 unit/service tests and typecheck passed. Browser matrix: 43 passed, 2 skipped across desktop Chromium/Firefox/WebKit, iPhone SE WebKit and Pixel 7 Chromium. The layout sweep is intentionally skipped in the two phone contexts; desktop browsers run widths 320–2560, short landscape and enlarged text. All five browsers converted the original private supplied PDF successfully. Production dependency audit: zero known vulnerabilities.

The final independent review found one material issue: releasing a PDF fetch slot before a slow response finished. It was reproduced with paused clients, corrected to hold the slot until finish/close, and covered by a regression. The full browser acceptance preceded that backend-only correction; the service regression/typecheck were rerun. Docker acceptance includes health/security headers, actual sample conversion/PDF download and iPhone Safari crop screenshots. See [verification](docs/website-verification.md) for the final image evidence.

Browser phone contexts are emulation, not physical-device testing. Real-device Safari file sharing, touch dragging/resizing and actual printer scanning still need acceptance. No real labels or signed customer links are in this repository. To rerun the private acceptance locally, set `CROPOTTER_PRIVATE_PDF` to a locally held PDF; otherwise those cases skip.

## Production deployment

CropOtter is deployed at **https://cropotter.com**. Caddy provisions valid HTTPS for root and www; www redirects to root while retaining the path/query. The container is non-root, read-only and bound only to `127.0.0.1:8080`; Caddy exposes ports 80/443. No database, storage volume or new paid cloud resource was created. Other applications remain active.

GoDaddy's root A record changed from Parked to `138.197.81.94` with its 600-second TTL retained. The existing www CNAME, nameservers, Domain Connect and DMARC TXT record remain intact. The complete before/after record and rollback steps are in [the deployment record](docs/deployment-2026-10-21.md).

The app-shell replacement removes the long promotional sections, adds on-demand help/privacy, scales source/result previews within bounded panes and preserves conversion/crop/download behavior. Browser checks include actual PDF/PNG/ZIP files and a ten-viewport no-page-scroll regression. Physical phone/printer acceptance remains outstanding.

## Repository publication

The code, full identity source, screenshots, license, CI workflow and these notes are published on `main` at https://github.com/mrdewclau/cropotter. The connected GitHub app allowed pushes but rejected creating the repository and changing its About settings. The user created the empty public repository; the full project was then pushed successfully. README branding is complete. If desired, fill the About panel locally with: **Your labels. Ready to go. Open-source shipping-label formatting, crop review and 4 × 6 PDF/PNG downloads.** Suggested topics: `shipping-labels`, `pdf`, `typescript`, `react`, `threejs`, `label-printer`. Production website: https://cropotter.com. About-panel metadata may still be updated separately.

## Product decisions already made

Website first: file/link in, downloadable PDF/PNG out. Chrome extension next, then iOS, then Windows/macOS, then streamlined direct printing. iPhone has priority, with Android also supported. Printer research focuses on the **MUNBYN ITPP130B**; don't promise arbitrary iOS Bluetooth access or direct printing without SDK/protocol and hardware validation. Review [printer research](docs/munbyn-itpp130b-research.md) and [architecture](docs/proposed-pipeline.md).

Cloud account queues, Chrome capture and native apps are future milestones. A shared queue can live in the user's account; a phone needs to be awake/available when it actually acts as a local Bluetooth bridge. The current release deliberately has no account or queue. See [roadmap](docs/roadmap.md).

## Useful map

- `apps/web/src/App.tsx`: client job lifecycle, cancellation and source/result state.
- `apps/web/src/CropEditor.tsx`, `PagePreview.tsx`, `lib/crop.ts`: source preview and crop geometry.
- `apps/web/src/ResultPanel.tsx`, `lib/conversion.ts`: review gating and persistent blob downloads.
- `apps/web/server/`: bounded PDF-link fetch and static service.
- `packages/engine/`: shared engine and original synthetic test fixtures.
- `docs/superpowers/specs/2026-10-21-cropotter-website.md`: website specification.
- `docs/superpowers/plans/2026-10-21-cropotter-website.md`: original implementation checklist.
- `brand/`: approved visual identity; `docs/images/`: synthetic website screenshots.

Keep this file current when deployment or acceptance status changes.

## Latest visual revision — 2026-10-22

Replaced the tiny floating stamp with a readable synthetic full-page PDF → orange crop → finished 4 × 6 label sequence. Equal-height upload and explanation cards align on desktop; the navy demonstration board has synchronized captions, steps and Pause/Play. Reduced-motion and unavailable/lost WebGL use a fitted static label. Compact phone layouts preserve the upload workspace; selecting the link form prioritizes that form on narrow/short screens. The user has not yet reviewed this revision. Website unit/service tests: 39/39; typecheck and production build passed. Final production-build browser suite: 21 passed, 3 expected skips. See verification notes for live checks.

## Editable download names — 2026-10-22

The result panel includes a File name field initialized from the source basename plus `-4x6`. The chosen base name is used by PDF, PNG, ZIP and Share PDF; automatic extensions prevent duplicate `.pdf`/`.png`/`.zip` endings. Multiple PNG labels use distinct numbered names; ZIP contents use the chosen base plus page/DPI suffixes. Names commit on blur or Enter, remove unsupported path characters and fall back to `label` if empty. Edits survive DPI changes and crop review; a new source initializes a new name. ZIP links point to renamed contents, including for Save Link As. No PDF content or output geometry changes.

Download-panel focus rings are inset so bounded-pane overflow does not clip their edges. Preserve this when changing control styles.

PNG resolution uses a consistent 18px chevron, inset 14px from the right edge, with 44px reserved text padding. Preserve that space on phones; native select arrows previously crowded the focus border.

## Social link preview and upload badge — 2026-10-22

The homepage includes static Open Graph/Twitter metadata for a generated branded PNG and a silent crop-process MP4. Both are public under `/share/`; editable motion source is in `brand/share-motion`. See `docs/share-preview.md` for prompt, dimensions, Apple guidance and actual-device limits. MP4 serving includes correct MIME and byte-range/HEAD support for Safari; resources are under Apple's recommended budget. Product files remain unbranded. Upload badge uses CSS grid to center its glyph (prior flex override left it 9px off-center). Preserve compact mobile behavior that intentionally hides the badge.

Focus outlines for boxed controls (buttons, inputs, selects and summaries) are inset globally. The earlier download-only rule missed the PDF-link form, whose hidden-overflow source pane clipped both sides by 7px. Keep text-link treatments separate and preserve visible keyboard focus throughout the shell.

## Security review — 2026-10-22

Read `docs/security-review-2026-10-22.md` before promotion. The review corrected recoverable cropped PDF content, pre-budget structural decompression, cancellation rejection handling, client fairness/resource limits, a development dependency advisory, host CA trust and proxy runtime age. Exports now contain visible label pixels at 300 DPI in a fresh PDF; vector/searchable text and source-object passthrough are intentionally removed for privacy. The pdf-lib 1.17.1 bounded parser adapter must be reviewed on library upgrades. App Node 24.22.1 and CI Actions are pinned. Caddy 2.11.7 is rebuilt with Go 1.26.10 / x-net 0.60.0, with build inputs under `deploy/caddy-build` and systemd override under `deploy/`. Preserve loopback proxy trust, per-client/global limits and memory/process boundaries. Host CA package updated for eMudhra. App-specific fixes were deployed without changing DNS or unrelated services. The user then explicitly approved host maintenance: all 53 eligible upgrades installed, host Node 22.23.4 / cloudflared 2026.10.3, reboot onto kernel 6.8.0-147-generic, no failed units or reboot marker. All 11 checked services are active; tunnel ready with 4 connections. Apt retains 5 Ubuntu-phased updates. Post-reboot live crop/rename/PDF/PNG/ZIP checks passed 6/6. See the report for evidence and remaining scope limits.

Final Linux CI on `228cede` passed all required checks, including 76 browser checks / 9 expected skips. See the linked run in the security report. Browser tests independently probe WebGL capability and accept only Linux WebKit's observed suggested-filename space normalization; exact app-provided names and ZIP entries remain asserted.

## Agent access without new recurring infrastructure — 2026-10-22

User approved WebMCP, local MCP and an executable skill. Implementation `86341ee779cbfcba100b9923427369ad03981fab` is published on `main` and deployed; downloads and setup guide are live at https://cropotter.com/agents/. Read `docs/agent-tools.md` for supported flows and `docs/agent-verification-2026-10-22.md` for actual evidence/release status. `npm run build:web` now builds `packages/local` and static agent distribution before the website. Agent downloads are generated under `/agents/` on the existing host; no remote conversion endpoint, paid worker, object store or new model API is part of this design.

Six feature-detected top-level WebMCP tools use the visible App state and existing browser engine. Local package bins `cropotter` and `cropotter-mcp` run Node 24+; MCP uses the official SDK over stdio, accepts local PDF paths and reads only its own generated artifact resources. The skill ZIP includes the exact packed engine and checksum-bound local installer/runner. Uncertain/manual output is withheld pending deliberate human review; WebMCP cannot acknowledge review. Crop/PDF geometry, unbranded output and app-shell design remain unchanged. Current runtime/client/physical-printer limits must remain explicit.

[Linux CI 39804881600](https://github.com/mrdewclau/cropotter/actions/runs/39804881600) passed all required gates, including 98 browser checks / 12 expected skips. Live browser checks passed 9 / 1 expected skip; fresh installations of the publicly hosted package and skill converted real synthetic PDF/PNG/ZIP outputs. The actual in-app browser discovered all six native tools and converted/configured/downloaded a sample without flags or a shim. No new monthly services were added; existing hosting/bandwidth and the caller's agent/runtime costs remain. Production image and rollback are in the deployment record.

## Claude distribution work — 2026-10-22

User authorized actual Claude web skill testing and a one-click desktop extension ready for submission, with no new monthly costs. Read `docs/claude-distribution-2026-10-22.md` and `docs/claude-submission/README.md` for acceptance and submission truth. The public 0.1.0 skill installed in Claude web; its Node 22 sandbox needed explicitly authorized official Node 24 setup, after which real downloaded PDF/PNG/ZIP geometry/hashes passed and manual output was withheld. This is not setup-free hosted acceptance.

Source branch `codex/claude-distribution` prepares a self-contained macOS 13.5+ MCPB, both Apple Silicon/Intel runtimes, required workspace restriction, tool annotations and a 0.1.2 local package. Actual Desktop 0.1.1 conversion exposed unsupported hard links on the ExFAT external drive. Version 0.1.2 adds exclusive/no-clobber fallback and cleanup, with documented visibility/abrupt-termination limits. The actual installed 0.1.2 extension now passes the identical analyze/convert request and outside-workspace rejection; independently inspected PDF/PNG/ZIP geometry and hashes pass. Both extracted architectures pass conversion/resource/cancellation checks with network denied. Claude returns local paths/resource URIs but this host does not attach conversation download cards. Check the verification document for exact archive identity and source review. No directory listing, terms acceptance, cloud resource, subscription or production website deployment is implied.
