# Contributing

Use Node 24 or newer. Run `npm ci`, then `npm run dev:web`. The shared engine lives in `packages/engine`, the customer website in `apps/web`, and production configuration in `deploy`.

Keep shipping-label output at 4 × 6 inches with at least ⅛ inch of white margin on every side. Preserve proportions, barcode data and page accounting. Ambiguous crops need deliberate user review. Never add branding to output labels.

Use synthetic recipient data and barcodes in tests and screenshots. Keep real customer PDFs, signed download links and credentials out of source, issues and logs. Bug reports should describe the layout and steps to reproduce; a synthetic example is best.

For changes, run relevant typechecks and tests. Before a release, follow [website verification](docs/website-verification.md), including the production build and browser suite. Give accessibility, touch interaction, reduced motion and Safari downloads the same care as desktop Chrome. Record material limitations honestly.

Describe the concrete problem, resulting behavior and validation in pull requests. New native apps, cloud accounts, Bluetooth printing and analytics require separate design work; see [the roadmap](docs/roadmap.md).
