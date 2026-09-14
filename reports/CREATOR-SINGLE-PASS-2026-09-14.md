# Creator single-pass presentation acceptance · 2026-09-14

Status: implemented and locally tested; not yet a deployment receipt. Frontend base revision:
`36b68db3`. This report covers presentation compatibility and tests; it does not certify live
source coverage, historical extraction completion, or provider availability.

## Behavior

The existing claim reader accepts two explicitly different forms: independently reviewed
claims and claims accepted by the server's source-validation checks after one extraction.
The latter requires the current receipt shape, version and matching source identity. The
browser does not recompute server-owned content hashes or invent a review verdict.

The complete-summary reader and the public preview share one acceptance predicate. A valid
claim cannot promote a missing or incomplete whole-summary receipt. Malformed receipts,
wrong source identity, withdrawals and pending states remain unreadable. Existing reviewed
content and original video timestamps retain their behavior.

The synthetic example contains a bullish CDNS claim with an original-video position of
91 seconds. Both languages retain the ticker and direction and expose the same `1:31` link
after expansion. The public preview continues to present attributed summaries, not invented
transcript quotations, account state or independently reviewed status.

## Automated gates

- Build plus JavaScript gate: **757 passed, zero failed or skipped**.
- Python suite: **22 collected; 21 passed, one skipped**.
- Copy and internal-link gates: passed.
- Focused receipt/navigation tests cover accepted single-pass content, matching source proof,
  missing and malformed proof, withdrawn/pending content, bilingual text, stock direction,
  unchanged reviewed history and original video positions.
- The pre-existing Today ordering test failed only during the first local hour after midnight:
  its `now - 1 hour` fixture belonged to yesterday and was correctly folded into older records.
  The unchanged test passed under UTC and failed under America/Los_Angeles at that time.
  The ordering case now uses local noon; a new 00:30 case verifies that the earlier NVDA
  publication remains accessible under older records while AMD remains in Today. All five
  Today tests passed in both time zones. No Today production logic was changed.

## Browser checks

Headless Chromium ran the actual application renderer against a local synthetic fixture.
Twelve cases combined English/Chinese, dark/light and these viewports:

- 320 × 650 and 393 × 650, mobile/touch emulation.
- 1440 × 900, desktop.

All cases passed: no page errors; no horizontal page or main-panel overflow; explicit CDNS
and bullish state; working collapse/expand; and the original-video link opened with `t=91`,
`target=_blank` and `noopener noreferrer`. The destination was intercepted with a local test
response, so this validates the generated address and click behavior without making a request
to the real video platform.

Measurements use the actual `.app-top`, `.app-nav` and `#main` elements. Desktop navigation is
a sidebar and is not incorrectly subtracted from vertical reading height.

| Language | Viewport width | Header height | Available reading height | Initial first claim top | First claim top after re-expansion | Visible claim cards after re-expansion |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chinese | 320 | 61 | 522 | 152 | 423 | 1 partial |
| Chinese | 393 | 61 | 522 | 189 | 296 | 1 partial |
| English | 320 | 61 | 522 | 92 | 297 | 1 partial |
| English | 393 | 61 | 522 | 130 | 297 | 1 partial |
| Chinese | 1440 | 62 | 838 | 427 | 427 | 1 complete |
| English | 1440 | 62 | 838 | 427 | 427 | 1 complete |

Numbers are CSS pixels, rounded to integers; dark and light measurements agree. Mobile bottom
navigation occupies 67 pixels. Initial positions reflect the exact-source route's existing
automatic focus. Re-expansion positions follow the user disclosure interaction and scrolling
the first claim heading into view. When collapsed, the summary stays available and detailed
claim cards are intentionally hidden.

Twenty-four viewport screenshots (collapsed and expanded) and `results.json` were saved to the
local acceptance artifact directory `/tmp/creator-single-pass-browser`. Chinese dark at 393px
and English light at 320px were visually inspected: ticker, green bullish text, attribution,
detail boundary and persistent navigation are readable. Full details extend below the mobile
viewport and require scrolling; this change does not redesign the existing detail layout.

## Limits and release boundary

- These are browser viewport and touch simulations. Physical phones and browser chrome were
  not tested; 650px is the simulated content viewport, not a claim about device screen space.
- The fixture proves rendering of accepted input, not live ingestion, source accuracy or
  production account access. No production mutation or provider call was needed.
- Current-source and withdrawal checks remain server-owned. The updated server must provide
  the explicit validation receipt on the affected projection; absent receipts remain closed.
- No layout, navigation, stock scoring or original source content was changed. Calendar data
  generated during the build was restored and is not part of this change.
