# CropOtter native OpenAI plugin — desktop acceptance

Verified 2026-10-23. The user selected desktop testing rather than signing into a new web session. This acceptance covers the local desktop Work/Codex environment. It does not establish execution in regular ChatGPT web, mobile, every account plan or a cloud sandbox.

## Package and installation

| Item                   | Verified result                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plugin                 | `cropotter@personal`, version 0.1.0, installed and enabled through the official plugin CLI                                                              |
| Archive                | `cropotter-chatgpt-0.1.0.zip`, 107,165 bytes                                                                                                            |
| SHA-256                | `33beceacb4e5ca835f1b425fb1611ce2f9b2f612047cb9a75f2e74ca0ae70103`                                                                                      |
| Engine                 | Packaged local engine 0.1.2; shared engine 0.1.0                                                                                                        |
| Contents               | Portable root manifest, complete executable skill, checksum-bound engine tarball, synthetic sample, owned icon and license                              |
| Runtime                | Default Node 22 was rejected. The host dependency tool located already-bundled Node 24.19.0; task-scoped PATH selected it without changing system Node. |
| Existing configuration | Personal marketplace's Typesafe entry preserved; local configuration backups retained privately in ignored output                                       |
| Costs                  | No new cloud resources, account, model API calls, API key or recurring service. Caller plan/runtime usage and first-use npm access still apply.         |

The desktop app denied Computer Use against its own interface. No alternate UI automation or hidden application API was used. The official CLI installed the plugin, and the user created the actual test conversation. Plugin Creator was suggested as another supported authoring route, but was not required for this installation.

## Actual desktop conversation

The user-created conversation **Create Desktop test sample files** requested:

> Use CropOtter’s bundled synthetic sample to create PDF, PNG and ZIP files named Desktop test at 300 DPI. Use its packaged engine and return the actual files.

The fresh conversation discovered the installed CropOtter skill, read its installed instructions, analyzed the bundled synthetic PDF and converted it with the packaged engine. It recovered from the incompatible default Node by using the host's documented dependency-discovery tool. Analysis found one high-confidence embedded-image candidate with no warnings, so human-review acknowledgement correctly remained false. The final answer linked the three actual local files.

The user subsequently confirmed: **“Test succeeded; files appeared.”**

Independent verification read those conversation-generated files, rather than substituting the earlier command-line test outputs. All manifest byte lengths and SHA-256 values matched. The PDF contains one 288 × 432 pt page; the PNG is 1200 × 1800 pixels. The ZIP has exactly the PDF and PNG, byte-identical to their standalone counterparts. The PNG was visually inspected: synthetic recipient data, full barcode, portrait proportions and white margins remain intact; no CropOtter branding appears on the label.

| File                        |   Bytes | SHA-256                                                            |
| --------------------------- | ------: | ------------------------------------------------------------------ |
| Desktop test.pdf            |  66,805 | `0bdb4fd3f8f40121e57a093c847ee6c35e212d74da78a8ccfeea2a07abe72c16` |
| Desktop test-001-300dpi.png |  90,238 | `569246a008c5f3d814469737a086f1ae69db129b145212209fcf4ffc98ab6413` |
| Desktop test.zip            | 112,121 | `9db6a9a73fb1b55703233482ca891def0c6e306fc2942f284900d775fcdec206` |

Engine validation reports the Code128 barcode preserved at 203 DPI PDF/monochrome and 300 DPI PDF rendering. These are decoding checks, not physical printer/scanner acceptance. The host returned local file links; this does not prove cloud download cards, that a person clicked every link, or automatic discovery in all conversation modes.

## Regression and scope

The archive integration regression was observed failing before the builder existed, then passed using an independently extracted archive and real engine execution. It checks analysis, actual PDF/PNG/ZIP output, checksums, output geometry and withholding final files when explicit page selections require human review. Source formatting, engine/local typechecks and production plugin build passed. The test builds the local package itself so it runs on a clean CI checkout.

A separate installed-copy test also passed using a writable task copy, leaving the installed resources unchanged. The actual conversation used the writable installed skill directly, which is supported by the canonical runner. No website layout, production deployment, DNS, shared server or Claude installer changed in this work.

An uploaded customer PDF, actual cloud ChatGPT execution, broad prompt/negative-case evaluations, public directory submission and mobile remain unverified. The user did not request public OpenAI directory submission or authorize new directory agreements. The prepared portable ZIP and public source do not constitute directory approval.

## Public preview and Linux verification

[PR #3](https://github.com/mrdewclau/cropotter/pull/3) merged as `f91a4e7`. Its code/content tree matches the tested head `b7da539` exactly. [Linux CI 39911023965, attempt 2](https://github.com/mrdewclau/cropotter/actions/runs/39911023965/attempts/2) passed every gate, including the real plugin extraction/conversion regression, package installations, production website build and **108 browser checks / 12 expected skips**. The first attempt was canceled during unusually slow Ubuntu mirror downloads; the fresh runner passed without a code change. The browser run took 8.8 minutes.

[Desktop preview 0.1.0](https://github.com/mrdewclau/cropotter/releases/tag/chatgpt-plugin-v0.1.0) is public with the exact tested ZIP and checksums. All 13 packaged entries match the installed plugin byte-for-byte. An anonymous HTTPS download matched the original 107,165-byte archive and SHA-256; the public privacy-policy URL returned success. This publishes source/distribution only. CropOtter's production website, DigitalOcean host and Claude installer were not redeployed.

Subsequent checkpoint: [ChatGPT web acceptance](web-verification-2026-10-23.md) now verifies actual cloud execution, browser attachment input and downloadable PDF/PNG/ZIP files with synthetic data. The limitations above describe the earlier desktop-only checkpoint.
