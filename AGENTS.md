# Working on CropOtter

Read `HANDOFF.md` before changing deployment or product scope. It records the accepted design, completed work, verification and remaining access gap. The user authorized public open-source publication, DigitalOcean hosting and GoDaddy domain configuration.

Use Node 24+. The shared engine is in `packages/engine`; the customer website and bounded link service are in `apps/web`. Run the relevant typechecks/tests and production build for implementation changes. `docs/website-verification.md` describes browser acceptance.

Preserve portrait 4 × 6 inch labels, proportions, at least ⅛ inch of white margin on every side, barcode content, explicit page decisions and deliberate manual-crop review. Keep branding off shipping-label output. Use synthetic files and data in public examples, tests and screenshots.

The approved identity is direction 04, The Mailroom Stamp. Assets, tokens and usage guidance are under `brand/`. Product controls must work without Three.js or motion.

The user requires viewport-fitting app shells for all designs. CropOtter is one tool, not a scrolling landing page. Keep navigation, upload/review and essential actions within the available screen; scale previews and adapt layout for phone and short landscape. Only bounded supporting panes may scroll. Help/privacy belong on demand. Preserve the approved split upload area with the drop zone on the left and a contained Three.js/typography explanation on the right, adapting within the same viewport on narrow screens. Verify document dimensions, visible controls, panel overlap and crop proportions rather than merely hiding overflow.

Production belongs on DigitalOcean and cropotter.com uses GoDaddy DNS. Inspect the actual account/host/records before changes, preserve unrelated services and DNS, and verify health, HTTPS and real live conversion. Do not substitute Sites hosting. Keep secrets, customer PDFs and signed customer URLs out of source and logs. Update `HANDOFF.md` and verification notes when deployment status changes.

The process demonstration must explain full-page PDF → crop → finished label, with readable paper, contrast and synchronized copy. Preserve Pause/Play and static fallback. Do not replace it with a decorative floating stamp. Geometry checks and visual acceptance are separate; review actual live screenshots.

Official third-party brand SVGs under `apps/web/public/brand/anthropic/` must remain byte-for-byte unchanged; preserve provenance hashes and exclude these vendor marks from formatting/optimization and the repository MIT grant. Use them only to identify compatibility, without implying endorsement or directory approval. See the asset README and upstream guidelines.
