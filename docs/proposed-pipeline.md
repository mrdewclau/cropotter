# crop/ship: proposed pipeline

Status: architecture revised on 2026-10-21 with ITPP130B research. The user confirmed the white margin on all four sides and requested direct printing, with both phone platforms supported and iPhone prioritized. No application has been implemented or hardware tested.

## Objective

Accept an uploaded PDF or a direct PDF URL and produce a printer-ready 4 × 6 inch shipping label. Deliver the same conversion behavior through a web app, Chrome extension, and Electron app for Windows and macOS. Focus printer integration on the MUNBYN ITPP130B. Add thin native mobile shells for iOS and Android to support the requested all-in-one Bluetooth workflow; prioritize iPhone hardware acceptance while retaining Android in the architecture and acceptance matrix. Keep interfaces minimal and processing free of usage fees. No unrelated features.

Target everyday flow after initial printer setup: ingest PDF or URL → identify label → crop and validate → automatically send to the selected printer. PDF, PNG, and JPG downloads remain available. Ambiguous crops or uncertain transmission outcomes require review instead of automatic printing.

## Output contract

- PDF pages measure exactly 288 × 432 PDF points (4 × 6 inches).
- The confirmed margin is at least 1/8 inch (3.175 mm / 9 PDF points) of white space on every side. No decorative line is added.
- Preserve aspect ratio. Never stretch labels or clip barcode quiet zones. Fit the detected label inside the 270 × 414 point usable area.
- Privacy gate: build exported PDFs from the selected visible label pixels at 300 DPI in a fresh document. Do not copy source PDF objects or pass through canonical PDFs, since hidden/cropped-out data can survive. Preserve proportions and verify barcode decoding; upscaling does not restore missing detail.
- Export PDF, lossless PNG, and JPG. Offer 203 and 300 DPI raster output, respectively 812 × 1218 and 1200 × 1800 pixels, with density metadata. The ITPP130B profile uses its advertised 203 DPI; 300 DPI export does not increase that printer's resolution. JPG is a convenience export; PDF and PNG are preferred for barcodes.
- Round raster safe margins inward to protect the white border: at least 26 pixels at 203 DPI and 38 pixels at 300 DPI. Pixel quantization cannot represent an exact 1/8 inch at either resolution. Keep exact physical geometry in the PDF and calibrate device dot pitch separately.
- Distinguish true 4 × 6 inch stock (101.6 × 152.4 mm) from 100 × 150 mm stock. Never silently substitute the latter. The requested default output remains true 4 × 6; select and label a separate physical media profile only when needed.
- Add monochrome TIFF only if printer compatibility testing establishes a need. ZPL is a separate printer language and must not be represented as universally compatible.

## Architecture and alternatives

Recommended: a shared TypeScript engine using PDF.js for inspection/rendering and pdf-lib for PDF output, with platform adapters for file input, URL retrieval, raster encoding, saving, and printing. This keeps label processing local and shares crop decisions across web, extension, desktop, and mobile shells.

Keep the normalized label and export engine independent from a model-specific printer encoder and the physical transport. For raw BLE printing, our printer encoder creates the verified monochrome bitmap/commands, delivered by Web Bluetooth or native mobile BLE. For installed OS queues, submit an exact-size printable page through the platform print API and let the vendor driver encode it; do not pass raw model commands through the normal rendered-page path. A raw Bluetooth connection does not accept a PDF or PNG automatically.

Use a small Capacitor-style mobile shell with bundled web assets, an iOS Core Bluetooth adapter, and an Android BLE adapter. Final framework and plugin versions belong in the implementation plan. The native boundary is for device access and file/URL handling; label detection and geometry remain shared. Electron is the Windows/macOS shell, not the phone runtime.

A hosted conversion service simplifies browser URL fetching but introduces operating costs and sends address data to a server. Separate native and browser pipelines would increase dependencies and risk inconsistent results. Neither is recommended for the initial implementation.

## Processing

1. Validate PDF signature, parseability, page count, file size, and resource limits. Handle encrypted, malformed, blank, or excessively large inputs with explicit errors.
2. Inspect the PDF page boxes, rotation, text, vector marks, and raster ink bounds. Normalize coordinates before selecting a label region.
3. Detect a coherent label rectangle, retaining surrounding barcode quiet zones. A whole-page trim is insufficient when an invoice or instructions share the page.
4. Use confidence checks. Automatically export only unambiguous detections. For multiple labels or ambiguous layouts, require selection or crop adjustment in a minimal preview. Never silently discard other pages.
5. Place the selected region on an exact 4 × 6 page with the agreed margin, preserving proportions. The visible crop is rasterized at 300 DPI into a fresh PDF to exclude hidden source objects; raster outputs derive from this final PDF geometry.
6. Validate output geometry, margin, ink containment, raster dimensions, and barcode readability where supported before presenting exports. Report when source quality prevents reliable validation.

## Platform boundaries

The web app processes uploaded files locally. Direct URLs work when the remote host allows browser CORS; otherwise explain the restriction and offer uploading the downloaded PDF. Do not introduce a public unrestricted URL proxy.

For compatible desktop Chrome and Chrome on Android, investigate direct ITPP130B printing through Web Bluetooth. MUNBYN's own web editor documents Bluetooth support for this model, including Mac/Chromebook connection notes. This is evidence of feasibility, not an SDK grant or proof of crop/ship compatibility. Browsers require initial user activation and device permission. Remember the selected device where supported and reconnect without another chooser when permissions and device availability allow.

Standard iPhone/iPad browsers without an extra native Bluetooth bridge are not a supported direct transport. The iOS shell uses Core Bluetooth after the OS permission prompt. The Android shell uses native BLE; Chrome on Android can offer an additional web route after validation. Both phone apps accept files and pasted URLs; investigate share-sheet import as part of the same ingestion feature. Fetch direct URLs through a bounded native adapter when needed, keeping signed query strings intact and out of logs. Initial implementation stays in the foreground; background/locked-screen printing is not promised.

The Chrome extension uses Manifest V3, a bundled PDF worker, and explicit user initiated host permission for fetching a label URL. Do not request access to every website at installation. Run Bluetooth work in a persistent foreground extension tab, not its service worker or a popup that disappears on blur. Verify the actual extension context and browser version. Where necessary, use an authenticated native-messaging bridge to the installed desktop app for printing; it is an explicit installation dependency, not browser-only silent printing. Do not use obsolete Chrome Apps Bluetooth APIs.

Electron uses a sandboxed renderer, context isolation, and a narrow validated IPC bridge. Fetch only HTTP(S) URLs with resource limits; keep Node capabilities out of the renderer. Package Windows and macOS builds through their respective CI runners. Signing, notarization, and store publication require appropriate accounts and credentials.

For the first supported desktop route, enumerate installed OS printers and remember the exact selected system queue. Windows can use the vendor's Bluetooth or USB driver; macOS can use the vendor's USB driver. Electron supports selecting an installed printer and silent submission. Explicitly set 101600 × 152400 micrometres, 100% scale, portrait, one copy, and no additional print-layout margins, because the label already contains its 1/8-inch margin. Validate the effective media and driver behavior on each OS. Never silently fall back to the default printer. Native macOS BLE is a separate candidate beyond the documented USB-driver route.

## ITPP130B integration and job behavior

The source-backed findings and protocol leads are recorded in [munbyn-itpp130b-research.md](munbyn-itpp130b-research.md). The device supports more than the phone vendor-app workflow. No public ITPP130B-specific mobile SDK was located in the reviewed manufacturer download listing; SDKs for other MUNBYN models do not establish compatibility.

Before choosing a production encoder, inspect an actual target unit's model, firmware, advertised services, writable characteristics, notification behavior, and effective media geometry. Public sources show differing BLE profiles, so do not assume one UUID fits every unit. Prefer a documented manufacturer protocol/SDK if available under usable terms; otherwise validate an independently implemented model-specific protocol against the printer. Do not copy proprietary web-editor code into crop/ship.

Direct-print preparation renders the final label at the calibrated printer resolution, converts it to a one-bit bitmap while preserving barcode edges, and encodes the verified printer commands. Start with a thresholded text/line mode and no photo dithering; verify that thin lines and all supported barcodes survive. Test polarity, row packing and padding, direction, label length, gap sensing, and buffer pacing. Never print through the JPG export path. PDF/PNG remain user exports, not assumed raw printer languages.

The user selects the physical printer and enables auto-print once. A deliberate label import can then trigger one print after validation. Store the selected device identity and profile; do not choose by a common device name or silently switch devices. Serialize jobs, bound transfer sizes, and handle busy/offline, phone-to-desktop handoff, permissions, disconnects, and app sleep.

Track preparing, ready, connecting, sending, submitted, failed-before-send, and outcome-unknown. OS spooler acceptance and successful GATT writes mean submitted, not confirmed physical output. Show printed only if a verified device acknowledgement supports that claim. Retry automatically only when no print bytes could have been accepted. A disconnect, cancellation, or timeout after possible transmission becomes outcome-unknown; stop automatic replay and let the user inspect the paper before an explicit reprint. Avoid duplicate submissions from repeated callbacks without suppressing intentional reprints.

## Verification and limits

Use the supplied shipping-label PDF as a private fixture if retrievable; never commit customer address data or its signed URL. Add synthetic fixtures for native 4 × 6, letter/A4 with instructions, scanned labels, rotated pages, blank pages, multiple labels, and malformed PDFs.

Verify exact PDF page size, minimum white margin, pixel dimensions, orientation, unchanged aspect ratio, and decodable barcodes before and after conversion. Exercise upload and URL flows in the web and extension builds and packaged Electron flows on Windows/macOS.

Physical print acceptance requires a real ITPP130B at 100% / actual size with driver scaling disabled. Measure output size, all four white margins, orientation, and clipping on true 4 × 6 stock; measure stock and gap separately. Scan supported shipping barcodes from the actual print. Test one label and a sequence, no extra blank labels, paper-out/cover-open where status is available, mid-transfer disconnect, power cycle, denied permission, device already in use, sleep/resume, and recovery without duplicate output. A successful file export, queue entry, or Bluetooth write is not a substitute for these checks.

Prioritize iPhone/Core Bluetooth acceptance, then exercise Android native BLE and Android Chrome, desktop Chrome/Web Bluetooth, the extension foreground tab, Windows driver Bluetooth/USB, and macOS driver USB. Record exact OS/browser/app versions, printer model/firmware, media dimensions, protocol profile, and driver settings. Keep untested routes explicitly unverified. Software cannot guarantee every thermal printer or repair unreadable source barcodes.

## Delivery sequence

1. Establish the target unit's capabilities and prove one synthetic calibration/barcode label over iPhone BLE. Research protocol/SDK availability and document the result before advertising direct-print support. Android follows the same contract and is included in this validation milestone. The shared crop/export engine can proceed independently while hardware access is pending.
2. Build and verify the shared PDF intake, detection, geometry, and export pipeline against private and synthetic fixtures.
3. Add the model encoder, serialized job handling, native iOS/Android transports, and upload/URL → crop → print flow. Validate first-time selection and subsequent auto-print behavior.
4. Package the minimal web and Chrome extension wrappers with the validated browser route, plus Windows/macOS Electron wrappers using the supported system drivers. Investigate direct macOS BLE separately from USB acceptance.
5. Run the physical acceptance matrix and distribution checks. Signing and mobile-store distribution have account requirements; free local conversion/printing does not imply free store developer accounts. Keep design work limited to controls required for ingestion, printer setup, crop review, and job recovery.

## Remaining decisions and evidence

The margin interpretation and iPhone-first phone priority are confirmed. The next implementation plan must preserve Android support, all three original desktop/web deliverables, and the single crop/print feature. Direct BLE profile selection, printable area, transfer reliability, and physical barcode acceptance remain hardware questions. No printer is attached to this workspace, so this research does not claim a tested end-to-end implementation.
