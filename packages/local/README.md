# CropOtter local

Local 4 × 6 inch shipping-label processing using the same engine as cropotter.com. Node.js 24+ and a supported `@napi-rs/canvas` native platform are required. Install dependencies from public npm; no API key, owner account, remote converter or recurring subscription is used. Processing stays local. Installation needs internet access for npm dependencies.

```sh
npm install --prefix ./cropotter-runtime ./cropotter-local-0.1.0.tgz
./cropotter-runtime/node_modules/.bin/cropotter analyze --input /absolute/source.pdf
./cropotter-runtime/node_modules/.bin/cropotter convert --input /absolute/source.pdf --out /absolute/new-output --formats pdf,png,zip --name 'My labels' --dpi 203
```

`--dpi` accepts 203 or 300. Output PDFs are portrait 288 × 432 points, with at least ⅛ inch white margins and preserved content proportions. PDFs contain fresh label pixels, removing cropped-away source objects. Shipping-label outputs carry no CropOtter branding.

stdout contains one JSON result. Exit 0 means the requested operation succeeded, exit 1 means an error, and exit 2 means conversion requires review. Analysis returns crop candidates, page dimensions and warnings; it omits raw barcode values and document text. Input paths and parser errors are not logged. Conversion returns intentional local output paths and checksums, and writes a versioned manifest next to the selected formats. A ZIP contains the PDF plus numbered PNGs even when only ZIP is requested. Existing files are never overwritten. Choose a new directory or name to retry.

Uncertain output is withheld until you inspect the crop and warnings and deliberately pass `--acknowledge-review`. If analysis cannot choose a label, supply `--selections /absolute/selections.json`. Acknowledgement does not invent missing page decisions. Manual selections always require acknowledgement, including when barcode validation passes. Acknowledgement permits output but does not turn warnings into verified barcode evidence or validate physical printing.

```json
[
  {"pageIndex": 0, "region": {"x": 36, "y": 90, "width": 288, "height": 432}, "rotation": 0},
  {"pageIndex": 1, "skip": true}
]
```

Page indexes are zero-based. Regions use top-left source-page viewport coordinates in PDF points (72 points/inch), after source-page rotation. `region` may be omitted to select the full page. Rotation accepts 0, 90, 180 or 270 degrees. Every nonblank page needs an explicit include/crop or skip decision. Inspect the analysis dimensions rather than guessing coordinates. Selections are a JSON array, bounded to 100 entries / 128 KiB.

Only local regular-file inputs are accepted; no URLs, HTTP listener, machine scan or command execution is exposed. Symlink files and symlink path components are rejected. On macOS, `/tmp` and `/var` are symlink aliases: resolve the path with `realpath` first, or choose a canonical directory. Input is limited to 25 MiB, 50 pages and the engine's render/label budgets. Generated content is bounded to 64 MiB per job. Jobs within one MCP process run serially; Ctrl-C/SIGTERM and MCP request cancellation abort work. Temporary output files are removed on handled failures/cancellation; abrupt process or machine termination may leave private `.cropotter-*.tmp` files. Writes use exclusive temporary files and no-clobber publication. Keep the chosen directories private and stable while processing.

## MCP

Launch the installed `cropotter-mcp` binary with stdio transport. For a host that accepts an MCP JSON configuration:

```json
{
  "mcpServers": {
    "cropotter": {
      "command": "/absolute/cropotter-runtime/node_modules/.bin/cropotter-mcp",
      "args": []
    }
  }
}
```

Host configuration paths differ. The server uses official `@modelcontextprotocol/server` 2.3.1 `serveStdio`, serving modern 2026-07-28 and legacy 2025-11-25 clients. Tests use the matching official client package over actual subprocess stdio.

| Tool | Arguments |
| --- | --- |
| `cropotter_analyze` | `input`: caller-chosen local PDF path |
| `cropotter_convert` | `input`, `out`, optional `formats` array (`pdf`, `png`, `zip`), `name`, `dpi`, `selections` array, `acknowledgeReview` boolean |

The process may read the local PDF you explicitly name and write files to the output directory you explicitly choose. Use your host's local filesystem permissions/approval controls. Only generated artifacts get `cropotter://artifacts/...` resource URIs; arbitrary local files and previous server instances' resources cannot be read. Resource contents are retained immutable in memory even if the local file changes. Total retained artifacts are bounded to 128 MiB per server; start a fresh process when reached. Individual resource reads are bounded to 6 MiB; larger files remain available at returned local paths. Resources disappear when the process exits. Local paths/resources do not guarantee an attachment button in every host: the agent must attach actual files using its host's supported interface. Hosted sandboxes and native application configuration require separate acceptance.

Build from source with `npm run build --workspace packages/local` from the repository root; the tarball includes bundled engine JavaScript and public npm dependencies, and does not depend on unpublished workspace packages or TypeScript execution.
