# Listing copy

| Field | Copy |
| --- | --- |
| Name | CropOtter — Shipping Label Formatter |
| Description (50-word maximum) | Convert local shipping-label PDFs into portrait 4 × 6 PDF, PNG and ZIP files. CropOtter preserves label proportions and white margins, checks barcode readability, supports editable filenames and deliberate crop review, and processes files locally without a CropOtter account, API key or subscription. |
| Category suggestion | Files and documents / productivity |
| Setup | Install the macOS extension, choose a private Label workspace folder, save your PDF there and ask Claude to analyze and convert it. |
| Example request | Use CropOtter to analyze my label PDF, make a 4 × 6 PDF and 300 DPI PNG named Order 204, and save them in a new folder inside my label workspace. Wait for me if crop review is required. |
| Platform | Claude Desktop on macOS 13.5+, Apple Silicon and Intel runtime included. Intel execution tested through Rosetta; not physical Intel hardware. |
| Pricing | CropOtter is free and MIT licensed. No CropOtter account, API key or subscription. User's Claude plan and ordinary download/data costs remain separate. |
| Access | Local PDFs and output folders inside the chosen workspace; no arbitrary-file resource reader, network listener, machine scanning, URL fetch or direct printer access. |

The bundle includes its supported Node runtime and production dependencies. Installing requires no terminal commands. Analysis returns crop geometry and warnings without barcode values or document text. Conversion creates local files and generated artifact resources; Claude's ability to show attachments varies. The user must deliberately review uncertain/manual crops. The extension cannot guarantee printing/scanning on untested hardware.
