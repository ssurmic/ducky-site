# Ducky professional reading system · 2026-09-30

Status: implementation candidate; acceptance and release receipts belong in the dated report.

The owner's goal covers phone and desktop, dark and light, English and Chinese. Keep dense
financial information readable: fixed navigation, orange stock identities, aligned numbers,
explicit dates/units and access to complete evidence. Information density never permits
removing loss records, uncertainty, source attribution or disclosed security/currency.

## Direction and skill review

The owner requested `nextlevelbuilder/ui-ux-pro-max-skill`, installed locally through Codex's
skill installer. Its `stock trading platform` design-system search (density 9, variance 3)
returned a restrained grid, slate palette and sans-serif typography. The earlier broad
`investment research dashboard` query returned enterprise sales patterns: those conversion
recommendations were rejected as irrelevant. UX searches for `dense data table` and
`focus not obscured` informed contained horizontal tables and sticky-navigation clearance.
The project is static Jinja HTML + vanilla JavaScript/CSS, not React or Tailwind. No framework
migration, font CDN, animation library or trading computation is part of this work.

Use the existing self-hosted Manrope with platform Chinese fallbacks for headings, reading,
controls and stock identities. Preserve the approved duck and orange brand; reserve green/red
for gains/losses or explicit stance. Stock symbols use the orange brand accent, distinct from opinion prose; this identifies the company and never indicates direction.

## Palette and hierarchy

| Role | Light | Dark |
|---|---|---|
| Page | #f3f6fa | #0c141f |
| Surface | #ffffff | #121e2c |
| Raised / selected | #eaf0f6 | #1a293a |
| Divider | #cfd9e5 | #2b3d51 |
| Primary text | #172b42 | #e7edf5 |
| Supporting text | #50647a | #a2b2c6 |

Semantic gain, loss, link and accent-text colors are paired separately for both themes.
Validate normal text at 4.5:1 on page, surface and raised backgrounds. Text/signs/labels
remain alongside semantic color. Telegram keeps its client-owned colors.

Desktop page titles 24px, sections 16px, reading 14px, supporting text 12–13px.
Phone titles 18px, sections 14px, reading 13px; inputs 16px, primary touch targets 44px.
Use 4/8/12/16/24px rhythm, 6px controls and 8px panels. Avoid nested panels where a divider
communicates the same grouping. Long prose stays comfortably bounded; tables use available width.

## Layout and interaction

```text
Desktop                          Phone
Brand / account                  Brand / account
Nav | page title                 Page title
    | 4 persistent choices       4 persistent choices (44px)
    | search / status            Search / status
    | data, shared scroll area   Data, shared scroll area
                                 5 primary destinations
```

Watchlist switches, activity categories, stock-research/creator destinations and stock section tabs stay
in the existing app scrollport. Search and status move with content. Opaque backgrounds,
focus clearance and explicit selected states keep these controls usable after scrolling.
Each Watchlist view remembers its own scroll position during this visit; query/sort state
and existing data reuse remain intact. No competing vertical scrolling window is introduced.

Indicators is a 14-column comparison table. Full overall, long-term and trend readings belong
to List and Overview; repeating them in numeric comparisons wastes height. Keep indicator dates,
units, unavailable values, sorting, help and source drilldowns. Header labels wrap instead of
being clipped. Large tables use up to 1640px; smaller screens retain a fixed stock column and
one horizontal table scroll area. Desktop Insider controls share a toolbar where space permits.

The public introduction shares the typeface and palette, with an editorial heading scale,
smaller content gaps and plain surfaces. Marketing copy, historical sample labels and
access/billing states remain truthful to the existing product.

## Explore and Today refinement · 2026-09-30

Explore defaults to Company activity. Three native destination links share one active-state rule and remain present in activity, stock research and creator views, including loading/errors. Activity pins its four source categories; its destination row scrolls to avoid competing sticky bars. Research and creator navigation stays pinned. Today places six source-dated macro readings in one desktop row and two phone rows; the four ETF references remain above. Full basis, clocks and methods stay in disclosures. K is the backend’s saved CNN Fear & Greed / VIX ratio, not a browser calculation or IV/HV.
