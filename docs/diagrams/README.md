# crop/ship workflow diagrams

Proposed workflow as discussed with the user. Direct ITPP130B printing still requires hardware validation.

Rendered files: [workflow PNG](workflow.png), [workflow SVG](workflow.svg), [printer routes PNG](print-routes.png), [printer routes SVG](print-routes.svg). Editable Mermaid originals: [workflow](workflow.mmd), [printer routes](print-routes.mmd).

User experience: [user journey PNG](user-journey.png), [user journey SVG](user-journey.svg), [editable Mermaid source](user-journey.mmd). This view follows the user's actions and visible results: bring a label, send it to crop/ship, print now or save to My Labels, then peel, stick, and ship. It includes the optional auto-print path and picking up a saved label on another device.

## Ingest to a printed label

```mermaid
flowchart TD
    subgraph intake ["1. Ingest on any device"]
        chromeInput["Chrome extension: current URL or PDF"]
        desktopInput["Desktop app: PDF or URL"]
        iphoneInput["iPhone: Files, share, or URL"]
        androidInput["Android: Files, share, or URL"]
        webInput["Web app: PDF or URL"]
    end
    chromeInput --> loadPdf
    desktopInput --> loadPdf
    iphoneInput --> loadPdf
    androidInput --> loadPdf
    webInput --> loadPdf
    subgraph engine ["2. Shared local engine"]
        loadPdf["Load and validate PDF"]
        detectLabel["Detect label and orientation"]
        cropLabel["Fit 4 x 6; white 1/8-inch margins"]
        qualityCheck{"Quality checks pass?"}
        reviewCrop["Review crop or source"]
        readyLabel["Prepared 4 x 6 label"]
        loadPdf --> detectLabel
        detectLabel --> cropLabel
        cropLabel --> qualityCheck
        qualityCheck -->|"Yes"| readyLabel
        qualityCheck -->|"Needs review"| reviewCrop
        reviewCrop -->|"Adjust or replace"| loadPdf
    end
    readyLabel --> actionChoice{"3. Choose action"}
    actionChoice -->|"Print now or auto-print"| printDispatch["Print on selected device"]
    actionChoice -->|"Save on this device"| localQueue["Local queue"]
    actionChoice -->|"Sync to account"| cloudQueue["Shared account queue"]
    actionChoice -->|"Export"| fileExport["Download PDF, PNG, JPG"]
    localQueue -->|"Print when requested"| printDispatch
    cloudQueue -->|"Available across devices"| queueView["Choose label on phone or computer"]
    queueView -->|"Print when requested"| reserveJob["Reserve job for one device"]
    reserveJob --> printDispatch
    printDispatch --> connectPrinter["Connect selected printer"]
    connectPrinter --> devicePrint["Device sends via Bluetooth or USB"]
    devicePrint --> munbyn["MUNBYN ITPP130B"]
    munbyn --> paperLabel(["Printed shipping label"])
    style intake fill:#C2E5FF,stroke:#3DADFF
    style engine fill:#C6FAF6,stroke:#5AD8CC
    style cloudQueue fill:#DCCCFF,stroke:#874FFF
    style localQueue fill:#FFECBD,stroke:#FFC943
    style reviewCrop fill:#FFE0C2,stroke:#FF9E42
    style paperLabel fill:#CDF4D3,stroke:#66D575
```

## Device-specific printing routes

```mermaid
flowchart TD
    preparedLabel["Prepared 4 x 6 label"]
    preparedLabel --> printDevice{"Choose printing device"}
    printDevice -->|"iPhone or Android"| nativeApp["Native phone app"]
    nativeApp --> nativeEncode["203 DPI bitmap and printer commands"]
    nativeEncode --> nativeBluetooth["Native Bluetooth adapter"]
    printDevice -->|"Compatible Chrome or extension tab"| browserApp["Browser print session"]
    browserApp --> browserEncode["203 DPI bitmap and printer commands"]
    browserEncode --> webBluetooth["Web Bluetooth adapter"]
    printDevice -->|"Windows or macOS"| desktopWorker["Desktop background print worker"]
    desktopWorker --> printPage["4 x 6 page at actual size"]
    printPage --> vendorDriver["Installed MUNBYN driver"]
    vendorDriver -->|"Windows"| windowsPort["Bluetooth or USB"]
    vendorDriver -->|"macOS"| macPort["USB"]
    nativeBluetooth --> printer["MUNBYN ITPP130B"]
    webBluetooth --> printer
    windowsPort --> printer
    macPort --> printer
    printer --> physicalLabel(["Printed label"])
    style nativeApp fill:#C2E5FF,stroke:#3DADFF
    style browserApp fill:#C2E5FF,stroke:#3DADFF
    style desktopWorker fill:#C2E5FF,stroke:#3DADFF
    style physicalLabel fill:#CDF4D3,stroke:#66D575
```

## Reading the routes

- The cropping engine runs on the device that ingests the PDF or URL. Each shell shares the same engine; the diagram does not introduce a hosted conversion service.
- A prepared label is exactly 4 × 6 inches with at least 1/8 inch of white margin on every side. Ambiguous crops and poor source quality require review.
- Print now uses the current selected device. Auto-print is an explicit preference established after printer setup.
- A local queue stays on one device. The shared account queue syncs prepared PDF files and job metadata across signed-in devices. Files belong in account file storage; the database tracks their references, ownership, and job status.
- The cloud queue persists when all apps are closed. A shared job is reserved by one device before dispatch to limit accidental duplicate printing.
- The device printing needs access to the selected printer. The cloud queue does not itself have a Bluetooth connection.
- A desktop print worker can run with its window closed. Native phone background printing is a target subject to OS scheduling, permissions, printer availability, and hardware validation; keeping the phone app on screen is not an absolute architectural requirement. When execution is unavailable, the job remains queued.
- The browser route requires compatible Chrome, an active print context, and initial device permission. iPhone printing uses the native app. Desktop Chrome on Mac is distinct from the vendor's macOS USB-driver route.
- BLE routes use a calibrated raster and verified printer commands. Normal OS driver printing uses an exact-size rendered page through the installed vendor driver.
- The printed-label node represents the physical result. Successful software submission or BLE writes alone do not confirm that result. Uncertain sends pause for review and are not automatically replayed.

## Common journeys

1. Chrome extension → engine → direct browser Bluetooth → printer.
2. Chrome extension → engine → shared queue → iPhone or Android app → native Bluetooth → printer.
3. Desktop app → engine → vendor driver → Windows Bluetooth/USB or macOS USB → printer.
4. Phone app → engine → local or shared queue → print later from an available device.
5. Any ingest surface → engine → download cropped PDF, PNG, or JPG.

