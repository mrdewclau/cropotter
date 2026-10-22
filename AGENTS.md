# Working on CropOtter

Read `HANDOFF.md` before changing deployment or product scope. It records the accepted design, completed work, verification and remaining access gap. The user authorized public open-source publication, DigitalOcean hosting and GoDaddy domain configuration.

Use Node 24+. The shared engine is in `packages/engine`; the customer website and bounded link service are in `apps/web`. Run the relevant typechecks/tests and production build for implementation changes. `docs/website-verification.md` describes browser acceptance.

Preserve portrait 4 × 6 inch labels, proportions, at least ⅛ inch of white margin on every side, barcode content, explicit page decisions and deliberate manual-crop review. Keep branding off shipping-label output. Use synthetic files and data in public examples, tests and screenshots.

The approved identity is direction 04, The Mailroom Stamp. Assets, tokens and usage guidance are under `brand/`. Product controls must work without Three.js or motion.

Production belongs on DigitalOcean and cropotter.com uses GoDaddy DNS. Inspect the actual account/host/records before changes, preserve unrelated services and DNS, and verify health, HTTPS and real live conversion. Do not substitute Sites hosting. Keep secrets, customer PDFs and signed customer URLs out of source and logs. Update `HANDOFF.md` and verification notes when deployment status changes.
