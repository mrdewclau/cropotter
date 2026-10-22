# Pick up CropOtter here

Last updated: **2026-10-22 (America/New_York)**. The public repository is deployed on DigitalOcean and GoDaddy DNS points cropotter.com to it. See `docs/deployment-2026-10-22.md` for the latest production record.

## Continue locally

The repository is checked out at `/Volumes/extra_space/cropotter`. Read `AGENTS.md` and `deploy/README.md` before changes. Production is on DigitalOcean Droplet `597065633` (`fww-desk`, `138.197.81.94`), in `/opt/cropotter`, with Docker Compose project `cropotter` and Caddy HTTPS. Preserve all other host applications and DNS records.

Use Node 24+. Run `npm ci --no-audit`, `npm run dev:web` (port 4174), or `npm run build:web` and `npm run start:web` (port 8080). The npm audit endpoint timed out during deployment; audit is a separate check, not part of image installation.

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
