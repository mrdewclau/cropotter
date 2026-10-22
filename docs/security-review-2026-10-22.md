# CropOtter security review — 2026-10-22

## Promotion decision

The application findings below have been corrected and deployed. The user subsequently approved shared-host maintenance: all 53 eligible package upgrades were installed and the server rebooted onto the newer kernel. No blocking issue remains within this review's scope; promotion is reasonable with the residual limits below. This is a bounded defensive code/deployment assessment, not a certification, exhaustive exploit search, or proof of absence of vulnerabilities.

## Scope and method

Reviewed application code, PDF engine, runtime dependencies and build pipeline; inspected the running Docker service, Caddy, firewall, listening sockets, certificate chain and host package state. Live probes were sequential and bounded: hostile URL inputs, traversal/config paths, origin/body checks, TLS and headers. Resource-exhaustion reproductions ran locally with synthetic data. No customer PDFs, credentials or signed URLs were submitted to third-party scanners. No broad port scan or live stress test was run; unrelated services were inspected only enough to establish shared-host boundaries.

## Findings and corrections

| Priority | Finding | Evidence and correction |
|---|---|---|
| P2 privacy | Cropping retained invisible original PDF data | A synthetic output retained recoverable text outside its visible crop. All PDF exports now render only selected visible label pixels at 300 DPI into a fresh document. Source objects, skipped-page content, hidden attachments/actions and canonical passthrough are excluded. Regression also covers forged/recomputed canonical input. Searchable/editable vector text is intentionally no longer retained. |
| P2 availability | Structural PDF streams inflated before the decode limit | A 1,601-byte synthetic PDF expanded to 1 MiB despite an 8 KiB test budget. ObjStm/XRef parsing now uses per-document bounded decoding, object/depth limits and fail-closed forward stream types. Normal compressed structures remain supported. Predictor/non-Flate structures may require exporting a fresh PDF. This is not a hard browser-process memory sandbox. |
| P2 infrastructure | Reverse proxy and bundled Go libraries were old | Caddy 2.6.2 was built with Go 1.22.2. Even the current official 2.11.7 archive contained 13 recently fixed Go/HTTP findings plus an OpenPGP module notice. Rebuilt official Caddy 2.11.7 with Go 1.26.10/x/net 0.60.0 from locked, checksum-authenticated modules. Two builds are byte-identical. Source scan reports 0 reachable and 0 imported-package findings. Binary scan retains 1 broad OpenPGP module advisory; source dependency analysis does not import OpenPGP. Full evidence caveat/build inputs are under `deploy/caddy-build`. |
| P2 infrastructure | Host CA store missed the eMudhra distrust update | Updated only ca-certificates from 20260601~24.04.1 to 20260816ubuntu0.24.04.1, matching Canonical's security fix. The site's own cert is Let's Encrypt YE1, valid 2026-10-22 through 2027-01-20, not a GoDaddy/eMudhra chain. |
| P2 availability | CropOtter had no container memory/CPU/process ceiling | Added 512 MiB / one CPU / 128 processes with 256 MiB JS heap; retained nonroot, read-only filesystem, no-new-privileges, dropped capabilities and loopback-only port. Caddy also has 256 MiB / one CPU / 128 task ceilings. |
| P2 availability | Global fetch quota provided no client fairness | Added 6-request burst/one refill per 6 seconds and 2 active fetches per client, alongside the 4 global active slots and existing byte/time/delivery bounds. Trusted client identity is enabled only behind the loopback listener and Caddy overwrites the header. State is bounded to 4,096 entries; this is not a distributed-DoS service. |
| P3 availability | Already-cancelled async fetch could leave an unhandled rejection | A child-process regression reproduced unhandled resolver rejection; promise rejection is now observed even if cancellation already won. No remote crash path was demonstrated. |
| P3 build | Development esbuild 0.27.4 advisory | Updated to exact 0.28.2; fresh full and production npm audits both report 0 known advisories. Server never used esbuild's development server. |
| Hardening | Proxy transport and release controls | Added HSTS, strict SNI/Host matching, request/header/time bounds and an explicit trusted client-IP header. HTTP/3 is disabled because UDP 443 was not opened; HTTP/1.1 and HTTP/2 remain. Node 24.22.1 image is pinned by official digest, CI Actions pinned by verified revisions, credentials are not persisted, and build instructions use `--pull`. |

## Recent news applicability

| Topic | Verified applicability |
|---|---|
| PHP critical RCEs CVE-2026-109618/109619 | CropOtter serves through Caddy and Node, with no PHP handler/process/package found in its request path. No PHP exploit payload was needed or sent. |
| Node October 21 fixes | Running app Node 24.22.1 includes the published TLS hostname, DNS, Brotli, CA and dependency updates. Dockerfile now enforces this version/digest. |
| GoDaddy certificate revocations | Registrar/DNS is GoDaddy, but the live TLS issuer is Let's Encrypt. Root/www chains validate; certificate and domain registration are separate. |
| eMudhra intermediate compromise | App Node roots already include the release fix; host CA package was updated and the proxy rebuilt against Go 1.26.10's distrust fix. |

Primary advisories: [PHP](https://www.php.net/archive/2026.php#2026-10-21-5), [Node](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases), [Canonical CA update](https://ubuntu.com/blog/emudhra-ca-compromise-fixes-available), [GoDaddy](https://www.godaddy.com/help/what-is-the-cpcps-certificate-profile-bug-43095), [Go trust fix](https://pkg.go.dev/vuln/GO-2026-6809).

## Checks and practical limits

Before corrections, 22 bounded live path/URL/body probes rejected attempted config exposure, traversal, private/metadata/obfuscated loopback fetching, credentialed/nonHTTPS/nonstandard-port URLs, foreign-origin calls and oversized input. Local tests cover redirect-to-private, mixed public/private DNS answers, DNS pinning, streamed size limits, timeouts, cancellation, held response slots and forged client headers. TLS 1.2 and 1.3 negotiated for root/www; TLS 1.1 did not. A direct runtime request rejected a self-signed certificate; two other invalid-certificate test hosts reset connections, so those two were inconclusive rather than certificate-validation passes. The current CSP denies JavaScript eval/objects/framing and confines workers/fonts/media/connections; inline style remains allowed for rendering.

Engine 61/61 and service/website 43/43 tests passed. Typechecks and production build passed. Engine Chromium pipeline 3/3 passed. Regressions were observed failing before the privacy, structure-budget, rate and abort fixes. PDF.js 6.4.299 worker/WASM and ZXing 3.1.6 binary provenance were checked against official package/tag bytes; npm audit does not independently audit all native decoder internals. Tracked-file credential-pattern scan found no matches; this is not a full secret-history audit.

Residual limitations: no volumetric DDoS test/protection, no formal sandbox proof for hostile PDFs, no complete audit of unrelated shared-host apps or registrar/cloud account settings, and no physical printer/phone acceptance. Exact IPv6 identities and a 4,096-client map impose capacity limits under distributed clients. Upgrading pdf-lib 1.17.1 requires reviewing its isolated bounded-parser adapter. Keep browser/runtime/dependency updates current; add a defined maintenance/update routine before relying on long-term safety.

## Shared-host maintenance completed with approval

After explicit user approval, all 53 eligible package upgrades were installed, including host Node 22.23.4 and cloudflared 2026.10.3. The host rebooted from kernel 6.8.0-124-generic onto 6.8.0-147-generic; boot IDs changed and the reboot-required marker cleared. Package configuration audit is clean. Apt reports no eligible upgrades, with five Ubuntu-phased updates still deferred (GLib packages and tmux); their rollout policy was preserved.

All 11 checked service units are active, no systemd units failed, and all eight previous app HTTP listeners respond. These are startup/readiness checks rather than complete acceptance of the other products. Cloudflare readiness is 200 with four tunnel connections. CropOtter retains its audited image and is healthy; Docker reports OOMKilled=false and RestartCount=0 at verification time. Caddy resource ceilings and the SSH-only/HTTP/HTTPS firewall policy survived reboot. Service/package/listener snapshots and a configuration archive remain root-only under `/var/backups/cropotter-security-20261022/`.

## Final acceptance

The final local production-build matrix passed **76 checks with 9 expected skips** across Chromium, Firefox, desktop WebKit, iPhone SE WebKit and Pixel 7 Chromium emulation. Skips cover the absent private customer fixture, mobile-only width sweeps and the deliberately hidden compact upload badge. Initial test setup lacked the pinned Firefox binary and used macOS Safari's plain-Tab shortcut for links; the browser was installed and the test now uses documented Option-Tab on macOS WebKit. The clean final matrix passed.

Live HTTPS conversion/crop/PDF/PNG/ZIP/name checks passed **6/6** in Chromium and iPhone WebKit emulation. Seventeen follow-up live probes passed: six config/traversal paths denied, six private-URL attempts denied, two forged-identity quota bypass attempts rate-limited, Host/SNI mismatch (421), oversized body (413) and canonical www redirect with HSTS. A valid native PDF-link fetch succeeded. Container is healthy, nonroot and read-only, with 512 MiB / one CPU / 128 PID limits; Docker reports OOMKilled=false and RestartCount=0 at verification time. Caddy's patched binary identity and 256 MiB / one CPU / 128 task limits were verified. Unrelated listening-service PIDs remained unchanged during the app-only rollout, before the separately approved host updates and reboot.

Post-reboot live HTTPS conversion, cropping, filename editing and PDF/PNG/ZIP download acceptance passed **6/6** again in Chromium and iPhone WebKit emulation.

The first GitHub Linux run on `8be8736` passed 73 browser checks, skipped 9 and failed 3 platform assumptions: unavailable headless Firefox WebGL and Linux WebKit's space-to-underscore suggested filenames. The test now independently checks WebGL capability and verifies the static fallback when unavailable. Download tests assert the exact app-provided filename and archive entries, while allowing the observed Linux WebKit suggestion policy. The full [GitHub Linux rerun on 228cede](https://github.com/mrdewclau/cropotter/actions/runs/39729122065) passed: **76 browser checks, 9 expected skips**, plus the engine/service tests, both typechecks and production build. The six targeted platform regressions also passed locally. These final changes affect tests and documentation; the audited live runtime image is unchanged.
