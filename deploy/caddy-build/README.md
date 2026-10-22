# Caddy 2.11.7 security rebuild

Linux amd64 static binary: `caddy-linux-amd64`.

| Property | Verified value |
|---|---|
| Caddy module | v2.11.7; official tag commit 72dd0fb067f6d7826c7f79907670ba4a713bfe37 |
| Compiler | Go 1.26.10 |
| HTTP/2 dependency | golang.org/x/net v0.60.0 |
| Module authentication | proxy.golang.org with sum.golang.org; go mod verify passed |
| Entrypoint | Exact official v2.11.7 cmd/caddy/main.go, including time/tzdata and all standard modules |
| Linux binary SHA-256 | 73c7e2d865ae4222ec23eceba00a8614b39c2f24326ff8226504d3c465986bc1 |
| Reproduction | Two local builds produced identical binary bytes |
| Equivalent native runtime | Version v2.11.7; all 135 standard modules present |
| Current Caddyfile syntax | Equivalent native build adapts deploy/Caddyfile successfully; formatting warning only |

Run `./build.sh` to reproduce the Linux binary from the locked modules. Run `./verify.sh` to install pinned govulncheck v1.9.0 locally and repeat scans. The scripts do not deploy or alter host services. A compatible bootstrap Go command with automatic toolchain download is required; Go verifies downloaded modules/toolchains through the public checksum database.

## Vulnerability results and limit

| Check | Result |
|---|---|
| Original official archive | 14 findings; built with Go 1.26.8 and x/net v0.59.0 |
| Rebuilt Linux binary scan | 1 finding, GO-2026-5932, exit 3 |
| Linux source call-graph scan | 0 reachable findings; 0 imported-package findings; 1 required-module finding, exit 0 |
| Linux dependency package list | No golang.org/x/crypto/openpgp package or subpackage is imported |

GO-2026-5932 covers unmaintained OpenPGP packages within golang.org/x/crypto and has no fixed version. Caddy still needs other x/crypto packages. The binary scanner reports broad OpenPGP wildcard symbols against that module, while source analysis places it exclusively at required-module level. This package is not represented as a zero-advisory binary; retain the finding and its reachability evidence. Reducing standard modules is unnecessary for this finding because the complete standard build does not import OpenPGP.

Go 1.26.10 includes the compromised-intermediate denylist in crypto/x509. Go 1.26.9 fixes the newly reported standard-library HTTP/TLS/template issues; x/net v0.60.0 fixes the corresponding external HTTP/2 findings. The rebuilt scans show those 13 original findings removed. Native smoke checks do not replace staging the Linux binary, checking its checksum/version/modules, validating the actual installed Caddyfile, and verifying live HTTPS after deployment.

`build-manifest.json` and `SHA256SUMS` record the verified build. The build/verification scripts regenerate module manifests, build info, source/binary scanner output and imported-package evidence. Original detailed results and the identical second binary are retained locally under `.private/security-20261022/caddy-rebuild/`; generated binaries and tool caches are not committed. Linux staging, checksum and installed-config validation were completed before the live Caddy service was switched to this build. The systemd override is `deploy/caddy-systemd-override.conf`.


## Primary sources

- https://github.com/caddyserver/caddy/tree/v2.11.7
- https://pkg.go.dev/vuln/GO-2026-6809
- https://pkg.go.dev/vuln/GO-2026-6617
- https://pkg.go.dev/vuln/GO-2026-5932
- https://go.dev/doc/devel/release#go1.26.10
