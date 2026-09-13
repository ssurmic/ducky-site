# Homepage publication acceptance — 2026-09-13

Status: corrected implementation and local acceptance; exact PR/Pages receipts follow deployment.
This finishes existing PR #57 from the latest main in a fresh worktree. Only CHANGELOG conflicted;
all current app code and the latest notary data were retained. The original dirty checkout and
original feature worktree were not modified. The owner's September 13 request to deploy the local
UI update supersedes the older preview-wait note. Backend exporter changes are paired in PR #94.

## Content and provenance

The four-stock hero keeps complete source-bound creator statements and labels 13F changes as
context. The revoked Tom Nash Micron year claim is absent. Six showcase cases were checked through
the existing current source owner by exact creator/video, full bilingual title, ticker, stance,
source URL and publication time: Meet Kevin MU, TALK COIN, Parkev MRVL, Everything Money NVDA,
Shanghao AMD and Ticker Symbol: YOU NVDA. The older New Money Google sale case has no matching
current approved span, so its card is withheld and its roster entry remains. These are selected
examples whose later price direction matched the view, explicitly not a hit rate or ranking.

The private creator staging export is removed from public/. The manual generator now requires an
explicit external input and records its digest; it rejects public-repository paths and symlink
escapes. This is not automatic current-source validation: future curated updates still require
source-owner checks. No paid call, correction approval or price refresh was used for this release.

Map previews come from the September 8 workflow capture used in the published walkthrough poster.
The English NVIDIA point is a current source-bound Parkev claim (qleHy1oNdjU, 112.8–170.52 seconds).
Its caption now clarifies the announced agreement to acquire Hugging Face, and links the
[September 3 NVIDIA announcement](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/).
The Chinese map is AVGO; its alt text now identifies AVGO correctly. Creator excerpts come from
the same dated Intel walkthrough's source frame. Conditions and market context are app-module
renders using example records from scripts/demo/recording; they are not production screenshots.
The market context fixture retains its dated/reconstructed basis. All eight assets were visually
inspected for personal fields. The previous walkthrough remains unchanged.

Returns retain signal-session/first-publication-session closes, their stated 20-session or
available window and unadjusted-price basis. The GLW loss remains. The VRT description now matches
the recorded revenue-miss/supply-risk/EPS-beat/guidance facts rather than an invented judgment.

## Export and checks

The backend's read-only aggregate sample at 02:57:26 UTC has 34 creators, 732 YouTube videos,
3,261 tickers with archived records and 14,684 source-qualified records. Schema home-proof/1 and
archived_records scope travel with one dated UTC sample. Four exact nonnegative integers and
valid dates are required by the shared build/nightly validator. Failed or malformed exports
cannot overwrite the last-good file, and missing data cannot silently become zero.

Local npm test: 737 passed, zero failed. Python discovery: 22 run, 21 passed and one
skipped. Copy lint passed; 2,000 internal links passed with zero planned-page warnings. JS regressions also exercise tab keyboard/focus behavior and
prohibit homepage fetches. Python regressions exercise actual atomic replacement and private
input boundaries. An independent review found no remaining JS, release or public-data blockers.

## Browser acceptance and practical limits

Actual Chrome checks, not physical devices: desktop 1728×902, English 390×650 and Chinese
320×600. Both mobile widths equal the document scroll width; no horizontal overflow. Signal
tabs and source links measure at least 44px. NVDA→MU click updates only the selected panel;
ArrowRight selects AMD and retains tab focus. Product preview switching works. Chinese mobile
menu fits between y=63 and494 at320×600; Escape closes it and returns focus to its trigger.
Percentages and attributed summaries are not broken by numeric glossary substitutions.

The homepage is an introduction: at390×650 its first signal card begins around y=767, and at
320×600 around y=759, so zero signal rows are visible before scrolling. The header takes65px;
the remaining first screen shows the introduction and signup/example actions. These observations
do not claim an app dashboard density improvement. Screenshots were inspected in the task.
Dark appearance was inspected directly; light appearance and physical-device testing are not
claimed here. Logged-in app functionality is covered by its retained tests; the production
browser reached sign-in after the backend release, so authenticated Today delivery is not
certified by this homepage acceptance.

## Release receipt

Pending exact-head CI, merge and Pages publication. Previous live UI: c0d27904, Pages8aaa50a6;
latest pre-release main5474140c is the notary record. Use the existing source-verified deployment
script and retain both receipts for rollback. No runner activation or video recut belongs here.
