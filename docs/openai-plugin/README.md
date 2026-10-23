# CropOtter for ChatGPT Work desktop

The native OpenAI plugin packages CropOtter's existing engine as an executable skill. A fresh local desktop Work/Codex conversation discovered it and produced actual PDF, PNG and ZIP files. Regular ChatGPT web/mobile and every plan/runtime have not been tested. Read the [acceptance record](desktop-verification-2026-10-23.md) and [data handling](privacy.md) for the exact limits.

[Download the 0.1.0 desktop preview](https://github.com/mrdewclau/cropotter/releases/download/chatgpt-plugin-v0.1.0/cropotter-chatgpt-0.1.0.zip) and [SHA-256 checksums](https://github.com/mrdewclau/cropotter/releases/download/chatgpt-plugin-v0.1.0/SHA256SUMS). This portable plugin ZIP uses the host's plugin installation workflow; it is not a double-click desktop extension installer or a directory listing. The [release notes](https://github.com/mrdewclau/cropotter/releases/tag/chatgpt-plugin-v0.1.0) document requirements.

No CropOtter account, model API key, remote conversion endpoint or new monthly service is required. The caller's existing ChatGPT access, execution permissions and usage limits still apply. Node 24+, npm, native canvas support and first-use access to public npm dependencies are required. Where the host already bundles a suitable runtime, the skill uses its dependency-discovery capability and task-scoped PATH; it never silently downloads Node or changes the system installation.

## Use the installed plugin

Open a fresh supported Work conversation with CropOtter enabled. Select it with `@` when the host offers plugin selection. For a synthetic demonstration, send:

> Use CropOtter’s bundled synthetic sample to create PDF, PNG and ZIP files named Desktop test at 300 DPI. Use its packaged engine and return the actual files.

For your own work, attach a shipping-label PDF or explicitly provide its local path and request the desired formats, name and DPI. The agent analyzes first, uses the packaged engine and returns links to actual generated files. Uncertain crops require deliberate human review. A local path is not a publicly hosted download. Cloud attachment presentation depends on the host.

The verified machine has `cropotter@personal` installed and enabled. Its existing personal marketplace was preserved. If a newly installed plugin is missing from a fresh conversation, refresh/restart the desktop application as described in the [official OpenAI plugin documentation](https://developers.openai.com/plugins/deploy/connect-chatgpt).

## Build and install privately

From a Node 24+ source checkout:

```sh
npm ci
npm run build:chatgpt-plugin
npm run test:chatgpt-plugin
```

`output/openai-release/` contains the portable ZIP, SHA-256 checksums and release metadata. Keep the full archive together: root `plugin.json`, `skills/`, engine assets and scripts, icon and license. It has no MCP server, hooks, account connection or hosted conversion dependency.

Install through the host's supported private plugin import/authoring workflow, or add the extracted plugin to a local marketplace. For an existing marketplace named `personal`, the official CLI command is `codex plugin add cropotter@personal --json`; the marketplace must already contain an entry whose local source resolves to the extracted root manifest. Preserve existing marketplace entries and use the current [OpenAI packaging](https://developers.openai.com/plugins/build/plugins) and [local testing](https://developers.openai.com/plugins/deploy/connect-chatgpt) guidance for the host's exact setup.

Private installation and open-source distribution are separate from public directory submission. No OpenAI approval or universal runtime support is claimed. The production website and Claude installer are unchanged.
