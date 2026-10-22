# Pick up CropOtter here

Last updated: **2026-10-22**. User chose to publish the project as a **public open-source repository** and continue locally to deploy it.

## First action in local Codex

Clone this repository, open its folder as a local Codex project, and ask:

> Read HANDOFF.md, AGENTS.md and deploy/README.md. Continue CropOtter from this checkpoint. Inspect my connected DigitalOcean account and deploy the working website there, then configure cropotter.com at GoDaddy. Preserve unrelated services and DNS. Verify HTTPS and an actual live sample-label conversion/download. Deployment and domain setup are already authorized.

Use Node 24+. Run `npm ci`, then `npm run dev:web` and open `http://127.0.0.1:4174`. Production: `npm run build:web`, then `npm run start:web` on port 8080.

## What is finished

- Working shared PDF engine and customer website: upload/drop/direct HTTPS link, automatic fitting, crop editor and PDF/PNG/ZIP downloads.
- Exact portrait 4 × 6 inch output, proportions preserved, minimum ⅛ inch white margin on every side. No branding added to output.
- 203/300 DPI images, all-label ZIP, multi-page decisions, rotation, explicit skipping, manual-review acknowledgement, cancel/retry and stale-job protection.
- Approved CropOtter identity **04 — The Mailroom Stamp**, complete brand board, editable Tesseract source, clean vector companions, fonts and design tokens under `brand/`.
- Fluid 320–2560 CSS-pixel layouts, large text, keyboard controls, phone controls, Three.js decoration and static reduced-motion/no-WebGL fallback.
- Standalone Node service and multi-stage Docker build; local engine assets and fonts; readiness route; Docker Compose and Caddy examples.
- URL proxy rejects private addresses and private redirects, validates all DNS answers, pins the selected address, limits bytes/time/concurrency and bounds slow response delivery. Files/links are never persisted.

## Verification checkpoint

Engine: 52/52 tests and typecheck passed. Website: 39/39 unit/service tests and typecheck passed. Browser matrix: 43 passed, 2 skipped across desktop Chromium/Firefox/WebKit, iPhone SE WebKit and Pixel 7 Chromium. The layout sweep is intentionally skipped in the two phone contexts; desktop browsers run widths 320–2560, short landscape and enlarged text. All five browsers converted the original private supplied PDF successfully. Production dependency audit: zero known vulnerabilities.

The final independent review found one material issue: releasing a PDF fetch slot before a slow response finished. It was reproduced with paused clients, corrected to hold the slot until finish/close, and covered by a regression. The full browser acceptance preceded that backend-only correction; the service regression/typecheck were rerun. Docker acceptance includes health/security headers, actual sample conversion/PDF download and iPhone Safari crop screenshots. See [verification](docs/website-verification.md) for the final image evidence.

Browser phone contexts are emulation, not physical-device testing. Real-device Safari file sharing, touch dragging/resizing and actual printer scanning still need acceptance. No real labels or signed customer links are in this repository. To rerun the private acceptance locally, set `CROPOTTER_PRIVATE_PDF` to a locally held PDF; otherwise those cases skip.

## Deployment is the next milestone

**Nothing has been deployed to DigitalOcean and no DNS records have been changed.** The user signed into DigitalOcean and GoDaddy in the app browser, but this cloud session exposed only the current tab URL, without browser-control tools. It had no DigitalOcean/SSH credentials. Local continuation is intended to close this access gap. Do not mistake full workspace access for browser control; use the available supported connection in the local session.

Deployment and GoDaddy changes were explicitly authorized. Do the normal read-only inspection first, choose the existing intended DigitalOcean target if one exists, preserve unrelated applications, and avoid inventing account/app IDs or target IPs. Do not publish through Sites or substitute another hosting service. No database or persistent volume is required for this milestone.

Public DNS snapshot used GoDaddy nameservers `ns29.domaincontrol.com` and `ns30.domaincontrol.com`; no MX/TXT/AAAA/CAA records were observed on 2026-10-22. Refresh this snapshot before edits. Keep MX/TXT and unrelated records intact, set only verified target records, and check root and www HTTPS plus the canonical redirect. Follow [deploy/README.md](deploy/README.md).

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
