# CropOtter website

The user approved the CropOtter identity, selected direction 04 (the mailroom stamp), and requested the working first website, responsive from small phones to desktop, with Three.js detail. Deployment must use the user's DigitalOcean account and cropotter.com through GoDaddy. Do not substitute Sites hosting or change unrelated DNS records. Existing shipping-label engine behavior is the conversion contract.

## Experience

A single, responsive React page offers PDF upload/drop and a direct HTTPS PDF link. A real sample can be tried without supplying a file. Show actual processing stages and cancellation. Display the converted 4 × 6 label, page navigation, PDF download, PNG at 203/300 DPI, and a ZIP containing both formats. Review warnings require explicit acknowledgement before download. When detection is uncertain, or the user requests a change, offer a visual crop editor with touch/pointer and keyboard controls, output rotation, page navigation, multiple regions, and explicit page skipping. No page disappears silently.

Preserve a minimum 1/8 inch white margin on every side through the existing engine. Never put decorative branding on the exported shipping label. No accounts, cloud queues, printer connection, extension, or desktop/mobile native shell in this release.

## Identity and responsiveness

Use the approved indigo #243A79, warm paper #F6F1E7, orange #D85C32, kraft #CDB693, carbon #23262E, stamp/crop corners, Barlow Condensed Bold, DM Sans, and IBM Plex Mono. Use a darker orange for small text when needed for contrast. Design fluidly for 320–2560 CSS pixels, portrait/landscape, safe areas, and browser zoom. No horizontal page overflow. Interactive targets are at least 44 × 44 CSS pixels. Inputs use at least 16 px text on phones. Support keyboard focus, labels, status announcements, visible errors and reduced motion.

Three.js supplies a small tactile stack of labels, local to a decorative hero. Lazy load it, cap device pixel ratio, render on demand, respond gently to pointer position, and release GPU resources. A static SVG/HTML composition remains available when reduced motion, WebGL, or loading prevents enhancement. Conversion never depends on 3D.

## Architecture

Keep the shared engine in packages/engine unchanged unless a verified defect requires a fix. Add apps/web: Vite + React + TypeScript client; local, versioned PDF worker/fonts/CMaps/ZXing WASM; a small Node 24 server with health/static endpoints and a bounded HTTPS PDF fetch endpoint. Compile the Node service to a standalone ES module; use a multi-stage Dockerfile and DigitalOcean deployment configuration. The existing repository is the source of truth; work on isolated feat/website worktree.

File uploads and formatting remain in the browser. Pasted URLs go to the same-origin server, which fetches the PDF transiently and returns bytes without storing them. Protect requests with HTTPS-only standard-port URLs, no credentials, public-address checks on every DNS answer, pinned DNS per connection, manual bounded redirects, byte/time/concurrency/rate limits, PDF magic validation, no incoming cookie/auth forwarding, no-store responses, and no URL/body/address logging. Static requests cannot traverse outside the built client directory. Readiness checks disclose no customer data.

## Acceptance

Tests must exercise real engine conversion and download contents; review/crop; cancel/retry; multi-label export; 203/300 DPI; paste-link success/error; malformed/oversized inputs; unsafe URLs/redirects/DNS; no-WebGL and reduced motion; responsive layouts and accessibility in Chromium, Firefox and WebKit, with phone/touch coverage. Test the privately supplied label locally without including it in source, public assets or screenshots committed to Git. Verify a production build and HTTP service. Do not claim physical-device coverage or live deployment without evidence.

Deployment and DNS are already authorized. Existing services, MX/TXT records and unrelated domains must be preserved. DigitalOcean and GoDaddy access are not currently exposed; the user is connecting access while implementation continues. A missing account connection blocks deployment, not building or testing.
