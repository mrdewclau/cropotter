# Engine verification

Date: 2026-10-21. Engine: 0.1.0. Runtime: Node 24.19.0, Linux x86_64. This is the shared engine milestone in [engine-build-plan.md](engine-build-plan.md).

## Automated and independent checks

- TypeScript strict type checking and declaration build.
- Synthetic PDFs and real Code128, QR, PDF417 and Data Matrix barcodes exercise input → selection → canonical PDF → 203/300 DPI images → packed monochrome output.
- Native 4 × 6 and landscape-letter embedded images/Forms; instructions; multiple labels/pages; blank, malformed, encrypted and oversized inputs; rotations; nonzero boxes/UserUnit; cancellation; serialization; preserved vector text; annotation raster fallback; idempotence; barcode loss/count changes and white-margin regressions.
- Actual PNG/JPG decode checks dimensions, margin pixels and barcode evidence. CLI tests write real artifacts and reopen their manifest and bitmap.
- Playwright runs the engine and file/crop/export harness in Chromium, Firefox and WebKit. Tests block external HTTP requests during conversion. Local bundled assets are used for PDF and barcode processing.
- Independent Python pypdf/Pillow inspection of the CLI's landscape-letter fixture output confirmed all five PDF page boxes at `(0, 0, 288, 432)`, Rotate 0, UserUnit 1; PNG/JPG at 812 × 1218; PNG density 202.9968 DPI (integer pixels/metre rounding) and JPEG density exactly 203 DPI.

Exact final test counts and code review results are recorded below when final checks finish.

## Test host setup

Chromium and Firefox ran with the host libraries. This unprivileged container lacked several WebKit runtime libraries and cannot install system packages as root. Official Debian trixie packages were extracted locally and copied into Playwright's own browser runtime directories. WebKit launched and executed the actual tests. `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` bypassed Playwright's system `ldconfig` inventory check, which cannot see those private libraries; it did not skip tests. Normal machines should use `npx playwright install --with-deps chromium firefox webkit`.

## Explicit limits

The original private customer PDF was inspected during research but is not committed. The regression fixture reproduces its inspected geometry: a 792 × 612 point landscape-letter page with a 288 × 432 embedded label at top-left `(36, 90)`. Current automated acceptance uses synthetic data; a current private customer-file check remains outstanding.

ZXing's MaxiCode reader requires an isolated, unrotated, unskewed symbol. Full-label localization for MaxiCode is not implemented. MaxiCode-only test labels require review. Barcode validation covers detected supported symbols; it cannot establish preservation of symbols the reader fails to detect. Low-quality scans and unsupported content must receive human review; upscaling does not restore source quality.

No real iPhone/Android device, extension context, Windows/macOS driver, or ITPP130B was attached. Browser WebKit tests are not iPhone hardware acceptance. The bitmap is a defined raster contract, not verified printer commands. Next printer work must establish the firmware/protocol, native BLE paths, calibrated media geometry, transfer outcomes and physical barcode readability described in [munbyn-itpp130b-research.md](munbyn-itpp130b-research.md).
