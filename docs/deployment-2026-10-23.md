# Claude download app-shell release — 2026-10-23

Source implementation: `83398843325bfd899cc622fba1a955f3cd6a0756`, [PR #2](https://github.com/mrdewclau/cropotter/pull/2). Public target: https://cropotter.com/agents/#claude-desktop. Deployment and live acceptance completed on the existing DigitalOcean host.

The formatter footer and Help expose the public Claude Desktop installer. The agent screen is a responsive, viewport-fitting shell with Claude/other-agent tabs, fixed review status and on-demand installation, data-handling and advanced documentation dialogs. Seven default viewports and 200% desktop/phone text checks cover actual panel dimensions and visible download controls, alongside keyboard/focus and axe checks. Both views are included. Primary product conversion/geometry is unchanged.

| Check | Evidence |
| --- | --- |
| Local production build and web typecheck | Passed |
| Agent distribution unit tests | 3 passed |
| Isolated package/skill verification | Real synthetic PDF/PNG/ZIP, geometry, review gating, filenames and hashes passed |
| New browser acceptance | 10 passed across Chromium, Firefox, WebKit, iPhone and Android emulation |
| Independent review | Enlarged-text/short-landscape overflow reproduced, corrected and rechecked on actual built page; no important findings remain |
| Linux CI | [Run 39905410333](https://github.com/mrdewclau/cropotter/actions/runs/39905410333) passed all gates: three typechecks, engine 61, web 50, local 15, agent/extension tests, production build, package verification and 108 browser checks / 12 expected skips |

## Artifact and hosting

The Mac download links directly to the existing GitHub release artifact. It is unchanged: 122,334,239 bytes, SHA-256 `fcda3cd27798d0637358d420d21f0f99561518039846d05195be1338738cc3b1`. Requires macOS 13.5+, Apple Silicon or Intel. Runtime is bundled. Installer is unsigned and Anthropic directory review is pending; the screen and installation guide disclose this. No directory approval or warning bypass is claimed. This website release also refreshes the generated local package and skill from 0.1.0 to the already-tested 0.1.2 source.

The existing DigitalOcean host `fww-desk` at `138.197.81.94`, checkout `/opt/cropotter`, Compose project `cropotter` and loopback port `127.0.0.1:8080` are retained. No Caddy, cloudflared, firewall, DNS, host packages or unrelated services are changed. No new recurring service is added.

Previous image is retained as `cropotter:before-claude-download-20261023`; release alias is `cropotter:release-20261023-claude-download`. To roll back, tag the saved image as `cropotter:local` and run `docker compose -p cropotter -f deploy/compose.yaml up -d --no-build` from `/opt/cropotter`. Do not rebuild during image rollback.

## Live acceptance

HTTPS health returned `{"ok":true,"service":"cropotter"}`. HTTP and www redirect to the canonical HTTPS root with the agent path retained. Agent HTML returns `no-cache`; the existing CSP remains active. Every public manifest artifact matched its declared byte length/SHA-256. The real “Use in Claude” footer opened the live app shell; the Mac CTA downloaded the exact verified MCPB, with the size/hash above. Installation instructions were opened and reviewed.

Live browser checks passed **8/8** in Chromium and iPhone SE WebKit emulation: both agent views and keyboard/dialog/accessibility behavior, responsive/enlarged-text fit, actual synthetic PDF/PNG/ZIP conversions at 203/300 DPI and renamed files/archive entries. An additional local formatter viewport/Help/download subset passed **6/6**. Saved and visually reviewed live screenshots: `docs/images/claude-downloads.png` and `docs/images/claude-downloads-phone.png`. Phone tests are emulation, not physical-device acceptance.

Production image: `sha256:fb0b98ea04520e093daa21cc574684371d5fb05a2bee70f3fa094004d336c070`. Container healthy, user `node`, read-only, memory 512 MiB and PID limit 128, still bound only to loopback. Caddy PID 885 and cloudflared PID 1750 remained unchanged/active; no failed systemd units.

PR #2 merged as `cb9c8e2b2fa7f27bb0e4f544f6d30ac9d085e475`; its code tree matches the verified implementation. The merge skips a duplicate main-branch CI run because the complete pull-request run passed on this exact code/content tree. Subsequent release-record and screenshot changes are documentation only; they do not rebuild or change the deployed runtime.

## Official Claude artwork refinement

Source `844bc85` adds original press-kit artwork, preserved byte-for-byte with provenance under `/brand/anthropic/`. The shell uses the official Slate Claude wordmark and rounded app icon; all four downloaded SVGs remain original and serve with correct SVG MIME and hashes. CropOtter remains independent with pending directory status. Vendor marks are excluded from MIT; the asset README links upstream usage guidelines and makes no approval claim.

Focused verification: web typecheck, production build, agent tests 3/3 and existing five-project download screen checks 10/10 passed. Independent review confirmed no important findings. Live Chromium/iPhone WebKit checks passed 6/6, including app-shell geometry, accessibility/dialog behavior and actual synthetic PDF/PNG/ZIP outputs at both resolutions. Original-image hashes and live health passed. Desktop screenshot `docs/images/claude-downloads.png` updated; phone layout was visually reviewed locally and geometrically checked live. This is a cosmetic asset change, verified with relevant checks; no new full Linux CI run is claimed for it.

Current image: `sha256:808ec2c84c900d22393d0a9eee632dfe7f7d8ce363de278a768816ece58dc05e`, alias `cropotter:release-20261023-claude-brand`. Before-image alias: `cropotter:before-claude-brand-20261023`. The earlier download release and original rollback images remain retained. Use the same tag-and-Compose rollback procedure above with this before-image alias. The existing host, proxy, tunnel, DNS, port binding and resource limits are unchanged; container healthy and Caddy/cloudflared active with their previous PIDs. No new recurring service was added.
