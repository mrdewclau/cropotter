# CropOtter ChatGPT Plugin Implementation Plan

> For agentic workers: use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Install and test CropOtter inside ChatGPT without new owner subscriptions, model API bills or conversion infrastructure.

**Architecture:** Package the existing executable skill and exact engine tarball as a native, skills-only OpenAI plugin. Conversion runs in the caller's supported ChatGPT Work/local environment. Keep the existing browser and Claude releases unchanged. Verify actual host execution and downloadable files before making a ChatGPT-support claim.

**Tech stack:** Node 24+, existing local package, fflate ZIP packaging, portable Agent Plugins manifest. No new dependencies or MCP endpoint.

**Constraints:** Node 24+, npm and a supported native canvas platform; first-use npm access. Copy only the packaged skill into a private writable task directory if the installation is read-only. Preserve canonical input/output paths, 4x6 portrait geometry, minimum 1/8-inch white margins, exact shared engine, review withholding, safe requested names and actual file attachments. Host plan/usage and network permissions remain separate from owner costs.

**Review focus:** Read-only plugin installation; incomplete/changed bundle; unavailable Node/npm/native canvas; uncertain crops requiring human acknowledgement; paths falsely presented as downloadable attachments.

## Task 1: Package the executable plugin

- [x] Add an archive/real-conversion regression and observe failure before implementation.
- [x] Create minimal portable manifest and maintained ChatGPT host instructions, using existing branding and no remote app dependency.
- [x] Build an independently extractable plugin ZIP with the complete skill, hash-bound engine, synthetic sample, icon and license.
- [x] Extract into an isolated task directory; run real analyze/convert, inspect PDF/PNG/ZIP/hashes and verify review withholding.

## Task 2: Test actual ChatGPT

- [x] Follow the user's desktop-testing choice and install the prepared package using the supported official plugin CLI.
- [x] Verify the user's actual fresh desktop conversation discovered the plugin, converted its synthetic sample and linked real files; independently verify geometry/hashes and inspect the PNG.
- [x] Record activation, runtime, approvals, costs and unsupported host capabilities truthfully.
- [x] Document the verified desktop setup and acceptance in the source repository; preserve the production app shell and Claude installer unchanged.
- [ ] Actual uploaded-PDF/cloud ChatGPT acceptance remains separate; do not claim those environments work based on local desktop acceptance.

## Execution notes

Web session was signed out; user selected desktop testing. Desktop Computer Use denied controlling its own app; no bypass attempted. Official CLI supports native plugin installation. Installed/enabled `cropotter@personal` through the existing personal marketplace, preserving its Typesafe entry and backing up changed local configuration in ignored output. Host default Node22 is incompatible; the already-bundled workspace Node24 was verified through the host dependency tool. Added task-scoped runtime discovery guidance without changing the global Node install. Actual ChatGPT Work invocation/download presentation requires the user-operated desktop test; a fresh review agent catalog did not yet include the newly installed plugin, consistent with requiring an application refresh/restart.

The user subsequently created **Create Desktop test sample files**. Read-only inspection confirms actual installed-skill discovery, host runtime recovery, analyze/convert execution and final local file links. Its three outputs independently passed size/SHA-256, PDF geometry, PNG dimensions and ZIP-content comparisons; the PNG was visually inspected. This supersedes the earlier discovery-pending observation for that tested desktop environment only. Ordinary ChatGPT web, cloud download cards, customer attachments and broad prompt evaluation remain unverified. No website interface was changed or promoted based on those untested capabilities.
