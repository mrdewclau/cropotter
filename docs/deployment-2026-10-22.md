# CropOtter process demonstration deployment — 2026-10-22

Deployed to https://cropotter.com on existing DigitalOcean Droplet 597065633 (`fww-desk`, 138.197.81.94), checkout `/opt/cropotter`, Docker Compose project `cropotter`. No DNS, firewall, proxy or unrelated-service changes were made. Original domain and infrastructure details remain in [the initial deployment record](deployment-2026-10-21.md).

Container `cropotter-app-1` is healthy. Local Docker image ID: `sha256:6dbcd7a83fe564e52e4a89100d07fa063f8fba6c81db48499c2c05a35758a279`, tagged `cropotter:release-20261022-process`. This is a local image identity, not a published registry digest. Production CSS is `index-GBTx_lc7.css`; entry `index-BvdJqELS.js`; Three.js scene `scene-BXCqoTF6.js`.

The revision replaces the floating stamp with a PDF → crop → 4 × 6 process demonstration, aligned intake panels, Pause/Play and a fitted static fallback. Website tests 39/39, typecheck and production build passed; the final local production browser suite passed 21 with 3 expected skips. See [verification](website-verification.md) for current live acceptance.

Rollback image is preserved as `cropotter:before-process-20261022` (previous image `sha256:c69e6a6963f884c00ba8b80edb420873317b3854a58f5c481b3b08a90dbec0b6`). Retag that image to `cropotter:local`, then run `docker compose -p cropotter -f deploy/compose.yaml up -d --no-build` from `/opt/cropotter` and verify `/healthz`. No DNS rollback is needed for this revision.

Live HTTPS acceptance passed **8/8** checks across Chromium and iPhone SE WebKit emulation: viewport/control fit, process phases and pause/resume, actual PDF/PNG/ZIP downloads and reduced-motion/no-WebGL conversion.

## Editable filename release

Filename controls apply to PDF/PNG/ZIP, archive entries and shared PDFs. Local Docker image ID: `sha256:1b7c9f785e75e4a7f8959d1e2d715a5b9d90df9ccc48768acd55f30dc5db59bf`; release tag `cropotter:release-20261022-filenames`. Client entry `index-DUGWRYIH.js`, CSS `index-B4b1gbX4.css`. Rollback image: `cropotter:before-filenames-20261022` (the previous process-demonstration release). Use the same retag/Compose/health procedure above. DNS, proxy and unrelated applications are unchanged.

Final filename-release production-build browser acceptance: **23 passed, 3 expected skips** across Chromium and iPhone SE WebKit emulation. Live HTTPS filename/download/archive acceptance: **2/2 passed**. Container health verified after deployment. Updated result screenshots show the live File name control.

Focus-ring correction release: local image `sha256:3739bfe4d823613c4025bfa882e2341087fe372eaec83d994394e9693fa54d04`, tag `cropotter:release-20261022-filenames-focus`; CSS `index-D5XzLwCa.css`, entry `index-DEUZR5xV.js`. Local focused regression and accessibility checks passed 4/4. The correction only insets download-panel focus outlines.

Final dropdown-spacing release: local image `sha256:38ff7930d23972ed061e49039f1c3effa9dd6585a5349235993ff8f695550739`, tag `cropotter:release-20261022-filenames-spacing`; CSS `index-DkazY_tS.css`, entry `index-CQrqoAFq.js`. It reserves text/arrow spacing consistently across desktop and phone. Local focused checks passed 2/2.

Final live dropdown-spacing and focus regression: **2/2 passed**, desktop Chromium and iPhone WebKit emulation; live screenshots visually checked. Container healthy.

## Social preview and upload-centering release

Local image `sha256:26939031cb058f35f96b1b8af424462cf006e624cef9cfca9f09bfe9d2862e69`, tag `cropotter:release-20261022-social`. Client CSS `index-BQvLTEBB.css`, entry `index-DMihfW6m.js`. Static share image and downloadable MP4 are under `/share/`, referenced in initial HTML metadata. The service supplies MP4 MIME and byte ranges. Upload badge glyph is centered. Rollback image: `cropotter:before-social-20261022`; use the same retag/Compose procedure. DNS/proxy/unrelated services remain unchanged.

Live HTTPS preview/centering acceptance: **3 passed, 1 expected compact-phone badge skip**. Direct public MP4 playback was visually checked in the in-app browser. Container health verified. This is not an actual iMessage share test.
