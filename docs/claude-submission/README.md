# Claude Desktop submission packet

CropOtter 0.1.2 was submitted to Anthropic’s local desktop-extension directory on 2026-10-22 with explicit owner authorization. The form confirmed receipt. Approval/listing is pending; see [submission status](../claude-directory-status-2026-10-22.md). This packet is the reviewer material, not an approval certificate. No new monthly service is needed.

| Item | Prepared value / location |
| --- | --- |
| Package | [Verified macOS installer](https://github.com/mrdewclau/cropotter/releases/download/claude-desktop-v0.1.2/cropotter-0.1.2-macos-universal.mcpb); local output `output/claude-release/cropotter-0.1.2-macos-universal.mcpb` |
| Artifact identity | `output/claude-release/extension-artifact.json` and `SHA256SUMS`; attach the exact verified bundle, not a renamed skill ZIP |
| Public source | https://github.com/mrdewclau/cropotter; PR #1 merged, implementation CI passed; extension source under `extensions/claude-desktop/` |
| Publisher / license | CropOtter; author profile https://github.com/mrdewclau; MIT |
| Short description | `listing.md` (under the form's 50-word limit) |
| Data handling | `privacy.md`; local conversion with tool results/resources delivered to Claude |
| Test cases | `test-cases.md` plus `docs/claude-distribution-2026-10-22.md` for actual acceptance and limitations |
| Support | https://github.com/mrdewclau/cropotter/issues |
| Owner contact | Owner explicitly approved contact/account identity and primary-party submission; private details are not published in source |
| Owner agreement | Owner explicitly authorized acceptance and submission on 2026-10-22; confirmation recorded |

Verified artifact: **0.1.2**, 122,334,239 bytes, SHA-256 `fcda3cd27798d0637358d420d21f0f99561518039846d05195be1338738cc3b1`. Actual installed Claude Desktop conversion and workspace-boundary checks passed. Files are saved in the selected local workspace; this tested host returned local paths/resource URIs rather than attached download cards.

## Correct submission route

The [official desktop extension help](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop) links the [MCPB desktop-extension form](https://clau.de/desktop-extention-submission). The linked form was inspected on 2026-10-22. It asks whether this is an update, primary contact name/email, a server description (50 words maximum), GitHub repository URL, primary-party confirmation, an uploaded `.mcpb` (up to 1 GB), directory terms agreement and optional feedback. It states that submission does not guarantee inclusion or a response time.

This is a **new** extension. It is built with Node.js and packaged as a binary-type MCPB so its own checksum-pinned Node runtime launches consistently with native canvas dependencies. It requires no developer-installed Node, npm or runtime download. The form's GitHub/MIT/Node/author-profile requirements are addressed. The repository branch containing the extension must be publicly available before sending the link.

Use this local-extension route, rather than presenting the website URL as a remote MCP endpoint. CropOtter does not operate a hosted MCP conversion service. Skills/plugin-bundle submissions through the newer Claude portal are separate; the tested web skill is not this `.mcpb`.

## Before final submission

| Gate | Evidence required |
| --- | --- |
| Source finalized | Reviewed source commit publicly reachable; all required CI checks green |
| Artifact finalized | Official MCPB validation, exact archive SHA-256 and extracted-package acceptance recorded |
| Host acceptance | Install/configure/discover/analyze/convert through actual Claude Desktop, and inspect the real generated files |
| Runtime / native support | Apple Silicon and Intel via Rosetta tested; do not claim Windows, Linux desktop or physical Intel hardware acceptance |
| Reviewer reproduction | A synthetic PDF and explicit local workspace instructions; no real labels, signed URLs or private customer data |
| Signing disclosure | Bundle is unsigned. No certificate purchased and no false signature/trust claim; publisher signing may be requested by review |
| Submission | Completed with explicit owner authorization; await Anthropic review |

To rebuild: Node 24+, `npm ci`, `npm run build:claude-extension`, `npm run test:claude-extension`, `npm run verify:claude-extension` on macOS. Build-time npm/official Node downloads use the network; conversion and extracted acceptance do not. Runtime archive checksums are pinned in `extensions/claude-desktop/runtimes.json`. Dependency versions/integrities are locked in the extension's package lock. After changing the packed local package, maintainers explicitly regenerate that lock with `node tools/claude-extension/build.mjs --refresh-lock` and review the diff.
