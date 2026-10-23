# Claude distribution acceptance — 2026-10-22

User requested actual Claude web skill acceptance, then a one-click desktop extension ready for submission, with no new monthly costs. Source was published through [PR #1](https://github.com/mrdewclau/cropotter/pull/1) and the [0.1.2 desktop release](https://github.com/mrdewclau/cropotter/releases/tag/claude-desktop-v0.1.2); directory submission and terms acceptance are not performed by this work.

## Claude web: actual hosted acceptance

| Gate | Executed evidence |
| --- | --- |
| Public artifact | Installed the actual published `cropotter-skill-0.1.0.zip`, 71,616 bytes, SHA-256 `3f9995d24df17784d938e46e9aee3abd9dd52f29649a96f458596d11834efc8f`, through Claude web Customize → Skills → Upload. Claude accepted/enabled the complete eight-file skill. |
| Initial runtime | Actual sandbox had Node 22.22.0 / npm 10.9.4. The unchanged skill correctly refused before dependency installation or conversion. This was a genuine compatibility blocker, not a successful initial run. |
| Sandbox setup | With explicit test authorization, Claude downloaded official Node 24.22.1 Linux x64 and its official checksum list, checked SHA-256, extracted within its temporary sandbox, and put Node/npm first on PATH. Node 24.22.1 / npm 11.19.1 then ran. No package/skill source changes or paid API were used. |
| Skill execution | Bundled package checksum and npm dependency installation passed. Analysis found one high-confidence label. Unchanged skill produced PDF, 300 DPI PNG, ZIP and manifest without acknowledgement. |
| Actual downloads | Downloaded all four files through Claude's real UI, then independently inspected the bytes outside Claude: PDF 288 × 432 pt; PNG 1200 × 1800; ZIP contains the correctly named PDF and PNG. All three artifact SHA-256 values match the downloaded manifest; acknowledgement false and minimum margin 0.125 inches. |
| Review withholding | In the same hosted session, explicit selections `[{"pageIndex":0}]` without acknowledgement returned exit 2 / `review_required`, empty artifacts and no output folder. Claude reported the manual/barcode warnings and did not approve them. |

Downloaded PDF: 66,805 bytes, SHA-256 `6cdaa3b939cab40b728f039ff9cd8860819c38b2aea0d433b95ee8ba0d71c519`. PNG: 90,238 bytes, `569246a008c5f3d814469737a086f1ae69db129b145212209fcf4ffc98ab6413`. ZIP: 112,137 bytes, `304951e4eae80896183283fc6d9b97624b35ae0b8d04715b354726d3b83b137e`.

This proves the skill works in that actual Claude web sandbox **after runtime preparation**. It does not establish a setup-free web skill or promise persistent sandbox runtimes. Existing instructions still do not silently download Node. Uploading a PDF to Claude web places it in Anthropic's hosted environment, distinct from local desktop processing. Screenshots/downloads and diagnostics stay under ignored `output/claude-release/`; no account identifiers or private chat links are published here.

## Desktop bundle

The extension includes both official Node 24.22.1 macOS runtimes, both native canvas architectures, locked production dependencies, the shared local engine, a branded 512 px icon, license files and build provenance. It requires **macOS 13.5+**. The launcher uses the documented MCPB binary launch mechanism, selects architecture locally, removes inherited Node environment overrides and makes no runtime downloads. One-time configuration selects a private workspace; server handlers reject outside paths, sibling-prefix escapes and symlinks.

Official runtime archives and pinned SHA-256 are recorded in `extensions/claude-desktop/runtimes.json`. Both binaries' minimum OS was independently checked with `otool`. Official MCPB CLI 2.1.2 validates and packs the bundle. The artifact is unsigned; no certificate, paid worker or hosted MCP endpoint was created.

## Actual desktop bug found and corrected

The first installed 0.1.1 extension passed discovery and analysis in Claude Desktop but returned a generic conversion failure. The user supplied that host result. The selected workspace is on **ExFAT** (`diskutil` verified), where the engine's atomic hard-link publication returned `ENOTSUP`. The output directory existed and was empty; spaces and new-folder creation were not the cause.

A direct hard-link probe reproduced `ENOTSUP` on that volume. A regression reproduced conversion failure before the fix. Version 0.1.2 adds an unsupported-hard-link fallback using exclusive/no-follow destination creation. It never replaces existing files and removes current-job output on handled failure/cancellation. Unlike hard-link publication, fallback destinations can be visible while writing; abrupt termination may leave partial files. This is documented rather than presented as atomic publication on ExFAT. The same synthetic conversion subsequently passed directly on the actual ExFAT volume.

The actual installed **0.1.2** extension then passed analysis and conversion with the identical failed arguments, including the filename `Desktop host test`, all three formats and the same ExFAT output directory. The retry ran in the same desktop-connected Claude conversation. Independent inspection confirmed the real PDF is 288 × 432 pt, the PNG is 1200 × 1800, ZIP members match the standalone files byte-for-byte, and all artifact hashes match the manifest. A subsequent actual-host request for the synthetic earlier web output outside the selected workspace returned `OUTSIDE_WORKSPACE` without analysis. The selected test workspace was the project directory; the child output folder remained within it.

Actual desktop output: PDF 66,805 bytes, SHA-256 `a3189b96c82222b214c4283ea4f5ccd77b2cbb0808a9812d5e7dc050bab04848`; PNG 90,238 bytes, `569246a008c5f3d814469737a086f1ae69db129b145212209fcf4ffc98ab6413`; ZIP 112,142 bytes, `ff0533d715447af46b75ca9182d24d3d77e54d30126ab398ece6596218108224`.

Claude returned local file paths and `cropotter://` artifact resource URIs. In this host it did **not** turn them into attached conversation downloads. Users open the generated files in their chosen local workspace; do not promise clickable Claude download cards. Resource reads were separately verified using real MCP clients against the extracted bundle.

## Release gates

| Gate | Status |
| --- | --- |
| Local checks | Engine 61, web 50, local 15, distribution 3 and extension checksum 1 tests passed. All three typechecks, production web build, clean packed CLI/MCP verification and clean skill-ZIP verification passed. Workspace isolation, no-overwrite, partial-write rollback and review withholding are covered. |
| macOS archive | Final 0.1.2 archive passed both native Apple Silicon and Intel via Rosetta: extracted CLI/MCP/resource conversion, actual transmitted MCP cancellation, no cancellation output and subsequent-request recovery, with OS network denied and no Node/npm on PATH. Physical Intel hardware was not tested. |
| Actual Desktop | Install/update/configure/enable/discover/analyze/convert passed with 0.1.2, including real ExFAT outputs and actual outside-workspace rejection. The original failure and the host download-card limitation are preserved above. |
| Review | Independent review found no remaining P1/P2 issues after minimum macOS requirement and cancellation acceptance fixes. |
| Source/CI | [PR #1](https://github.com/mrdewclau/cropotter/pull/1) merged. [Implementation CI](https://github.com/mrdewclau/cropotter/actions/runs/39874346684) passed, including 98 browser checks / 12 expected skips. Merged and tested content trees are identical (`1dd037cc7ff28246adce885728b650a31c74e745`). |

Final artifact: `cropotter-0.1.2-macos-universal.mcpb`, **122,334,239 bytes**, SHA-256 `fcda3cd27798d0637358d420d21f0f99561518039846d05195be1338738cc3b1`. Official MCPB manifest and icon validation passed. Artifact identity is independently verified and the bundle remains unsigned.

## Dependency audit

Production dependency audit reports zero advisories. The build-only official MCPB 2.1.2 tool brings an unpatched `node-forge` signature-verification advisory ([GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)); full development audit therefore is not clean. Packaging here does not sign or verify certificates, and MCPB/node-forge is not shipped in the extension runtime. A `tmp` override to 0.2.7 removes its fixable development-tool advisories. This is a bounded build-tool exception, not a claim that the upstream advisory is fixed.

## Reproduce

Run `npm ci` with Node 24+, `npm run build:claude-extension`, `npm run test:claude-extension`, and `npm run verify:claude-extension` on macOS. Archive and hashes are generated under `output/claude-release/`; extract/launch validation runs outside the checkout. `--refresh-lock` is an explicit maintainer command after changing the packed local package, not part of user installation.

No new monthly resources or subscriptions. Build-time public downloads and ordinary user Claude/data usage remain separate. Production website, DigitalOcean resources and GoDaddy DNS are unchanged. Submission fields, data handling and reviewer cases are in [the submission packet](claude-submission/README.md).
