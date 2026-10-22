# The next clean cuts

| Stage                       | Outcome                                                                 | Status                                                          |
| --------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1. Website                  | Upload/drop a PDF or paste a link; format, adjust and download PDF/PNG  | Implemented and tested; DigitalOcean/GoDaddy deployment pending |
| 2. Chrome extension         | Capture a label from the browser and send it into the same engine       | Planned                                                         |
| 3. iOS app                  | Receive labels through file/share/link entry points, preview and export | Planned; iPhone priority, Android remains a goal                |
| 4. Windows/macOS apps       | Convenient local ingest and native printer access                       | Planned                                                         |
| 5. Streamlined direct print | Supported printer discovery, connection and validated label delivery    | Research/prototype required                                     |

The engine is shared across these clients. Keep cropping, output geometry, barcode validation and review decisions consistent. [Architecture and routes](proposed-pipeline.md) describe the longer-term pipeline, while [workflow diagrams](diagrams/README.md) show user entry points and print routes.

Accounts and shared queues should be designed when cross-device capture needs them. A database can hold a user's waiting jobs even when no app is open; a nearby device still needs to be available to execute a Bluetooth print job. The first website release keeps PDF processing local to the browser, with a transient server fetch for pasted links.

The MUNBYN ITPP130B is the priority research target. Validate SDK availability, iOS and Android transport, command encoding, print sizing and physical barcode scans before presenting direct printing as supported. [Research notes](munbyn-itpp130b-research.md) separate manufacturer capabilities from assumptions.
