# CropOtter desktop extension data handling

Effective 2026-10-22. This statement applies to the local Claude Desktop extension, not to Anthropic's service or third-party integrations.

| Question | Answer |
| --- | --- |
| What does it read? | The explicitly requested regular-file PDF inside the configured workspace, up to 25 MiB, and its bundled engine assets. It does not scan the computer or fetch document URLs. |
| What does it create? | PDF/PNG/ZIP files and a JSON output manifest in a requested folder inside that workspace. Existing filenames and symlink paths are rejected. |
| Is data sent to CropOtter? | No. The extension makes no network requests and operates with network access denied in acceptance tests. No CropOtter account, telemetry endpoint, hosted converter or storage service is used. |
| What does Claude receive? | Crop analysis, warnings, conversion status, local output paths and generated-artifact metadata. If Claude requests an output resource, the generated artifact bytes are returned to Claude. Anthropic's terms and privacy/data controls govern how Claude processes tool data and attachments. This is not a promise that using Claude keeps all data off Anthropic's infrastructure. |
| Does analysis expose barcode/address text? | Tool analysis deliberately omits raw barcode values and extracted document text. Generated labels still contain the information needed for shipping; users must treat them as potentially sensitive. |
| How long is data kept? | No CropOtter server retention. Generated resources are held in process memory, bounded to 128 MiB, and clear when that process ends. Local input/output files remain under the user's control. Claude's conversation retention is separate. |
| File write behavior | Completed files publish atomically where hard links are supported. ExFAT uses exclusive creation without overwriting; files can be visible during writing. Handled failures/cancellation clean current-job output. Abrupt process/machine termination may leave temporary or partial output that the user can inspect/remove. |
| Runtime privileges | The selected-workspace boundary is application-level validation. Desktop extensions run with the current user's OS privileges; CropOtter does not claim an OS sandbox or change the host's security settings. |
| Paid services | None used by the converter. Existing Claude usage and download/data costs remain separate. |
| Removal | Uninstall through Claude Desktop settings. User-created PDFs/outputs are not deleted automatically. No background service, account or login item remains. |
| Contact | https://github.com/mrdewclau/cropotter/issues; report using synthetic files, never real addresses, barcodes or signed URLs. |

The skill tested inside Claude web runs in Anthropic's hosted sandbox, so uploaded source PDFs are already handled by Anthropic. That is a separate execution route and should not be described as local-to-the-user's-Mac processing.
