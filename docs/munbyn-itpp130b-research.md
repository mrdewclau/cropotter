# MUNBYN ITPP130B: direct-print feasibility

Researched 2026-10-21. Scope: replace the export → vendor-app → print handoff with crop/ship's own ingest → crop → print workflow. The user wants both phone platforms, with iPhone prioritized, and confirmed a white 1/8-inch margin on all four sides. This is research and a revised architecture, not a hardware test.

## Findings from primary sources

| Finding | Evidence | Consequence for crop/ship |
| --- | --- | --- |
| ITPP130B is a 203 DPI Bluetooth/USB thermal printer. | [MUNBYN model page](https://munbyn.com/products/bluetooth-thermal-label-printer-p130b) and [official manual listing](https://support.munbyn.com/hc/en-us/articles/6092544741651-Printer-User-Manuals). The linked June 2026 v4 manual, specifications on printed p.19 / PDF p.22, was downloaded and visually inspected. | Use a 203 DPI device profile; retain 300 DPI as a separate export option. |
| The documented phone setup uses MUNBYN Print to discover and connect to a device and import a PDF. | [MUNBYN phone setup](https://support.munbyn.com/hc/en-us/articles/29278403182355--Bluetooth-models-How-to-connect-the-device-on-the-Phone). | This documents their supported consumer workflow; it does not establish that other native apps are technically prohibited. |
| Windows also has a Bluetooth driver. The same article directs Mac users to USB and excludes Windows ARM from this Bluetooth driver. | [MUNBYN Windows Bluetooth setup](https://support.munbyn.com/hc/en-us/articles/29853243695891--Bluetooth-connection-method-How-to-connect-to-the-ITPP130B-printer-using-Bluetooth-on-Windows). | Desktop printing can use an installed system queue; distinguish Windows architecture and Mac USB support. |
| MUNBYN documents ITPP130B Bluetooth printing from its Chrome web editor, including Mac/Chromebook pairing notes. | [MUNBYN web Bluetooth instructions](https://support.munbyn.com/hc/en-us/articles/36222746030867-How-to-Print-with-a-Bluetooth-Printer-Using-the-Munbyn-Editor). | Browser-to-printer communication is demonstrated by the manufacturer; investigate a crop/ship Web Bluetooth adapter. |
| The public driver/SDK table lists Windows, Mac, and a Chrome extension for this model, but no ITPP130B-specific mobile SDK entry. | [MUNBYN downloads](https://support.munbyn.com/hc/en-us/articles/6092502480787-Printer-Drivers-SDK-Download). | SDK availability remains unconfirmed. Downloads for receipt printers or other models must not be treated as a compatible label-printer SDK. |
| Chrome supports website BLE connections on computers and Android, but not iPhone/iPad. | [Google Chrome Bluetooth help](https://support.google.com/chrome/answer/6362090?hl=en). | Prioritize a native iOS shell for iPhone. Android can have both native and Chrome routes. |
| Web Bluetooth requires a secure context and a user gesture for the initial chooser. | [Chrome Web Bluetooth documentation](https://developer.chrome.com/docs/capabilities/bluetooth). | First connection requires interaction. Subsequent reconnect/auto-print is conditional on retained permission and device availability. |
| Apple's native framework and Android's platform APIs support BLE device communication. | [Apple Core Bluetooth](https://developer.apple.com/documentation/corebluetooth), also read through its linked Markdown version; [Android BLE overview](https://developer.android.com/develop/connectivity/bluetooth/ble/ble-overview). | Native mobile transports are feasible platform choices; printer command compatibility still needs its own proof. |
| Electron can enumerate installed queues and submit to a named printer with silent settings. | [Electron API](https://www.electronjs.org/docs/latest/api/web-contents#contentsprintoptions-callback), verified against the [current official source documentation](https://github.com/electron/electron/blob/main/docs/api/web-contents.md). | After driver setup and explicit selection, the desktop app can target that queue without a per-label dialog. Physical scaling must still be checked. |

The current manual is linked at [ITPP130B manual v4](https://u.pcloud.link/publink/show?code=XZ5I7yJZ0CJXXmp58IBhw4mDvbTBNmEjTSKy). Its contents also cover the phone app, Chrome editor, Mac installation, and Windows Bluetooth installation. Older manuals describing phone-only Bluetooth should not override the newer model-specific setup instructions.

## Protocol evidence and uncertainty

The publicly served [MUNBYN editor](https://editor.munbyn.com/) was inspected without signing in or connecting to a device. Its delivered application bundle `app.e3efa380.js` uses `navigator.bluetooth` and maps ITPP130B to an ISSC-style service beginning `49535343-fe7d…`, with separate notify/write characteristics. This corroborates BLE feasibility. It is not a published SDK contract, compatibility guarantee, or license to redistribute vendor code.

Two original open-source implementations provide additional leads:

- [sebadel/itpp130b-ble](https://github.com/sebadel/itpp130b-ble) publishes a Linux BLE/CUPS implementation using TSPL raster commands, an FFF2 write characteristic, and an ISSC alternative. The author notes intermittent discovery, extra feed on some firmware, and unreliable physical completion acknowledgement. Reviewed master tree: `2da3089a2d01b9486b93ae2716118c75ef63042e`.
- [cmyker/munbyn-itpp130b-macos](https://github.com/cmyker/munbyn-itpp130b-macos) reports physical printing on one unit but explicitly labels the bridge experimental. Its [protocol notes](https://github.com/cmyker/munbyn-itpp130b-macos/blob/main/docs/protocol.md) describe a different observed profile, calibration questions, and transmission uncertainty.

These are primary accounts by their implementers, not manufacturer certification. Neither was installed, run, or adopted as a dependency. The differing observed profiles make actual-device discovery and a firmware/profile compatibility record necessary. BLE service discovery alone does not establish the accepted printer command language.

No manufacturer-hosted ITPP130B mobile SDK or complete BLE protocol reference was located in this review. That is a search limitation, not proof that none exists. A future developer enquiry should request model/firmware support, command encoding, GATT profiles, raster limits, flow control, status acknowledgement, and redistribution terms. No enquiry was sent.

## Recommended change to the plan

Retain one local crop/export engine. Add a printer profile and encoder, then separate browser BLE, iOS native BLE, Android native BLE, and desktop system-queue adapters. Use a thin mobile shell so a phone can select its printer and perform the whole flow inside crop/ship. iOS is the first phone acceptance target; Android remains required.

After initial setup, an intentional import may automatically print when detection is unambiguous and the saved device is available. Keep the foreground app/tab alive through sending. Unsupported browser environments still offer exports or system printing, clearly distinguished from a direct Bluetooth route. The native iOS route avoids depending on a special browser or another vendor's printing app.

Use the exact 4 × 6 PDF as the geometry master. Produce a verified one-bit raster and model commands for raw BLE rather than sending a PDF/JPG to a writable characteristic. Keep 4 × 6 inch and 100 × 150 mm media distinct. Preserve white margins in the image, add no second margin at the spooler, and measure the real result.

Hardware evidence is the next substantive gate: verify one calibration label, shipping barcode readability, repeated labels, transport handoff, and interrupted transfer behavior on the actual ITPP130B. Report submitted separately from physically printed; never replay a possibly transmitted label automatically. This addresses the reliability needed for the user's all-in-one requirement without pretending that a completed Bluetooth write proves paper output.

The full revised scope, output contract, delivery sequence, and acceptance matrix are in [proposed-pipeline.md](proposed-pipeline.md).
