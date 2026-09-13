# Watchlist option/support consistency · 2026-09-13

Status: implemented and locally validated; production publication recorded separately.

The phone screenshot showed NVDA with a put-wall reference and no range, while COIN had a
20-day low and a range graphic. Both used the same renderer, but the optional range silently
changed its structure. Synthetic fixtures now cover these separate source combinations.

The common support layout presents price, reference type, distance and a labeled 20-day
closing-range slot. An unavailable range has explicit text and no chart/marker; missing price
never invents a marker. The detail card shares that behavior. Recorded values, source dates,
reference selection, sorting and network reads remain unchanged. Unknown/pending/empty option
records retain their own states.

The phone stylesheet restores the intended signal-column widths after desktop declarations;
scroll padding accounts for the selectable fixed stock column. Reference/expiry copy can wrap
without the old generic two-line clamp. All selectors are scoped to watchlist signal elements.

Validation:

- 752 JavaScript tests passed, including new wall-only / range-only, incomplete/invalid range,
  missing-price, detail-card and non-focusing pointer-click cases. 22 Python tests: 21 passed and one existing skip.
- Copy lint, 2,127 internal links and whitespace checks passed. Independent review found no P1/P2.
- Chromium: 320, 390 and 393 × 650 phone viewports and 1440 × 900 desktop, English/Chinese,
  light/dark (16 combinations). Amounts, labels, distance, endpoints and markers fit after
  horizontal scrolling. The fixed stock column and scroll padding both measure 158px on phones.
  Support width is 136px. No page overflow, clipped support content or unintended external requests.
- Safari-engine verification initially reproduced lost opener focus after a pointer click.
  The signal button now explicitly focuses itself without scrolling before opening its dialog;
  the regression and a passing WebKit 390 × 650 English/dark rerun verify the actual opener
  is restored. This uses the Safari engine, not a physical iPhone.
- Detail dialogs restore focus and horizontal scroll. Direct stock map navigation works.
  Browser fixtures use synthetic records only, with no production account, model calls or
  membership writes. Touch/viewport emulation does not claim a physical iPhone test.

Reproduce: build with the repository Python dependencies; run
`python scripts/research_brief_qa.py --product-focus --port 8923`, then
`node tests/browser/watchlist-wall-consistency.mjs`. The script saves screenshots and geometry
receipts outside the source tree. The full build gate runs again for the merged deployment tip.

Rollback: previous site source 970645c6dd205544170a6632b260d1a9ce7ea385.
