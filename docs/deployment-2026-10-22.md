# CropOtter process demonstration deployment — 2026-10-22

Deployed to https://cropotter.com on existing DigitalOcean Droplet 597065633 (`fww-desk`, 138.197.81.94), checkout `/opt/cropotter`, Docker Compose project `cropotter`. No DNS, firewall, proxy or unrelated-service changes were made. Original domain and infrastructure details remain in [the initial deployment record](deployment-2026-10-21.md).

Container `cropotter-app-1` is healthy. Local Docker image ID: `sha256:6dbcd7a83fe564e52e4a89100d07fa063f8fba6c81db48499c2c05a35758a279`, tagged `cropotter:release-20261022-process`. This is a local image identity, not a published registry digest. Production CSS is `index-GBTx_lc7.css`; entry `index-BvdJqELS.js`; Three.js scene `scene-BXCqoTF6.js`.

The revision replaces the floating stamp with a PDF → crop → 4 × 6 process demonstration, aligned intake panels, Pause/Play and a fitted static fallback. Website tests 39/39, typecheck and production build passed; the final local production browser suite passed 21 with 3 expected skips. See [verification](website-verification.md) for current live acceptance.

Rollback image is preserved as `cropotter:before-process-20261022` (previous image `sha256:c69e6a6963f884c00ba8b80edb420873317b3854a58f5c481b3b08a90dbec0b6`). Retag that image to `cropotter:local`, then run `docker compose -p cropotter -f deploy/compose.yaml up -d --no-build` from `/opt/cropotter` and verify `/healthz`. No DNS rollback is needed for this revision.

Live HTTPS acceptance passed **8/8** checks across Chromium and iPhone SE WebKit emulation: viewport/control fit, process phases and pause/resume, actual PDF/PNG/ZIP downloads and reduced-motion/no-WebGL conversion.
