# CropOtter for agents

CropOtter offers browser tools, a local command-line/MCP package and an executable Agent Skill. All use the shared CropOtter engine. No CropOtter account, owner API key, remote conversion worker or new subscription is required. Your chosen agent/model service and existing hosting/data charges are separate; this is not an unlimited-bandwidth promise.

| Route | Runs where | Requirements | Download delivery |
|---|---|---|---|
| Browser WebMCP | The open CropOtter tab | A browser/agent exposing `document.modelContext.registerTool` | Page-local blob links and browser downloads |
| Local CLI / stdio MCP | Your computer or permitted agent sandbox | Node.js 24+, npm, local files, supported native canvas binaries | Local output files and instance-scoped MCP resources |
| Agent Skill | A host that can execute local Node scripts | Same local runtime, complete skill ZIP | The host must attach the generated files |

Download the current versioned package and skill ZIP from [the agent downloads](https://cropotter.com/agents/). [manifest.json](https://cropotter.com/agents/manifest.json) records versions, artifact sizes and SHA-256 checksums. Verify the tarball/ZIP against that manifest before installing. The distribution is served by the existing CropOtter website; source remains on [GitHub](https://github.com/mrdewclau/cropotter).

## Install the local package

Download the local tarball named in the public manifest. Replace `VERSION` below with that artifact's version (source-branch versions may be newer than the deployed download). In a new local tools directory, run:

```sh
node --version
npm install --omit=dev --ignore-scripts --no-audit --no-fund /absolute/path/cropotter-local-VERSION.tgz
node ./node_modules/cropotter-local/dist/cli.mjs analyze --input /absolute/path/label.pdf
node ./node_modules/cropotter-local/dist/cli.mjs convert --input /absolute/path/label.pdf --out /absolute/path/new-output --formats pdf,png,zip --name shipment-4x6 --dpi 203
```

Use Node 24 or newer. The install uses public npm dependencies, including a platform-specific native canvas binary; restricted networks and unsupported platforms can prevent installation. The tarball contains the compiled engine, PDF assets and CLI/MCP entrypoints, so the source checkout and TypeScript toolchain are unnecessary. Conversion runs locally without uploading PDFs. The package does not accept remote document URLs or start an HTTP listener. Output is portrait 288 × 432 points (4 × 6 inches), with at least ⅛ inch white margin and no branding. PNG is 812 × 1218 at 203 DPI or 1200 × 1800 at 300 DPI.

JSON results go to stdout. Exit code 2 means review is required and final files were withheld; inspect the analysis and arrange human crop review. `--selections /absolute/path/decisions.json` supplies explicit page/crop decisions. The CLI help and package documentation specify that schema. Use `--acknowledge-review` only after the person has actually reviewed the relevant crop/pages and explicitly acknowledged them. An agent must not automatically approve its own crops. Use a new output directory, preserve warnings and inspect the output manifest before presenting files. Stop the foreground process to cancel; inspect for existing files before retrying.

The local package rejects symlink files and symlink path components. Resolve the explicitly chosen input and existing output parent with Node's `fs.realpath` before conversion; macOS `/tmp` and `/var` are aliases that need this treatment. Use a new private output directory beneath that canonical parent. The package README describes this filesystem boundary in more detail.

## Connect a local MCP client

Install first, then substitute real absolute Node and package paths. Use a local stdio server, with no hosted endpoint or credential. Client trust/approval settings still apply; these examples do not grant blanket filesystem permission. The server reads explicitly supplied local PDFs and writes requested output paths. Output resources are limited to artifacts created by that server instance, rather than arbitrary file reads.

Codex supports this entry in its MCP configuration:

```toml
[mcp_servers.cropotter]
command = "/absolute/path/to/node"
args = ["/absolute/path/tools/node_modules/cropotter-local/dist/mcp.mjs"]
```

See the [official OpenAI MCP documentation](https://developers.openai.com/codex/mcp) for the current configuration location and trust behavior.

Claude Code can add the same executable:

```sh
claude mcp add --transport stdio cropotter -- /absolute/path/to/node /absolute/path/tools/node_modules/cropotter-local/dist/mcp.mjs
```

For Claude Desktop, merge the following server entry into its local MCP configuration through the app's developer settings. Gemini CLI uses the same `mcpServers` structure in its settings JSON. Preserve other configuration entries:

```json
{
  "mcpServers": {
    "cropotter": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/tools/node_modules/cropotter-local/dist/mcp.mjs"]
    }
  }
}
```

See [Claude Code's local stdio guidance](https://code.claude.com/docs/en/mcp) and [Gemini CLI's MCP configuration](https://geminicli.com/docs/tools/mcp-server/). Restart or reconnect the client after configuration. Hosted chats that cannot launch a local process cannot use this stdio server directly. These are configuration examples; actual client-specific discovery, approvals, attachments and hosted-sandbox support require testing in that client.

## Install the Agent Skill

Extract the ZIP and retain the complete `cropotter/` folder, including `scripts/`, `references/` and `assets/`. Install that folder using your host's documented skill mechanism, or explicitly point a local agent to `cropotter/SKILL.md`. The conventional skill format is portable, but automatic discovery and ZIP import differ by host. Copying only `SKILL.md` does not install the executable engine.

```sh
node /absolute/path/cropotter/scripts/install.mjs
node /absolute/path/cropotter/scripts/run.mjs analyze --input /absolute/path/label.pdf
node /absolute/path/cropotter/scripts/run.mjs convert --input /absolute/path/label.pdf --out /absolute/path/new-output --formats pdf,png,zip --name shipment-4x6 --dpi 300
```

The runner verifies the bundled tarball checksum and installs into the skill's disposable `.runtime/` directory. Node is validated rather than downloaded silently. No globally installed package or owner account is needed. Installation failures are actionable errors; the skill never substitutes a remote upload. The first install needs public npm access; subsequent conversion uses installed local dependencies.

The bundle has been tested through clean local installations and real synthetic PDF/PNG/ZIP conversion on macOS and Linux CI. Actual Claude web acceptance also passed after explicitly preparing official Node 24 in its Node 22 sandbox: real downloadable files and the manual-review gate were checked. This does not make the current skill setup-free in Claude web or establish support inside every hosted sandbox. See `docs/claude-distribution-2026-10-22.md` in the source repository. Other client attachment presentation remains host-specific.

Ask the agent to attach the actual generated PDF/PNG/ZIP with your host's attachment tools. Filesystem paths are not public HTTPS links. Some hosts can show local file links, some expose downloadable attachments, and others cannot present generated files at all. The skill must report the actual capability rather than promise universal download buttons.

## Claude Desktop extension

[Download CropOtter for Claude Desktop — macOS v0.1.2](https://github.com/mrdewclau/cropotter/releases/download/claude-desktop-v0.1.2/cropotter-0.1.2-macos-universal.mcpb) (117 MB). Requires macOS 13.5+; Apple Silicon and Intel Node runtimes and dependencies are bundled. It uses a folder picker rather than manual Node/npm configuration; conversion runs locally and the server is restricted to the selected workspace. This is separate from the skill ZIP and does not work in Claude web or mobile. Read [the desktop extension guide](https://github.com/mrdewclau/cropotter/tree/main/extensions/claude-desktop) and its acceptance record for current release/submission status. Open the downloaded `.mcpb` with Claude Desktop, choose a private Label workspace, save your PDF there, and give Claude the file path. No separate Node or npm setup is needed. The installer is unsigned and was submitted to Anthropic’s directory on 2026-10-22; review is pending, so expect an unverified-developer warning during manual installation. Review the [source, release notes and checksums](https://github.com/mrdewclau/cropotter/releases/tag/claude-desktop-v0.1.2) and [data handling](https://github.com/mrdewclau/cropotter/blob/main/docs/claude-submission/privacy.md) before installing.

## Browser tools

Open [CropOtter](https://cropotter.com/) normally. Supported browsers may expose the registered tools to their agent. Tools share the visible app's current document, name, DPI, crop review and download state. They can load the synthetic sample, inspect/configure the current result, open human crop review and initiate downloads. Uploading customer PDFs continues through the visible picker/drop/link interface. Tools cannot acknowledge human review, return document bytes/barcode text or turn signed source URLs into tool output.

Native acceptance passed in Chromium 156 using its actual `document.modelContext` API: tool discovery through `getTools`, invocation through `executeTool`, synthetic sample conversion and a real PDF download. API-harness checks also verified PDF/PNG/ZIP downloads and the shared human-review gate. Other browser/agent clients and hosted attachment interfaces still require their own acceptance; unsupported browsers keep the ordinary upload and conversion UI. Download metadata uses page-local blob URLs that expire when the document is reset or replaced; these are not shareable hosted artifacts. Review must be completed in the visible UI before final downloads become available.

## Rebuild the distribution

From a Node 24+ source checkout:

```sh
npm ci --no-audit
npm run build --workspace packages/local
node tools/agent-distribution/build.mjs
```

The build packs the current local package without publishing to npm, embeds that exact tarball in the skill ZIP, and writes versioned artifacts, guide files and checksums into `apps/web/public/agents/`. These generated static files enter the normal website build and use existing hosting. Never include real labels, customer data or signed customer URLs in packages, demonstrations or screenshots.
