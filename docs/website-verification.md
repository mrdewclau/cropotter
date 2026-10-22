# CropOtter website verification

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

DigitalOcean and GoDaddy account/browser access is still unavailable. No production deployment, DNS modification, live HTTPS verification or live-domain conversion has happened. See [deployment instructions](../deploy/README.md). Direct Bluetooth printing, accounts/queues, extensions and native apps remain separate milestones. The current website produces downloads for the user's normal PDF viewer or printer workflow.
