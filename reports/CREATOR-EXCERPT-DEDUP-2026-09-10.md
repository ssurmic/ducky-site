# Reviewed creator excerpts: repeated display text · 2026-09-10

Status: local verification complete; publication and live acceptance pending.

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
