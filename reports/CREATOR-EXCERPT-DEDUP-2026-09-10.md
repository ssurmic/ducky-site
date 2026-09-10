# Reviewed creator excerpts: repeated display text · 2026-09-10

Status: deployed as dadfcc6c / Pages b66b1fc7; exact main CI and production assets verified. EN/ZH live acceptance follows below.

## Actual user path

On the Chinese production app (resource graph `075e5a5c7353c7ac3b4d`), Discover →
QCOM search result → information-map claim led directly to the matching creator,
video and timestamp. The focused video is `csGLgpoAvwk` by Parkev Tatevosian, CFA.
No follow/unfollow action was performed.

One MRVL excerpt displayed `Marvell已开始受益于AI数据中心需求，运营利润率上升。`
twice, as both the headline and explanation. These were identical text in one
source record, not two independent corroborating sources. In contrast, the QCOM
paragraph and its separate memory-price explanation contain different content.

## Change

The shared `creator-spans.js` renderer omits a reason only when its displayed
language text equals the displayed title after trimming and normalizing whitespace.
Distinct wording remains, including conditions and qualifications. Separate point
IDs, evidence excerpts, original timestamps, source links, records and API data are
unchanged. This display comparison does not run inference or alter historical data.

中文说明：同一已审核片段的标题和说明完全重复时只显示一次；不同理由、原文限定词、
历史记录和来源保持。不能把去重展示当作内容审核或来源数量的变化。

## Validation

- Relevant creator tests: 19 passed.
- Complete frontend suite: 643 passed, 0 failed (16.145 seconds).
- Build, copy lint and 1,274 internal-link checks passed.
- Live EN/ZH verification and exact release receipts will be appended after publication.

The QCOM temporal translation issue found during this walkthrough is a separate
upstream source correction. This UI change does not fix or approve that claim.


## Publication

PR #26 merged as `dadfcc6c0eb44d32a5b701a274ebe83401bff192`. Exact main CI
`34542001010` passed. Sync merges retained the separate compact-phone work and
its actual release notes; only Change Log conflicts required resolution.

Published with the existing authenticated Pages CLI after checking that the tested
commit was still main. Pages `b66b1fc7`; asset graph `55be9c3e18113ff996df`.
Production manifest, shared creator module, product CSS and both language app
entries match the tested build byte for byte. The immediately previous graph was
`e189f450e1fbbc112741` (compact phone release, Pages `d9110fac`).

English production browser, 23:28 UTC: 45 watchlist rows, List before Overview,
closing prices dated 9/10; current prices render before the shared analysis GET
completes. The analysis finished loading and retained its own date. One click on
Open QCOM research map opened the map; one claim click located its author/video.
The MRVL excerpt `claim:9d2700927dbc748f1e527803` has one paragraph. The separate
QCOM headline and reason still have two paragraphs, with original stated horizon,
publication date and YouTube 2:26 link. Source data were not corrected by this UI patch.

[Public asset hashes](creator-excerpt-dedup-20260910/assets-after.json).


Chinese production browser, 23:29:38 UTC: the same MRVL point displays its Chinese
paragraph once. The QCOM note and distinct reason remain two paragraphs; its
`not until 2027.` horizon, 2:26 original video link and map deep link remain.
Both language entries loaded `55be9c3e18113ff996df/main.js`. Desktop has no page
horizontal overflow. The existing QCOM temporal error is explicitly still unresolved;
no source-correction success is claimed.
