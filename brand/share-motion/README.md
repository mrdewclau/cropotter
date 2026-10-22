# CropOtter share motion

The seven-second silent loop shows a full-page synthetic shipping PDF being trimmed to a portrait 4 × 6 label. The title and domain stay still while orange crop corners close in, excess paper disappears, and the finished label holds for reading.

`CropOtter-Share.tsrct` is the portable editable native source. Paper, typography, barcode, label, crop corners, timing and phase captions remain editable; the exact existing stamp image and two brand font files are embedded. Font licenses are included under `Licenses/`.

`CropOtter-Share.mp4` is the web delivery: 1200 × 630, 7 seconds, 30 fps, H.264/yuv420p, no audio track, faststart, 203,584 bytes. The MP4 metadata was checked with ffprobe, and the top-level MP4 boxes place moov before mdat. This is a synthetic demonstration, not an actual valid shipping label.

The saved filmstrip was visually reviewed at 0, 1.5, 2.4, 3.2, 4.2, 5.8 and 6.7 seconds for the full-page, crop, finished hold and loop-reset states. Native output preserves clear headline hierarchy and portrait proportions. `Previews/Ready.png` shows the final hold.

Authored using public Tesseract 0.4.0 (d7ccb4bc). New document creation directly on this external filesystem returned OS error 45. Creation/import/render ran on internal scratch, then the same document was copied here and reopened successfully. Local authoring checkouts, action scripts and schema dumps are retained under the ignored `.tesseract-work/` folder. The portable `.tsrct` is the published editable source.

Animated preview behavior depends on the consuming messaging/social client and must be verified in the actual app; a working MP4 does not establish iMessage playback support.
