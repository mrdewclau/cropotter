# CropOtter website verification

Implementation: `feat/website`, based on engine commit `4e9e8d6`. Verification date: 2026-10-22. The approved identity is direction 04, The Mailroom Stamp.

## Completed checks

- Website TypeScript check and 38 unit/service tests pass.
- Production Vite client and standalone Node server build successfully. PDF workers, WASM, fonts and sample PDF are served locally.
- A production Chromium run passed eight functional checks, including the original private supplied label, crop editing, multi-page output, cancellation, actual PDF/PNG/ZIP bytes, fallback graphics and responsive layout. Its remaining decorative-text contrast finding has been corrected; the full browser matrix is in progress.
- Production dependency audit reports zero known vulnerabilities after updating fflate to 0.8.3.
- Docker multi-stage build passed; the final corrected image is rebuilding for container acceptance.

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
