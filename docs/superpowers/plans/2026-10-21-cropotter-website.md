# CropOtter Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship the approved CropOtter website with real label formatting and responsive, accessible interaction.

**Architecture:** A React/Vite browser client uses the existing shared engine. A standalone Node service serves the client and safely retrieves linked PDFs. DigitalOcean runs the Docker image; GoDaddy points cropotter.com to the verified deployment.

**Tech Stack:** Node 24, TypeScript, React, Vite, Three.js, fflate, existing PDF engine, Vitest and Playwright.

**Spec:** docs/superpowers/specs/2026-10-21-cropotter-website.md

## Global Constraints

- Approved CropOtter direction 04; preserve 4 × 6 output and at least 1/8 inch margins.
- Local engine assets; no customer-label persistence or private samples in source.
- 320–2560 CSS pixels; targets at least 44 px; reduced motion and no-WebGL fallback.
- DigitalOcean and GoDaddy deployment only; preserve unrelated services/DNS.

## Review Focus

- Public-looking host resolving privately or redirecting privately: reject before connection.
- Old conversion/export finishing after cancellation or replacement: discard stale state and release URLs.
- Ambiguous or multi-page PDF: retain every page decision and require deliberate crop/review.
- Small-screen crop dragging, browser zoom and large text: no trapped scrolling or unreachable controls.
- Safari downloads and unavailable graphics APIs: persistent downloadable anchors and functional static fallback.

---

### Task 1: Safe service and portable build

**Files:** apps/web/server/{url-policy,pdf-fetch,app}.ts; apps/web/scripts/_; Dockerfile; deploy/_; package.json; apps/web/test/server.test.ts.

**Interfaces:** `validatePdfUrl(value: string): URL`; `fetchPublicPdf(value: string, options?): Promise<Uint8Array>`; `createApp(options?): http.Server`; POST /api/pdf returns application/pdf or sanitized JSON errors; GET /healthz returns readiness.

- [ ] Write and run failing tests: reject private/credentialed/non-HTTPS URLs, mixed private DNS, unsafe redirects, oversize/time limits; return valid PDF through bounded transport; reject static traversal.
- [ ] Implement the pinned-connection PDF fetcher and HTTP application, with injection at DNS/transport for deterministic policy tests.
- [ ] Add build scripts and a multi-stage Node 24 Docker deployment; run service tests and commit.

### Task 2: Working conversion experience

**Files:** apps/web/src/{App,Converter,ResultPanel}.tsx; apps/web/src/lib/{conversion,downloads,input}.ts; apps/web/public/sample-label.pdf; apps/web/test/input.test.ts.

**Interfaces:** `convert(bytes, selections, dpi, options): Promise<Conversion>` carries the engine result, image artifacts and prepared PDF. UI owns cancellation generations and object URL lifetimes. Persistent anchors download PDF/PNG/ZIP. Server link input consumes Task 1's endpoint.

- [ ] Write and run failing input/export tests and browser conversion acceptance test.
- [ ] Add file/drop/link/sample input; actual engine progress; cancel/retry; image/page/DPI selection; reviewed warning gating; persistent PDF/PNG/ZIP downloads; optional native file share.
- [ ] Verify real conversion with synthetic fixtures and the original private supplied label; commit.

### Task 3: Crop review

**Files:** apps/web/src/{CropEditor,PagePreview}.tsx; apps/web/src/lib/crop.ts; apps/web/test/crop.test.ts; apps/web/test/browser/website.spec.ts.

**Interfaces:** editor takes source bytes plus analysis and existing selections, returns `Selection[]`; source coordinates follow engine top-left visible-page points; rotation affects the output.

- [ ] Write and run failing crop geometry tests (bounds, minimum size, keyboard/pointer deltas) and review browser test.
- [ ] Implement responsive PDF source preview; drag/resize; keyboard movement/resize; accessible sliders; multiple regions; explicit skip; page/rotation controls; apply/cancel.
- [ ] Verify no page loss, touch controls and review acknowledgement; commit.

### Task 4: Identity and responsive Three.js refinement

**Files:** apps/web/src/{HeroScene,Icon}.tsx; apps/web/src/scene.ts; apps/web/src/styles.css; apps/web/public/brand/\*; index.html.

**Interfaces:** `mountScene(host): Promise<() => void>` enhances static art without owning product state. It never intercepts scroll, observes reduced motion/visibility/resize, caps DPR at 1.5, and returns cleanup.

- [ ] Apply the approved typography, artwork and palette to the full page; add useful how-to, FAQ and privacy copy.
- [ ] Implement the Three.js enhancement and static fallback.
- [ ] Run layout and accessibility checks in Chromium/Firefox/WebKit, touch-phone coverage, reduced motion and no-WebGL scenarios; inspect screenshots and commit.

### Task 5: Production review, deployment and domain

**Files:** apps/web/test/browser/_; docs/website-verification.md; deploy/_; README.md.

**Interfaces:** Docker image exposes PORT (default 8080); /healthz readiness; deploy configuration declares cropotter.com/www without affecting email DNS.

- [ ] Run full typecheck, unit and browser suites; production build and service checks. Dispatch one fresh whole-branch reviewer per executing-plans, fix material findings with regression coverage.
- [ ] Deploy using the user's connected DigitalOcean account, verify health and an actual live label download, and configure the verified target at GoDaddy while preserving MX/TXT and unrelated records.
- [ ] Verify HTTPS and canonical host, record exact deployment evidence, and report any access blocker honestly. No substitute hosting.
