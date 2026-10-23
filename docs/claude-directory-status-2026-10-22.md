# Claude Desktop directory submission — 2026-10-22

| Item | Recorded status |
| --- | --- |
| Submission | Submitted through Anthropic’s official MCPB Desktop Extensions Submission Form; confirmation says “Your response has been recorded.” |
| Release | CropOtter 0.1.2, macOS 13.5+, Apple Silicon and Intel runtime included |
| Uploaded installer | `cropotter-0.1.2-macos-universal.mcpb`, 122,334,239 bytes |
| SHA-256 | `fcda3cd27798d0637358d420d21f0f99561518039846d05195be1338738cc3b1` |
| Owner authorization | Explicit approval to use the submission contact/account identity, upload the installer, accept directory terms and submit |
| Reviewer materials | Public source, actual-host acceptance, CI evidence, synthetic sample/reviewer cases, three example prompts, privacy/support links and signing-verification question supplied |
| Current trust status | Submitted; not approved, listed, signed or certified safe by Anthropic |
| Cost | No signing certificate purchased, service created or new monthly subscription added |

Private contact information, the response-edit token and screenshots remain outside source under ignored `output/claude-release/`. The confirmation screenshot is `claude-directory-submitted.png`. No email receipt or review response is claimed as independently received.

## Verification and the installation warning

Anthropic describes directory tools as reviewed and conducts initial/ongoing security and compatibility review. Inclusion is discretionary; the form gives no guaranteed response time. The next check is an actual installation from the official directory after acceptance. We cannot promise every permission disclosure disappears. [Installation guide](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop), [directory policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy).

MCPB supports certificate signing for publisher identity and artifact integrity. Its documentation recommends CA-issued production certificates; self-signed development certificates still produce a warning. Signing does not prove software safe or create an OS sandbox. [Official signing documentation](https://github.com/modelcontextprotocol/mcpb/blob/main/CLI.md).

Upstream open issues [#277](https://github.com/modelcontextprotocol/mcpb/issues/277) and [#278](https://github.com/modelcontextprotocol/mcpb/issues/278) report signature-verification and signed-archive installation problems in MCPB 2.1.2. These are upstream reports, not a claim that we tested a CA-signed CropOtter bundle. We submitted the unchanged, unsigned installer that passed actual-host acceptance, and asked Anthropic which publisher verification/signing route they require.

The workspace restriction remains application-level validation; the native process runs with the current user’s OS privileges. See [data handling](claude-submission/privacy.md). The owner explicitly approved the directory agreement after review of the linked [current terms](https://support.claude.com/en/articles/13145338-anthropic-software-directory-terms).
