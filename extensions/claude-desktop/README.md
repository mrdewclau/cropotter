# CropOtter for Claude Desktop

Turn shipping-label PDFs into portrait 4 × 6 PDF, PNG and ZIP files on your Mac. Requires macOS 13.5 or newer. The self-contained `.mcpb` includes Node and production dependencies for Apple Silicon and Intel. No terminal, separate Node installation, CropOtter account or API key is required. The initial install is a download; conversion itself requires no network connection. Your Claude plan and ordinary download/data costs are separate.

## Install

Open Claude Desktop → Settings → Extensions → Advanced settings → Install Extension. Select the CropOtter `.mcpb`, review its permissions and choose a private **Label workspace** folder. Enable the extension. You can also open the `.mcpb` with Claude Desktop where file association is supported. Until directory approval, this is a manually installed extension, not an Anthropic-reviewed listing.

Save a PDF in that workspace and ask:

> Use CropOtter to analyze the shipping-label PDF at `/absolute/path/to/Label workspace/label.pdf`. Convert it to 4 × 6 PDF and PNG, name it Order 204, and put the results in a new Order 204 folder inside my workspace. If review is required, show me the warnings and wait for my crop decisions.

Supply an actual path. Attaching a PDF in chat does not guarantee that the local MCP server can access it; save the attachment to the selected folder first. Generated local paths and MCP resources are available to Claude, but attachment/download presentation depends on the client. CropOtter never invents public download URLs.

## Output and limits

| Property | Behavior |
| --- | --- |
| Output | Portrait 288 × 432 pt PDF; PNG at 203 or 300 DPI; optional ZIP. At least ⅛ inch white margins, preserved proportions and no branding. |
| Review | Uncertain/manual crops are withheld until deliberate human review and explicit acknowledgement. Never automatically approve a crop. |
| Access | Inputs and outputs must stay inside the configured workspace. Symlink paths and overwriting files are rejected. Keep the workspace private and stable while processing. |
| Data | CropOtter makes no network requests, collects no telemetry and uses no account, URL fetch, HTTP listener or remote converter. Claude receives tool results and requested generated artifact resources; its use of that data follows Anthropic's policies. Only artifacts from the current process are readable as MCP resources. |
| Bounds | Input up to 25 MiB, output up to 64 MiB, retained MCP artifacts up to 128 MiB. Resource reads up to 6 MiB; larger output remains a local file. |
| Scope | macOS Apple Silicon and Intel bundle. See the verification record for actual architecture/host acceptance. Windows, Linux desktop, Claude web and mobile are not supported by this desktop bundle. |
| Updates | Manual bundles require reinstalling the new version. No background updater or runtime download. Security/runtime updates require a newly built bundle. |

## Remove

The workspace restriction is enforced by CropOtter's handlers, not an operating-system sandbox. Claude launches extensions with the current user's privileges. Keep normal tool approvals enabled and select a narrow, private workspace. The offline sandbox used by the verification script is a test condition, not a claimed runtime permission system.

Disable or uninstall CropOtter in Claude Desktop → Settings → Extensions. Existing output files remain in your workspace; remove them yourself when no longer needed. Restarting the MCP server clears its in-memory artifact resources. The extension creates no background service or login item.

## Source and support

Source and MIT license: [mrdewclau/cropotter](https://github.com/mrdewclau/cropotter). [Report an issue](https://github.com/mrdewclau/cropotter/issues) with a synthetic reproduction, never a real label, signed customer URL or private barcode/address. Bundled dependency and Node licenses are included. Build instructions and acceptance evidence: `docs/claude-distribution-2026-10-22.md` in the repository.
