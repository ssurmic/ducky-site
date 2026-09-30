# Daily investment case and trend commentary · 2026-09-30

Status: implemented candidate, not yet published.

Replace the misleading long-term/left-side naming with Investment case / 布局逻辑 and
Trend & momentum / 趋势与动能. Show valuation, directional price structure, trend persistence
and signed momentum as separate readable states. Valuation and trend headers sort in both
directions; missing and stale assessments remain last. These describe evidence, not a buy score.

The price basis has its own dated caption. A previous close is not relabeled as an intraday quote
just because commentary was generated today. Retained commentary stays dated without promising
that a replacement will arrive shortly. Company evidence and disclosure destinations remain available.

Validation: 999 Node cases, copy lint and link checks passed before the final momentum-transition labels. Twelve fixture browser cases covered 320/390/1440 px, both languages and both color schemes. No page overflow or JavaScript errors; valuation sort clicks worked in all cases. At 650 px phone height, content retained 544 px and the first stock began at 193 px (one full Chinese row, part of the next; longer English source prose extended lower). Desktop first rows began at 203–205 px. The stock/map column remained fixed during sideways table navigation. These are touch-emulated viewport checks, not physical-device testing or proof of live research delivery.

Final committed gate and production publication receipts remain pending.
