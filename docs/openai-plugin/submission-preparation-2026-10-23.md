# OpenAI directory preparation — 2026-10-23

CropOtter 0.1.1 is a prepared skills-only submission candidate. The website continues offering the independently tested 0.1.0 preview. Preparation and private installation do not mean OpenAI has reviewed or approved CropOtter. No directory submission or legal attestation has been made. Download the [published candidate ZIP and checksum](https://github.com/mrdewclau/cropotter/releases/tag/chatgpt-plugin-v0.1.1).

## Owner-confirmed listing facts

| Field           | Prepared value                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Publisher       | James Boyd, individual; existing individual identity selected and accepted in the portal; saved listing displays James Boyd |
| Countries       | All countries OpenAI permits; explicit empty country restriction array                                                      |
| Commerce        | Free, no payments, purchases or checkout                                                                                    |
| Category        | Productivity                                                                                                                |
| Name / identity | CropOtter / stable `cropotter` plugin name                                                                                  |
| Starter prompts | Existing two starters preserved verbatim and in order                                                                       |
| Website         | https://cropotter.com/agents/#chatgpt                                                                                       |
| Support         | https://github.com/mrdewclau/cropotter/issues                                                                               |
| Privacy         | https://github.com/mrdewclau/cropotter/blob/main/docs/openai-plugin/privacy.md                                              |
| Terms           | https://github.com/mrdewclau/cropotter/blob/main/docs/openai-plugin/terms.md                                                |

The terms document explains the existing MIT software license and output responsibilities; it introduces no paid service agreement. Privacy describes processing in the caller's execution environment, host policies and public-support precautions. No CropOtter account, conversion storage, telemetry endpoint, OAuth, remote MCP worker or owner model API billing was added. The caller's ChatGPT plan/runtime and dependency access remain separate requirements.

## Candidate identity and verification

| Item                        | Result                                                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ZIP                         | `cropotter-chatgpt-0.1.1.zip`, 117,228 bytes, 15 entries                                                                                                 |
| ZIP SHA-256                 | `ce39baefd95c08c597fef6664037a43f6f28dfb9a67a180e774b13b41788eb9e`                                                                                       |
| Owned listing/composer icon | 512 × 512 PNG, 9,121 bytes; approved Mailroom Stamp vector rendered at source colors; light/dark proof inspected                                         |
| Icon SHA-256                | `a3472d8844840ec7299e6a416654909a0cbc0d62c389c6b7ab9ffae421de62ac`                                                                                       |
| Packaged runtime            | Local CLI 0.1.2, shared engine 0.1.0; all six engine package file payloads identical to tested public 0.1.0 plugin                                       |
| Packaging difference        | Engine tar permission metadata differs between filesystems; the tarballs themselves are not byte-identical                                               |
| Content                     | Root manifest, skill, scripts, references, synthetic sample, engine archive and checksum metadata, owned PNG, README, MIT license, privacy and terms     |
| Exclusions                  | No secrets, installed dependencies, hooks, remote MCP config, customer labels, `.app.json` or hidden compatibility app binding                           |
| Local gate                  | Build, conversion/review-gating tests and final-ZIP validator passed; invalid binding, missing policy, fake PNG and changed engine checksum are rejected |
| Independent source review   | No important findings in source, metadata, final archive or shell screenshots                                                                            |
| Host acceptance             | Real desktop Work test plus two actual ChatGPT web cases; see linked acceptance records                                                                  |

Run `npm run build:chatgpt-plugin`, `npm run test:chatgpt-plugin` and `npm run verify:chatgpt-submission` from Node 24+. The final validator checks this project's archive contract; it is not an OpenAI security scan or approval.

## Reviewer materials and remaining portal steps

Five review prompts are included: bundled sample at 300 DPI; attached PDF at 203 DPI; analyze/review before conversion; unsupported Bluetooth direct printing; and a broad whole-computer scan request. The first two conversion paths have real host evidence, including a verified direct original-PDF alias after a ChatGPT PDF preview download returned a different host rendition. Negative prompts and the complete public-review evaluation have not been run inside the directory. Engine tests cover withholding uncertain output and deliberate review acknowledgement.

This skills-only package has no MCP server, tool test cases, account credentials or reviewer connection to configure. The current official submission workflow does not require an MCP demo recording for this package type. Private plugin access is not required for reviewers to use the portable archive and bundled synthetic example.

Open the [OpenAI submission portal](https://platform.openai.com/plugins) with an eligible organization/project and owner or Apps Management Write access. The owner must complete individual identity verification where requested, upload the final ZIP, let required scans complete, review the actual listing, and personally complete any accuracy, policy or legal attestations. Submit for review only when authorized; publication is a separate step after approval. No API billing or paid infrastructure is required by this conversion design.

Sources checked for this preparation: [OpenAI plugin submission](https://developers.openai.com/plugins/deploy/submission), [plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines) and [ChatGPT plugin usage](https://learn.chatgpt.com/docs/plugins). The portal was inspected read-only and redirected to a separate OpenAI Platform sign-in screen; signing into ChatGPT did not sign into this portal. Continuing the normal sign-in reached a Cloudflare human-verification checkbox. After the owner completed it and signed in, the exact 0.1.1 ZIP was uploaded as a draft under the existing individual identity. The saved developer name remains James Boyd. The live eligibility blocker and pending scan are recorded below. Portal availability and account eligibility can change.

## Published preparation checkpoint

All four final public listing URLs were checked by response and actual content after source publication and site deployment. The live download and complete six-artifact manifest matched their declared hashes. GitHub confirms the published 0.1.1 prerelease asset is 117,228 bytes with the candidate hash above; the tested 0.1.0 asset was preserved. Full Linux CI passed 128 browser tests with 12 expected skips; focused live Chromium/iPhone acceptance passed 16/16. These checks complete source/package preparation, not OpenAI account eligibility or review.

## Actual portal draft and blocking eligibility result

After the owner completed Platform sign-in, the existing individual developer identity was accepted for the exact candidate ZIP. The portal saved version 0.1.1 as Draft, with CropOtter / James Boyd / Productivity and all four expected policy/support URLs. No MCP components are included. Metadata checks finished and reported one blocking finding: **“We are not accepting more skills-only submissions at this time.”** This is an observed eligibility restriction, not an engine test failure or a request to buy API credits.

The draft is not submitted, reviewed, approved or published. The skill scan was still Checking (0 of 1) at this checkpoint; no clean security-scan result is claimed. No legal/policy attestations were accepted, no review was submitted and no billing was added. The earlier instructions about owner attestations apply only if the eligibility block is resolved. The current [public guidelines](https://developers.openai.com/plugins/plugin-guidelines) say skills-only plugins can face additional Directory eligibility requirements; the actual dashboard supplies the specific blocking message above.

The working website download/private import remains available. A different implementation or submission route would require deliberate product work and its own acceptance; this candidate's manifest was not misrepresented to evade the restriction.
