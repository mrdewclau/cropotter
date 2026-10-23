# ChatGPT web acceptance — 2026-10-23

The signed-in owner's ChatGPT web account imported and installed the exact public CropOtter 0.1.0 plugin ZIP, then returned actual downloadable files in ordinary Chat mode. This supplements the [desktop acceptance](desktop-verification-2026-10-23.md). It does not establish support on mobile, every plan, every execution environment or physical printers.

## Real installation and execution

The Personal plugin inventory contained no CropOtter entry. The supported browser flow was Plugins → Add (+) → Upload plugin archive → select ZIP → Add plugin → Install plugin → Try in chat. The private plugin displayed CropOtter, James Boyd, version 0.1.0 and one skill. This private account import is separate from OpenAI directory submission or approval.

The tested public ZIP is 107,165 bytes with SHA-256 `33beceacb4e5ca835f1b425fb1611ce2f9b2f612047cb9a75f2e74ca0ae70103`. Node 24 was already available. First-use dependency installation initially encountered the host's restricted network path; the chat completed installation through the permitted execution path, used the packaged engine and inspected the manifest. No owner-hosted conversion worker, model API key, API credits or new paid service was created. Existing ChatGPT access, execution permissions, npm access and usage limits still apply.

## Downloaded artifacts

Two prompts were run in the real browser conversation. All four outputs per case were downloaded through ChatGPT's visible download cards/buttons. Independent checks compared file sizes and SHA-256 hashes with the manifests, PNG dimensions, PDF MediaBox and ZIP member bytes. In the attached-PDF case, the initial standalone PDF card returned a 91,707-byte host rendition rather than the 66,805-byte manifest file; the ZIP retained the exact original PDF. PNG and ZIP downloads matched their manifests. A direct original-PDF alias was requested separately. Both manifests were ready, without warnings or review acknowledgement; the synthetic source had one high-confidence embedded-image candidate. The engine reported verified Code128 preservation.

| Case                   | Input                                                                                           | Output                  | Independent result                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| Browser test, 300 DPI  | Bundled synthetic sample                                                                        | PDF, PNG, ZIP, manifest | 288 × 432 pt PDF; 1200 × 1800 PNG; ZIP matches standalone files |
| Web-order-204, 203 DPI | Synthetic sample PDF attached through the browser file picker; prompt excluded the bundled demo | PDF, PNG, ZIP, manifest | 288 × 432 pt PDF; 812 × 1218 PNG; ZIP matches standalone files  |

| Artifact                     |   Bytes | SHA-256                                                            |
| ---------------------------- | ------: | ------------------------------------------------------------------ |
| Browser test.pdf             |  66,805 | `2fb8e52e12ddc4dd925a5902428bc077ab8f0444e84aea98f7893d7e7f633d6a` |
| Browser test-001-300dpi.png  |  90,238 | `569246a008c5f3d814469737a086f1ae69db129b145212209fcf4ffc98ab6413` |
| Browser test.zip             | 112,122 | `93c4228518811d4876aa7829d6550b3c345b6c9cc8a9b71ee23a0eb42f75a67f` |
| Web-order-204.pdf            |  66,805 | `2c36b36ff3095a45ce2a7ade5d33fd68db5735742cfa7f772511e7d24b0c4ab7` |
| Web-order-204-001-203dpi.png |  49,384 | `60bb99b14488106644ec8a77e12c0c91f3bc109e311ac8170284d7119d83634a` |
| Web-order-204.zip            |  82,773 | `2a1bf75f55798463ba736495772a04a1e4da235002c50ad6b8d03c6b1783d1bb` |

The first case used lowercase/hyphenated aliases for standalone chat download cards; its ZIP retained the engine's original requested filenames with spaces. The second case preserved the requested filenames directly. The first case delivered the same bytes as its engine manifest. For the second case, use the ZIP to obtain the independently hash-verified original PDF; the initial standalone PDF card changed bytes. The 300 DPI PNG was visually inspected as a clean synthetic shipping label with readable barcode and no added CropOtter branding.

This is successful conversion and file delivery acceptance. It is not a broad evaluation of adversarial prompts, public-directory eligibility, carrier approval or physical print quality. No private customer PDFs or unrelated account screenshots are included in public evidence.
