# No-cost agent access implementation

Approved scope: `../specs/2026-10-22-no-cost-agent-tools.md`. Execution: same chat, independent implementation tasks with focused review. Existing source clean at 52d60da; feature branch `feat/no-cost-agent-tools`.

## Interfaces and ownership

| Unit | Files | Contract |
|---|---|---|
| Local tools | `packages/local/**` | Packed `cropotter-local` exposes `cropotter` CLI and `cropotter-mcp` stdio. `npm run build --workspace packages/local` emits a self-contained dist using existing engine source; dependencies pinned. CLI `convert --input PATH --out DIR --formats pdf,png,zip --name NAME --dpi 203|300`; `analyze --input PATH`; explicit selections file and review acknowledgement. JSON results on stdout, diagnostics on stderr. |
| Browser tools | `apps/web/src/lib/webmcp.ts`, App/ResultPanel, web tests | `registerCropOtterTools(context, controller)` binds current-state callbacks, narrow schemas, abort cleanup. Only ready/human-acknowledged current outputs yield page-local links/downloads. |
| Distribution | `skills/cropotter/**`, `tools/agent-distribution/**`, docs/static guide | Build local tarball and ZIP from current source; include deterministic skill script invoking bundled CLI. Output `apps/web/public/agents/` with metadata/checksums, package/ZIP/guide. Do not modify visual shell. |

## Tasks

1. Local package: write failing integration tests for real conversion/analysis, review withholding, filename/path safety and registered-artifact reads; run red. Implement local service, CLI, SDK stdio wrapper, build config and package exports. Run green and packed clean-install tests. No workspace-root changes by task owner; coordinate scripts/dependency lock centrally.
2. Browser route: write failing callback and Playwright tests for registration/no-support, actual sample conversion/download, shared human review gate, reset/busy/stale states and name/DPI changes. Implement registry and App bridge, keeping conversion in existing functions. Run green and typecheck/build. Validate actual browser API separately where supported.
3. Distribution/skill: after local CLI contract is verified, create skill with bundled package installer/runner and local-only processing. Build reproducible artifacts and static instructions; test installation/execution outside checkout. Cover missing Node/dependency failures with actionable errors and no fallback to remote upload.
4. Integration: root scripts build/test all units; CI verifies packed installation and synthetic MCP/CLI output. Fresh review checks security, file scope, human review and source/artifact consistency. Fix findings and rerun appropriate tests.
5. Release: publish code and packaged assets using existing free distribution channels. Inspect existing host/service, build/redeploy app only, verify health/live tools/static artifacts and actual conversion/downloads, verify shell geometry and screenshot, update HANDOFF and release evidence.

## Review focus

| Risk | Required evidence |
|---|---|
| Engine returns prepared but review-required output | CLI/MCP withholds final files without explicit acknowledgement; browser shares UI checkbox state and cannot auto-ack. |
| Agent requests a previous document during replacement/cancel | No stale downloads or mutation; tests use pending jobs/reset and document identity. |
| Native workspace dependency missing in published package | Clean install of packed tarball outside repo, real PDF+PNG+ZIP output. |
| Arbitrary-file resource read or symlink overwrite | Instance-scoped resource allowlist, symlink/no-clobber regressions. |
| SDK/native browser differs from test harness | Real SDK subprocess client and native WebMCP probe; clearly record any unsupported client surface. |

No new monthly billing resources are permitted. Existing site/distribution bandwidth still applies; do not promise unlimited traffic.
