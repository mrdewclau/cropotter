# Claude skill acceptance and desktop extension plan

**Goal:** Test the existing skill in Claude web, then prepare a one-click local desktop extension and an honest submission package, with no new monthly services.

**Approved approach:** Keep the shared label engine and browser shell unchanged. Use only synthetic PDFs. Claude web acceptance must happen in an authenticated Claude session and must produce actual downloadable PDF/PNG/ZIP files; local tests cannot substitute for this gate. While sign-in is pending, prepare the independent packaging work.

| Task | Deliverable and acceptance |
| --- | --- |
| Claude web | Install the current public skill ZIP in a test session, analyze and convert the synthetic sample, retrieve actual outputs and verify geometry, names and review withholding. Record runtime/dependency failures verbatim with private identifiers removed. |
| Local extension boundary | Optional workspace restriction for the local MCP server; extension reads/writes only beneath the folder selected during installation. Reject sibling paths, symlinks and invalid roots before processing. Preserve existing CLI behavior. Add accurate tool titles/annotations. |
| Self-contained macOS MCPB | Bundle both official Node 24.22.1 macOS architectures, both corresponding canvas binaries, the locked production dependencies, licenses, launcher, icon and MCP manifest. No npm or download on the user's machine. Use documented binary MCPB launch configuration, not Claude-internal routing workarounds. |
| Package verification | Official MCPB schema validation; extract outside the checkout, launch with no Node/npm on PATH, discover tools, convert/read generated resources, deny outside-workspace paths, withhold manual output, cancel and verify no-clobber. Check archive contents, executable modes, runtime hashes and licenses. Test available architectures and label any untested platforms explicitly. |
| Submission preparation | Listing copy, privacy/data handling, installation/removal, support/source/license links, test cases and evidence. Use the desktop-extension submission route. Prepare without submitting forms or accepting terms. Record signing and host acceptance truthfully. |
| Release bookkeeping | Relevant tests/typechecks/production build, independent review, clean source branch and downloadable local artifact with SHA-256. Update handoff and acceptance notes. Existing hosting only; no worker, storage service, model API, account upgrade or subscription. |

**File map:** `packages/local/src/service.ts` and `mcp.ts` own the optional workspace boundary; their tests prove rejection before I/O. `extensions/claude-desktop/` owns launcher/manifest/readme/icon. `tools/claude-extension/` owns dependency/runtime staging, MCPB build and extracted-package acceptance. `docs/claude-distribution-2026-10-22.md` and `docs/claude-submission/` own evidence and submission copy. Build artifacts stay under ignored `output/claude-release/`.

**Platform scope:** A universal macOS bundle can be tested on this Apple Silicon Mac and, if available, Intel execution through Rosetta. Windows/Linux desktop packages are not silently claimed. The same local engine already has separate Linux CLI/MCP CI acceptance.

**Review focus:** Runtime/native-library architecture mismatches; extraction losing executable modes; inherited Node environment influencing launch; path aliases or sibling-prefix escape; claiming Claude web or directory approval without actual host evidence.

**Execution:** Implement in this session on `codex/claude-distribution`. Test behavior before code changes, verify the extracted archive through a real MCP client, and independently review the finished diff. Continue the authenticated web gate as soon as access is available.
