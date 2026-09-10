# Phone watchlist density and sorting

The owner requested a quieter sorting icon and smaller watchlist text on phones.
The old Unicode arrows could wrap onto a separate line. Header buttons now pair
their label with fixed-size CSS chevrons; the current direction is accented and
the existing `aria-sort` still announces the state. Sorting behavior is unchanged.

At widths up to 600px, stock symbols are 13px, prices and metric values 12px,
and reading previews 11px. The preview shows two lines, with its analysis date
and previous-version state still visible; expansion retains the complete text.
Row/header padding and toolbar type are smaller. Input text remains 16px;
sort buttons and the direct map action retain 44px touch heights.

## Acceptance

- 643 frontend tests passed; copy lint and 1,274 links passed.
- Synthetic, read-only browser fixtures at 320/393 × 650, EN/ZH × light/dark:
  no page overflow, 522px main viewport, 16px inputs, 44px sort buttons.
- At 393px, the same fixture with baseline CSS had two complete rows, starting
  at about y=335. New CSS shows three complete rows from y=315, plus part of
  the fourth. The first long row shrank from about 113px to 78px. Real row
  heights depend on content and the full retained timestamp/state.
- IV/HV and YTD toggled descending/ascending; a missing metric stayed last.
  Keyboard Enter retained focus and horizontal scroll. The fixed stock column
  and direct map action remained visible when scrolling to metric columns.
- Full-note expand/collapse retained the text and date. 1440 × 900 desktop
  layout was visually checked. No data, API, inference or ranking rules changed.
- Measurements and synthetic screenshots: [artifacts](watchlist-density-20260910/).
  These are Chrome viewport simulations, not physical-device or touch-emulation tests.

## Production receipt

Runtime `62974f8b3d786ad55d983880c7a300414a2ed1b6` passed exact main
CI `34541489064` and was deployed as Pages `d9110fac` to `duckybot.app`.
The production app shell and CSS use `62974f8b`; module graph is
`e189f450e1fbbc112741`. At 393 × 650, the signed-in page displayed all nine
new sort indicators, 13/12/11px stock/price/preview text, a 16px input and
44px sort height, with no document overflow. IV/HV descending was clicked
and visually verified. Initial page data arrived after the first short locator
wait; this styling release does not claim to improve API/data latency.
Rollback runtime: `93ed2a61e2cf1c03b402a899c7ca36bab2bfafcf`.
