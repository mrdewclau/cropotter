# CropOtter ChatGPT plugin data handling

CropOtter is an independent open-source shipping-label formatter. This skills-only plugin runs the packaged engine in the execution environment available to the caller's ChatGPT task. A cloud ChatGPT task processes attachments in that cloud environment; local work processes the selected local files. This is not a promise that files remain on the person's computer.

The plugin has no CropOtter account, analytics, remote conversion endpoint or document database. It reads explicitly supplied PDF files and creates requested output files plus a manifest. It does not send label contents to CropOtter. First use may download public dependencies from npm; the installer does not upload customer PDF contents to npm. Task execution, uploaded files, generated outputs, account settings and retention remain subject to the caller's ChatGPT/OpenAI policies and environment permissions.

Uncertain crop/page choices require deliberate review before final files are generated. Outputs use safe filenames and contain visible label pixels, without CropOtter branding. Files a person chooses to download or share remain their responsibility. Source and support: https://github.com/mrdewclau/cropotter.

This is a prepared integration's data statement, not an assertion of public-directory approval or actual host acceptance. Actual verified platforms and limitations are recorded in the release's acceptance notes.
