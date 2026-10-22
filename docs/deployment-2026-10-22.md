# CropOtter deployment history — 2026-10-22

This is a chronological release record. The security release below is current. Earlier images and rollback targets predate security fixes; use them only for emergency recovery with the documented exposure understood.

## Initial process demonstration release (historical)

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

Global boxed-control focus correction: local image `sha256:5e7d033a15fb834ffbb3a6098772875b9fa92255a4c8ac59937c195dd6b520a5`, tag `cropotter:release-20261022-global-focus`, CSS `index-D7xNrZVd.css`, entry `index-0i3yuuQ1.js`. Rollback image `cropotter:before-global-focus-20261022`; same Compose rollback procedure. Fix extends inset outlines to boxed controls across the app, including the PDF-link form.

Live global-focus acceptance: **4/4 passed** across Chromium and iPhone WebKit emulation for PDF-link and download controls. The focused link field was visually checked on the live site; proof is `docs/images/link-focus.png`. Container healthy.

## Security release

Runtime image `sha256:d3b27a8e36d2010d66569917ea5f479684c32671e48beb05d3b35647ba9c9d58`, tag `cropotter:release-20261022-security`. Node 24.22.1 pinned by official base digest; client entry `index-Bpy53eAo.js`, engine browser chunk `browser-Ciazq4ox.js`. Container is healthy, nonroot/read-only, 512 MiB memory, one CPU, 128 processes; Docker reports OOMKilled=false and RestartCount=0 at verification time. Previous runtime preserved as `cropotter:before-security-20261022`.

Caddy now runs `/usr/local/bin/caddy-2.11.7-go1.26.10` via the original service account and the checked-in override. Binary SHA-256 `73c7e2d865ae4222ec23eceba00a8614b39c2f24326ff8226504d3c465986bc1`; official Caddy 2.11.7 source, Go 1.26.10, x/net 0.60.0. Reproducible build/scan inputs under `deploy/caddy-build`. HSTS/body/header/time bounds, explicit proxy identity overwrite and SNI/Host matching are active; Caddy 256 MiB / one CPU / 128 task limits verified. The old config is `/etc/caddy/Caddyfile.before-security-20261022`; proxy rollback requires reverting config/override and explicitly restarting, but would restore old security exposure and should only be an emergency measure. ACME certificates/state and DNS were preserved.

Host ca-certificates updated to 20260816ubuntu0.24.04.1. The user approved shared-host maintenance: 53 eligible upgrades installed, reboot completed onto kernel 6.8.0-147-generic, host Node 22.23.4 and cloudflared 2026.10.3 running. No failed units or pending reboot marker; 5 Ubuntu-phased updates remain deferred. All checked services and tunnel readiness recovered; post-reboot live acceptance passed 6/6. See [security report](security-review-2026-10-22.md) for scope, findings and final acceptance.
