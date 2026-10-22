<p align="center">
  <img src="brand/repo-cover.svg" alt="CropOtter — Your labels. Ready to go." width="1200" />
</p>

<p align="center">
  <a href="https://github.com/mrdewclau/cropotter/actions/workflows/ci.yml"><img src="https://github.com/mrdewclau/cropotter/actions/workflows/ci.yml/badge.svg" alt="Verify CropOtter" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-243A79?style=flat-square" alt="MIT license" /></a>
  <img src="https://img.shields.io/badge/Node-24%2B-243A79?style=flat-square" alt="Node 24 or newer" />
  <img src="https://img.shields.io/badge/output-4%20%C3%97%206-D85C32?style=flat-square" alt="4 by 6 inch output" />
</p>

<p align="center">
  <strong>A proper little fit for your shipping labels.</strong><br />
  Drop in a PDF or paste its link. Give it a clean cut. Download a ready-to-print PDF or PNG.
</p>

<p align="center">
  <a href="#run-locally">Run locally</a> · <a href="HANDOFF.md">Pick up the work</a> · <a href="brand/README.md">Brand system</a> · <a href="deploy/README.md">Deploy</a> · <a href="docs/roadmap.md">Roadmap</a>
</p>

---

CropOtter turns oversized or awkward shipping-label PDFs into portrait **4 × 6 inch labels with at least ⅛ inch of white space on every side**. It preserves proportions, keeps vector text where possible, and asks for review when a crop is uncertain.

The first website release is implemented and tested. **Production deployment to DigitalOcean and cropotter.com is still pending.** Start with [HANDOFF.md](HANDOFF.md) to continue locally.

<table>
  <tr>
    <td width="73%"><img src="docs/images/desktop.png" alt="CropOtter desktop website with PDF upload and link input" /></td>
    <td width="27%"><img src="docs/images/phone.png" alt="CropOtter small-phone layout" /></td>
  </tr>
</table>

## A clean cut, start to finish

- **Send it over.** Upload a PDF, drag and drop it, paste a public HTTPS PDF link, or try the included sample.
- **Fine-tune the fit.** Automatic label detection, real PDF previews, crop movement/resizing, multiple regions, page skipping and rotation. Uncertain output stays behind a review acknowledgement.
- **Take it away.** Download the combined PDF, individual PNGs at 203 or 300 DPI, or a ZIP with the PDF and every label image.
- **Use your screen.** Fluid phone, tablet and desktop layouts, keyboard controls, touch controls, accessible crop sliders, and reduced-motion support.
- **Keep it simple.** Uploaded files are processed in the browser. Direct links pass through a bounded server fetch. No accounts, database, label history or analytics.

The Three.js label stack is a small decorative enhancement, with static artwork when graphics or motion are unavailable. Fonts, PDF workers and decoding assets are served locally. Exported shipping labels contain no CropOtter branding.

## Run locally

Install **Node 24 or newer**, then:

```sh
git clone https://github.com/mrdewclau/cropotter.git
cd cropotter
npm ci
npm run dev:web
```

Open **http://127.0.0.1:4174**. Upload your own label or choose **Try a sample label**. The sample uses fictional recipient data.

For the production service:

```sh
npm run build:web
npm run start:web
```

The default port is **8080**; override it with the `PORT` environment variable. `/healthz` reports readiness. See [deployment instructions](deploy/README.md) for Docker, DigitalOcean and GoDaddy DNS.

## Under the paper

| Part          | Location                                       | Job                                                                        |
| ------------- | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Website       | [`apps/web`](apps/web)                         | React, TypeScript, Vite, Three.js, crop editor and downloads               |
| Shared engine | [`packages/engine`](packages/engine)           | PDF analysis, selection, preparation, barcode evidence and raster export   |
| Link service  | [`apps/web/server`](apps/web/server)           | HTTPS-only PDF fetching, DNS pinning, redirect checks and bounded delivery |
| Production    | [`Dockerfile`](Dockerfile), [`deploy`](deploy) | Non-root, standalone Node service; no database required                    |
| Identity      | [`brand`](brand)                               | Approved board, editable source, marks, fonts and design tokens            |
| Decisions     | [`docs`](docs)                                 | Architecture, workflows, printer research and verification                 |

See the [engine API and CLI guide](docs/engine-api.md), [pipeline architecture](docs/proposed-pipeline.md), [user journey](docs/diagrams/README.md) and [MUNBYN ITPP130B research](docs/munbyn-itpp130b-research.md).

## Check the work

```sh
npm run typecheck
npm run typecheck:web
npm test
npm run test:web
npm run fixtures
npm run build:web
npx playwright install --with-deps chromium firefox webkit
npm run test:web:browser
```

The recorded acceptance run passed **52 engine tests, 39 website/service tests and 43 browser checks**, including the original private supplied label. Browser coverage includes Chromium, Firefox, WebKit and emulated iPhone/Android contexts; responsive checks cover widths 320–2560 and enlarged text. Public CI uses synthetic files and skips the private-label checks. Read [website verification](docs/website-verification.md) for the exact scope and limitations.

## What comes next

Publish the website on DigitalOcean and connect cropotter.com through GoDaddy. Then develop the Chrome extension, iOS app, Windows/macOS apps, and finally a validated direct-print path. Accounts, shared queues and Bluetooth printing are planned work. The current website gives users files to print through their usual PDF viewer. [Full roadmap →](docs/roadmap.md)

## Made for the mailroom

The approved identity is **04 — The Mailroom Stamp**: indigo ink, warm paper, postal orange, condensed headlines and a tactile wordmark. Explore the [complete brand sheet and editable source](brand/README.md).

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md), keep examples synthetic, and include relevant validation with changes. Code and original project material are [MIT licensed](LICENSE); bundled fonts retain their included SIL Open Font Licenses, and dependencies retain their own licenses. The license does not grant trademark rights or imply endorsement.
