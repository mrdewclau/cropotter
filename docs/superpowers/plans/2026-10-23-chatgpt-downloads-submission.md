# ChatGPT downloads and OpenAI submission preparation

> For agentic workers: use superpowers:executing-plans for implementation and dispatch independent website work separately from submission preparation.

**Goal:** Add the verified ChatGPT plugin download alongside Claude on cropotter.com, test available signed-in ChatGPT web capabilities, and prepare the existing plugin for OpenAI directory review without new monthly services.

**Architecture:** Extend the accepted download shell with a ChatGPT tab and on-demand setup. Serve the immutable tested public plugin release through its GitHub download URL. Continue the existing DigitalOcean deployment process. Prepare listing/policy/icon/review metadata in the source-owned native plugin; no remote MCP or new infrastructure.

**Spec:** The user's current request, standing AGENTS.md app-shell requirements, and existing tools/agent-distribution/download-page templates. Preserve the existing approved design rather than redesigning it.

**Constraints:** Essential actions visible at desktop, phone, short landscape and enlarged text; no outer document scrolling, child clipping or overlap. Longer material in bounded dialogs. Preserve Claude installer and original vendor assets, portrait 4x6 label geometry, review gating, unbranded output and synthetic evidence. Never claim directory approval or untested ChatGPT runtime support. No new subscriptions, API billing or owner conversion service.

**Review focus:** Three-tab keyboard/hash navigation; dialogs correctly restore focus after changing tabs; long instructions at enlarged text; plugin ZIP downloads are not automatic double-click installers; public metadata must include verified terms/privacy/support/home URLs, square PNG icons and explicit publisher/commerce/country facts.

## Task 1: Website download shell

- [x] Establish the unchanged build/agent-test baseline with Node 24+.
- [x] Add meaningful failing browser coverage for the ChatGPT tab, hash/keyboard navigation, download URL and essential-action visibility across the existing viewport matrix.
- [x] Extend download-page.html/css/js with ChatGPT preview/download/setup/status; update formatter discovery to cover both clients without crowding controls.
- [x] Keep the tested 0.1.0 release URL and accurate private import/local marketplace instructions unless a newly verified release replaces it.
- [x] Run affected agent/web checks and production build. Capture and visually inspect actual screenshots and dimensions on desktop, phone, short landscape and enlarged text.

## Task 2: Public submission package

- [x] Inspect current OpenAI requirements and actual source. Resolve publisher, country targeting and commerce from the user; do not infer them.
- [x] Draft or reuse actual support/privacy/terms materials. Reuse the existing MIT license without adding new contractual obligations, and verify all four final public listing URLs by content.
- [x] Reuse owned CropOtter branding as square PNG icons; inspect light/dark legibility. Preserve plugin identity and packaged engine; version submission changes explicitly.
- [x] Add supported listing/review/publication metadata and targeted final-ZIP validation. Skills-only route has no MCP server, recording or reviewer credentials requirement.
- [x] Inspect the signed-in ChatGPT browser for a supported test/import route; do not bypass account or host restrictions or assume desktop acceptance establishes web execution.
- [x] Build and inspect the final archive, record checksum/inventory/engine equivalence and actual readiness. Track any missing developer verification, attestations, account eligibility or scans separately. Do not submit for review or accept legal terms merely because preparation was requested.

## Task 3: Release and deployment

- [x] Independently review affected source/package and run required checks on the final commit.
- [x] Publish source and appropriate immutable release assets, preserving exact artifact identities and truthful status.
- [x] Inspect existing production configuration, deploy only CropOtter on the existing host and verify health/HTTPS/download hash, shell geometry/screenshots and real conversion.
- [x] Update HANDOFF.md and deployment/submission records; present what is live, what is prepared and any exact remaining user action.
