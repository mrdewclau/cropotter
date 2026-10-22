# CropOtter website verification

## Current process-demonstration revision — 2026-10-22 (America/New_York)

Equal aligned panels replace the uneven intake composition. A large synthetic shipping-label PDF is cropped with orange guides, then becomes a finished 4 × 6 label; captions and steps follow the sequence, with working Pause/Play. Reduced-motion/no-WebGL fallback fits even 568×320. Link-form controls remain reachable on phones. The final production-build suite passed **21 checks, with 3 expected skips**, in Chromium and iPhone SE WebKit emulation; website unit/service tests passed **39/39**, typecheck and build passed. The animation/pause regression failed before implementation; fallback clipping and contrast regressions were reproduced and corrected. Independent review found no remaining important findings. No shared-engine changes were made in this revision.

Latest deployment: [2026-10-22 record](deployment-2026-10-22.md). Screenshots show the live revision. Physical phone/printer acceptance remains outstanding.

## Previous app-shell release — 2026-10-21 (America/New_York)

Live at **https://cropotter.com**, hosted on the existing DigitalOcean Droplet with GoDaddy DNS and Caddy HTTPS. See [deployment record](deployment-2026-10-21.md) for image identity, target, DNS preservation and rollback.

The approved replacement is a viewport-fitting app shell, not the original long landing page. Upload shares one bounded area with a Three.js/typography guide; narrow screens use a compact arrangement within that same workspace. Result controls and previews stay visible, help/privacy open on demand, and only bounded supporting panes may scroll. Screenshots under `docs/images` now show this live release.

Final production-build acceptance: **21 passed, 3 intentionally skipped**, across desktop Chromium and iPhone SE WebKit emulation. Ten viewport sizes include 320×480, 375×480, 320×568, 375×667, 390×844, 568×320, 701×550, 800×600, 1280×720 and 2560×1440. Checks measure document size, guide-content fit, essential control reachability and source-canvas proportions, alongside real conversion/downloads, manual review, multiple pages, retry/cancel, changing animation frames, fallback motion, focus and axe accessibility. The private fixture is absent in both projects; the phone project also skips the desktop text/width sweep. Engine tests: 52/52. Website unit/service tests: 39/39. Both typechecks and the production build passed.

Production-only font sizing was caught by the geometry checks: legacy selector prefixing changed specificity for `:is()`. Direct-child heading selectors preserve the same cascade in development and optimized builds. Short-screen reset/privacy reachability, narrow-short panel overlap, modal focus restoration and WebGL-loss animation shutdown were also corrected. Independent review found no remaining important issue.

To repeat supported live checks, set `CROPOTTER_BASE_URL=https://cropotter.com` when running the website Playwright configuration; this bypasses the local web-server startup. Do not describe this emulation as physical phone/printer acceptance. Fresh dependency auditing was unavailable because the registry audit endpoint timed out.

## Historical initial website acceptance

Implementation: `feat/website`, based on engine commit `4e9e8d6`. Verification date: 2026-10-22. The approved identity is direction 04, The Mailroom Stamp.

## Completed checks

- Engine TypeScript check and 52 engine tests pass. Website TypeScript check and 39 unit/service tests pass.
- Production Vite client and standalone Node server build successfully. PDF workers, WASM, fonts and sample PDF are served locally.
- The production browser matrix passed **43 checks with 2 intentional skips**, across desktop Chromium, Firefox, WebKit, iPhone SE WebKit and Pixel 7 Chromium. Every browser converted the original private supplied label. The two phone contexts skip the desktop-driven viewport sweep; each desktop browser exercises it. Actual PDF/PNG/ZIP bytes, crop review, cancellation, multi-page output, fallback graphics, responsive layout, keyboard focus and axe accessibility checks passed.
- Production dependency audit reports zero known vulnerabilities after updating fflate to 0.8.3.
- Final Docker image `cropotter:review` built successfully: local image ID `sha256:e4c7a88e468b6e1b27750bc419da70c17e9ab59fbad7880227f6df7a75139df9`. Container acceptance passed after the backend correction: health, security headers, Three.js enhancement, actual sample PDF conversion/download and iPhone Safari conversion/crop previews. The container ran as non-root with a read-only filesystem and loopback port binding. Synthetic desktop/phone screenshots are under `docs/images`. This is a local image ID, not a published registry digest.

## Final independent review

One material issue was found and fixed: the four-request limit previously released a slot after queuing PDF bytes, allowing slow clients to retain more outstanding responses. Slots now stay occupied until response finish/close, release exactly once, abort on disconnect and enforce a 30-second delivery timeout. A paused-client regression failed before the fix (fifth response returned 200), then passed (fifth response returns 429; disconnect releases a slot). All 39 website unit/service tests and the typecheck passed after the correction. The complete browser matrix preceded this backend-only correction; its frontend bytes are unchanged.

The reviewer independently reran the paused-client regression and confirmed the finding resolved, with no remaining material issue in the fix. The review found no other material issue in URL policy, DNS pinning, redirect validation, stale-result protection, object URL cleanup, crop/page accounting or build configuration. Physical phone dragging/resizing and printer scans remain acceptance work; emulated phone tests tap controls and rotate a crop.

## Browser acceptance matrix

The Playwright suite covers desktop Chromium, Firefox, WebKit, iPhone SE WebKit and Pixel 7 Chromium. It exercises real conversion and download files, 203/300 DPI, multi-page packaging, crop editing and review gating, signed-query preservation, error recovery, cancelled fetch replacement, keyboard navigation, and axe WCAG 2 A/AA checks. Responsive checks cover widths 320–2560, a short landscape viewport and 200% root text size. Reduced motion and unavailable WebGL use the static fallback.

The private supplied PDF is enabled only through `CROPOTTER_PRIVATE_PDF`; it is never bundled or committed. Synthetic fixtures and sample data are used for screenshots. Phone contexts are browser emulation, not physical-device or physical-printer acceptance.

```sh
npm run fixtures
npm run typecheck
npm run typecheck:web
npm test
npm run test:web
npm run build:web
CROPOTTER_PRIVATE_PDF=/absolute/private/label.pdf npm run test:web:browser
npm audit --omit=dev
```

The private-file variable is optional; that one acceptance case skips when absent. Install Playwright browser dependencies on a fresh test host. In this managed environment, `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` bypasses browser-library inventory validation; actual browsers and conversions still execute.

## Service policy

Tests exercise URL scheme/credential/port restrictions, local and private IP rejection, mixed private/public DNS answers, validated redirect targets, pinned addresses, streamed byte limits, timeout during DNS, HTML rejection, static traversal, bounded request bodies and cross-origin POST rejection. Incoming cookies and authentication are never forwarded to PDF hosts. Responses and errors avoid supplied signed URLs. The service keeps no label database or disk storage.

## Release limitations

Production deployment, GoDaddy DNS, valid root/www HTTPS and live conversion/download checks are now recorded above and in [the deployment record](deployment-2026-10-21.md). Direct Bluetooth printing, accounts/queues, extensions and native apps remain separate milestones. The current website produces downloads for the user's normal PDF viewer or printer workflow.

Live HTTPS acceptance passed **8/8** checks across Chromium and iPhone SE WebKit emulation: viewport/control fit, process phases and pause/resume, actual PDF/PNG/ZIP downloads and reduced-motion/no-WebGL conversion.

## Editable download names — 2026-10-22

Website unit/service tests: **40/40 passed**; typecheck and production build passed. The filename sanitization regression failed before implementation. Browser acceptance checks actual suggested PDF/PNG/ZIP filenames, ZIP entry names both through the link URL and ordinary download, name persistence through DPI changes, and empty/unsupported input fallback. The viewport sweep also asserts the filename field remains reachable at all ten sizes. Independent review confirmed the renamed ZIP link fix and found no remaining important findings. AppleDouble filesystem metadata is excluded from Vitest discovery.

Final filename-release production-build browser acceptance: **23 passed, 3 expected skips** across Chromium and iPhone SE WebKit emulation. Live HTTPS filename/download/archive acceptance: **2/2 passed**. Container health verified after deployment. Updated result screenshots show the live File name control.

Focus-outline correction: live regression reproduced a 7px right-edge clip on the PNG resolution select. Download-panel focus outlines now render inside controls, preserving the full indicator without changing panel dimensions.

Dropdown spacing correction: native arrow placement crowded the right edge, especially under the phone rule that reduced all select padding to 6px. The resolution selector now reserves 44px, with an 18px chevron inset 14px. The regression reproduced insufficient reserved space before the correction.

Final live dropdown-spacing and focus regression: **2/2 passed**, desktop Chromium and iPhone WebKit emulation; live screenshots visually checked. Container healthy.

## Link preview and upload badge — 2026-10-22

Website typecheck, production build and **41/41 unit/service tests** passed. MP4 MIME/range regression failed before implementation; standard, open-ended, suffix, unsatisfiable ranges and HEAD now pass. Independent review found no important findings. The upload badge regression reproduced a 9px horizontal glyph offset, then passed with grid centering. Production-build browser subset: **9 passed, 1 expected skip** in Chromium and iPhone WebKit emulation, covering static share metadata/image/video requests, actual MP4 range bytes, upload centering, ten viewport sizes, conversions/downloads and accessibility. The compact phone layout deliberately hides the badge.

The generated PNG and portable Tesseract animation/filmstrip were visually reviewed. FFprobe confirms 1200×630, 7 seconds, H.264/yuv420p and no audio; combined preview media are below 10 MB. Actual iMessage sending/autoplay remains unverified. See [preview notes and prompt](share-preview.md).

Live HTTPS preview/centering acceptance: **3 passed, 1 expected compact-phone badge skip**. Direct public MP4 playback was visually checked in the in-app browser. Container health verified. This is not an actual iMessage share test.

## Global boxed-control focus correction — 2026-10-22

The PDF-link input's focus outline was clipped 7px on both horizontal sides by its bounded source pane. A live regression failed before the fix. Boxed controls now keep their focus outlines inside their own borders throughout the app, rather than limiting that treatment to result actions. Text-link styles retain their separate treatment. Production build passed; focused browser regressions and axe accessibility checks passed **6/6** in Chromium and iPhone WebKit emulation. No layout geometry or conversion logic changed.

Live global-focus acceptance: **4/4 passed** across Chromium and iPhone WebKit emulation for PDF-link and download controls. The focused link field was visually checked on the live site; proof is `docs/images/link-focus.png`. Container healthy.

## Security review — 2026-10-22

See [security review](security-review-2026-10-22.md) for scope, findings, corrected privacy/parser behavior and shared-host maintenance limits. Engine 61/61, website/service 43/43, both typechecks, engine build and production web build passed. Engine Chromium 3/3 passed. Source review reproduced and corrected recoverable cropped-out PDF data and pre-budget ObjStm expansion; exports are now fresh 300 DPI raster PDFs. Unit regressions cover canonical source sanitization, object/depth/decode caps, per-client quota fairness, forged identity headers and pre-aborted promise rejection.

Final security-release browser matrix: **76 passed, 9 expected skips** across all 5 browser projects. Live conversion/download/crop/name checks: **6/6 passed**. Seventeen bounded post-fix hostile probes passed; legitimate PDF-link fetch succeeded. See the security report for the initial setup failures, exact skip reasons and remaining shared-host maintenance.
