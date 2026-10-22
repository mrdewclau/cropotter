# CropOtter production deployment

Deployment date: **2026-10-21, America/New_York** (verification continued at `2026-10-22T03:07Z` UTC). Public website: **https://cropotter.com**.

## Production target

| Item | Verified value |
| --- | --- |
| Provider | DigitalOcean, existing Droplet |
| Droplet | `597065633`, `fww-desk`, NYC3, Ubuntu 24.04, 8 GB RAM |
| Public IPv4 | `138.197.81.94` |
| Checkout | `/opt/cropotter` |
| Container | Compose project `cropotter`, service `app`, container `cropotter-app-1` |
| Runtime | Node 24, non-root, read-only filesystem, capabilities dropped |
| Binding | `127.0.0.1:8080`; not a public application port |
| HTTPS | Caddy, valid Let's Encrypt certificates for root and www |
| Proxy config | `/etc/caddy/Caddyfile` |
| Image tag | `cropotter:release-20261021-app-shell` |
| Local image identity | `sha256:c69e6a6963f884c00ba8b80edb420873317b3854a58f5c481b3b08a90dbec0b6` |
| Additional paid resources | None; no new Droplet, App Platform subscription, database or storage |

The image identity is from the host's local Docker image store, not a published registry release. Source is based on initial repository commit `75f2cc2f7af72057ba91138f249f68a02d511792`, plus the app-shell/deployment commit containing this record. The deployed client uses CSS `index-BZ4JiMbR.css` and entry `index-BkuVCOGI.js`, matching the locally verified production build.

Docker and Caddy were installed from Ubuntu packages. UFW retained SSH and added only TCP 80/443. Existing Betty, Cloudflare tunnel, Dear Reggi, Digi-Darlington, FWW staff/member, memorial and Reggi services remained active. The two unrelated App Platform applications were not changed.

## GoDaddy DNS

| Record | Before | After |
| --- | --- | --- |
| A `@`, TTL 600 | Parked (`3.33.130.190`, `15.197.148.33` in public answers) | `138.197.81.94` |
| CNAME `www`, TTL 1 hour | `cropotter.com.` | Unchanged |
| NS `@` | `ns29.domaincontrol.com.`, `ns30.domaincontrol.com.` | Unchanged |
| CNAME `_domainconnect` | `_domainconnect.gd.domaincontrol.com.` | Unchanged |
| SOA | GoDaddy, ns29 primary | Unchanged |
| TXT `_dmarc` | `v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;` | Unchanged |

All seven GoDaddy records were inspected before the edit. Only the root A record changed, after GoDaddy identity verification. Nameservers were not moved. No MX, AAAA or CAA records were present. Both public recursive resolvers and authoritative GoDaddy answers resolved to the Droplet after propagation.

## Acceptance

The final local production build passed **21 browser checks with 3 expected skips** in desktop Chromium and iPhone SE WebKit emulation. Skips are the absent private PDF in both projects and the desktop-only enlarged-text sweep in the phone project. Checks include ten viewport sizes from 320×480 to 2560×1440, short landscape, visible essential controls, guide-content fit, crop canvas proportions, actual changing Three.js frames, help/privacy/focus, accessibility, link errors/cancellation/retry, multi-page files and real downloads. Both typechecks passed; engine tests passed 52/52 and website unit/service tests 39/39.

HTTPS `/healthz` returned `{"ok":true,"service":"cropotter"}`. HTTP redirects to HTTPS; HTTPS www redirects to the canonical root and preserves path/query. The production PDF-link proxy successfully fetched the public synthetic sample PDF. Live-domain browser acceptance repeats the viewport/crop checks, animation, help/privacy and actual sample PDF/PNG/ZIP downloads in Chromium and iPhone WebKit. PDF output is 288×432 points (4×6 inches), PNG is 812×1218 at 203 DPI and 1200×1800 at 300 DPI; ZIP contains the PDF and PNG. Current screenshots under `docs/images` were captured from the live domain with synthetic data.

The npm audit endpoint timed out independently of successful package downloads. Docker installation now uses `npm ci --no-audit`; no fresh clean-audit claim is made. The earlier clean audit remains historical. Physical-device sharing, touch dragging/resizing and physical printer/barcode scanning are still outstanding; emulation is not physical-device acceptance.

## Rollback and future releases

The initial deployed image is retained as `cropotter:release-20261021`; the app-shell image has its own tag above. To roll back the container, tag the chosen retained image as `cropotter:local`, then run `docker compose -p cropotter -f deploy/compose.yaml up -d --no-build --force-recreate` from `/opt/cropotter` and check health. Keep retained images until the replacement is accepted.

Caddy's pre-install default is saved at `/etc/caddy/Caddyfile.before-cropotter`. Restore only if retiring this service, and preserve any later proxy additions. DNS rollback is the GoDaddy root A record's Parked value with TTL 600; leave all other records intact.

Future updates are manual: update the reviewed source on the host, build with Compose, switch the container, then verify health, root/www TLS and live conversion/downloads. GitHub pushes do not automatically deploy this Droplet.
