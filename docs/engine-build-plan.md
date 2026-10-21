# crop/ship engine implementation plan

Authorized by the user's “Implement the proposed plan.” This document records the six milestones from the accepted conversational plan. The source requirements are in proposed-pipeline.md; subsequent account and background-print discussions belong to later integrations.

1. Geometry, typed contracts, synthetic fixtures and runtime adapters.
2. Bounded PDF/file/URL intake and page inspection.
3. Deterministic native-page, embedded-image and raster-region detection; review and manual selection.
4. Canonical PDF composition with vector preservation, exact geometry, annotation fallback and idempotence.
5. PNG/JPG exports with density metadata and packed monochrome thermal output.
6. Barcode validation, developer CLI/browser harness, cross-runtime tests, documentation and review.

Contract: 288 × 432 point PDF pages; at least 9 point white margins; aspect ratio preserved; 812 × 1218 at 203 DPI and 1200 × 1800 at 300 DPI; at least 26/38 raster margin pixels. PDF is the canonical artifact. No silent page loss, guessed automatic crops, paid APIs, printer commands or hardware compatibility claims.

Public engine operations: analyze, prepare, export, thermalBitmap, dispose. Input bytes or HTTP(S) URL. Selection coordinates are normalized visible-page points from top left, with zero-based page indexes. Results include a versioned manifest, validation report and autoPrintEligible. Errors are typed and sanitized. Defaults: 25 MiB input, 50 source pages, 16 MP per render; 203 DPI, JPG quality 98, monochrome threshold 128 without dithering. Multiple outputs use source-page and reading order. Unknown/unreadable or changed barcodes prevent automatic printing; manually accepted exports preserve warnings.

Verification: supplied landscape-letter/image-label layout, native labels, repeat conversion, letter/A4 and instructions, multiple labels/pages, rotations/crop-box/UserUnit transforms, scans, annotations, malformed/encrypted/oversized/cancelled input, source/output barcode preservation, reopened raster dimensions/metadata, independent PDF page parsing, Chromium/Firefox/WebKit harness, offline bundled assets. Physical phones and printer verification remain explicit external acceptance checks.
