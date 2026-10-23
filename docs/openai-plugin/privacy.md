# CropOtter ChatGPT plugin data handling

CropOtter is an independent open-source shipping-label formatter published by James Boyd. This skills-only plugin runs the packaged engine in the execution environment available to the caller's ChatGPT task. A cloud ChatGPT task processes attachments in that cloud environment; local work processes the selected local files. This is not a promise that files remain on the person's computer.

The plugin has no CropOtter account, analytics, remote conversion endpoint or document database. It reads explicitly supplied PDF files and creates requested output files plus a manifest. It does not send label contents to CropOtter. First use may download public dependencies from npm; the installer does not upload customer PDF contents to npm. Task execution, uploaded files, generated outputs, account settings and retention remain subject to the caller's ChatGPT/OpenAI policies and environment permissions.

Uncertain crop/page choices require deliberate review before final files are generated. Outputs use safe filenames and contain visible label pixels, without CropOtter branding. Files a person chooses to download or share remain their responsibility. Source and support: https://github.com/mrdewclau/cropotter.

CropOtter does not maintain a central label archive or customer account to delete. Delete generated local files through your file system or task workspace; manage chats, attachments and retention through your host's controls and policies. Website, download and dependency providers handle their own technical request data under their policies. The plugin does not upload PDF contents to those distribution services.

For support or privacy questions, use [CropOtter's GitHub issues](https://github.com/mrdewclau/cropotter/issues). Do not post real labels, addresses, signed links or private documents in public issues; use synthetic examples. Actual verified platforms and limitations are recorded in the release's acceptance notes. This policy does not imply OpenAI directory approval.
