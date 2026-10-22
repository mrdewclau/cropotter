# DigitalOcean deployment

This release runs as a standalone Node 24 service in a non-root Docker container. It exposes port 8080 and `GET /healthz`. It needs no database, persistent volume, API key, or runtime npm installation. Files and direct-link PDFs are transient. Configure any upstream access logging to omit request bodies; signed input links are sent in POST JSON, never a request URL.

## Current access status

No DigitalOcean account, SSH identity, or signed-in GoDaddy browser was accessible from the build session. No deployment or DNS change has been made. Public DNS on 2026-10-22 used GoDaddy nameservers `ns29.domaincontrol.com` and `ns30.domaincontrol.com`. A real deployment target must be verified before editing A/CNAME records.

## Existing DigitalOcean host

Inspect the connected account and intended host first: existing applications, reverse proxies, exposed ports, firewall, DNS records, and available resources. Preserve unrelated services and records. The supplied configuration assumes a host with Docker Compose and Caddy; adapt it to existing infrastructure instead of replacing another application's proxy.

From the checked-out release root:

```sh
docker compose -f deploy/compose.yaml build
docker compose -f deploy/compose.yaml up -d
curl --fail http://127.0.0.1:8080/healthz
```

The container is bound to loopback, read-only, drops capabilities, and has a 40-second shutdown grace period. Caddy should proxy `cropotter.com` to `127.0.0.1:8080` and redirect `www.cropotter.com` to the root domain; see [Caddyfile](Caddyfile). Validate and reload the installed proxy configuration using the host's normal procedure. Open HTTP/HTTPS ports only as required by that host. Do not expose port 8080 publicly.

For DigitalOcean App Platform, use the root Dockerfile, HTTP port 8080 and `/healthz` readiness. Add cropotter.com and www.cropotter.com to that app, then use the exact DNS targets DigitalOcean supplies. No Spaces bucket or managed database is needed.

## GoDaddy DNS and release verification

Record existing DNS before changing it. For a Droplet, set the root A record to the verified public IPv4 and www to the root domain; only add AAAA when the host actually serves IPv6. For App Platform, use its supplied domain instructions. Preserve MX, TXT, CAA and unrelated records. Never change nameservers just to publish this site.

Verify root and www resolution, valid HTTPS, canonical redirect, `/healthz`, local engine assets and an actual synthetic label conversion/download at the live URL. Check PDF page size (4 × 6 inches), PNG dimensions, and ZIP contents. Re-run phone/Safari checks against that URL. Record the deployed image digest, host/app identifier and verification time without credentials or signed customer links.

Keep the previous release/image available for rollback. Repoint the service to that image and check health before deleting any old image. DNS rollback uses the captured original records.

## Building behind a managed TLS proxy

The Docker build optionally accepts a BuildKit CA secret named `build_ca`. Use it only when the build environment provides a trusted CA file. The CA is mounted for `npm ci` and is not copied into the runtime image. Standard DigitalOcean builds do not need this option. Do not disable TLS validation.
