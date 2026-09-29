# Integrated Today dashboard — 2026-09-29

Status: implementation and local acceptance complete; production receipt follows in the shared private handoff after publishing.
Baseline: frontend `f9a1575e1d1f22d415cd6d11dee817e0e67644a0` (PR #120).
This presentation change uses the existing current-market response and makes no
new acquisition, model call, account write or schema change.

## Design decision before implementation

The owner found that market quotes, macro readings and comparison charts were
separated by a long calendar preview. Four equal-height macro cards left large
empty areas and repeated source prose overwhelmed small reading text on phones.
The independent reviews agree on a single reading order:

```
Market overview: four index ETFs
Four compact macro readings, each with its own date
Liquidity / QQQ / SPY       Treasury yield / QQQ / SPY
Upcoming events: time, event, one full impact
Dated closing archive
```

On phones the two charts stack at full width and remain visible by default.
The existing Ducky navy base (`#0b1218`), raised surface (`#121d27`), bright text
(`#e6edf3`), secondary text (`#9aa9b8`), orange accent (`#ffad32`) and existing
directional red/green retain the product identity; existing light-theme tokens
provide the corresponding light presentation. Use the existing self-hosted font.
Emphasis comes from 24–28px bold readings and 13–15px semibold labels/body text,
not from growing all padding or shrinking every explanation.

The review rejected another set of identical tall cards and hiding both charts
behind tabs. Data, dates and colors encode state. Provider/retrieval details,
full methodology, history and the untouched saved summary remain reachable in
disclosures. Do not rewrite source facts merely to fit a smaller component.

## Acceptance contract

- Preserve canonical snapshot selection and producer-compatible rounding.
- Preserve actual zero, unknown/older values and independent source dates.
- Keep both three-line comparisons visible, keyboard operable and distinct from
  newer intraday quote readings; keep chart normalization visible.
- Plain event labels distinguish tomorrow, a later trading day and historical
  dates. Missing coverage never becomes a claim that no event exists.
- Preserve expanded details, focus and the selected chart date on refresh.
- Inspect desktop and exact 320×600 / 390×700 synthetic phone frames in both
  languages and themes, including event expansion and overflow.
- Full existing frontend release gate and independent review before publishing.

## Results and release

- 930/930 Node tests passed; Python discovery passed 19 tests (one intentionally skipped); copy lint passed 4,305 files and link checks passed 2,109 links.
- Independent reviewer passed 44 current-dashboard/preview tests; implementation-focused run passed 72 tests. `git diff --check` passed.
- Browser QA used synthetic, isolated iframe viewports, not physical phones: 320×600 and 390×700 × English/Chinese × light/dark. All eight combinations had no horizontal overflow and retained four index readings, four macro readings and two visible chart components. At 390px all eight headline readings fit above the bottom navigation (metrics bottom 546.8px Chinese / 580.4px English; navigation begins 647px). At 320×600, dates and some metric context require scrolling; no claim that all context fits.
- Desktop 1440×900 showed the two chart plots side by side (467px each; common top 602.7px). Phone charts stack at readable full width. Empty-watchlist 390px English also had no overflow and all macro values above navigation.
- Verified keyboard Home/ArrowRight on liquidity and Home on Treasury, event-row expansion, two additional events, schedule sources, all four complete quote/acquisition clocks, original summary and the dated calendar link. Expanded event/source details survived manual refresh. Final click QA found that moving focus away from a chart lost its selected date on refresh; fixed by restoring both chart dates without stealing focus or revealing unfocused tooltips. A regression explicitly moves focus from both charts through an event row to the Refresh button; the prior focused-chart automatic-refresh case still passes.
- First visual pass exposed an old mobile `display:contents` header rule; removed the obsolete seven-rule header block rather than stacking competing overrides. Restored date/title plus the two 44px counter actions into two aligned rows.
- The fixture deliberately includes zero, missing fields and a dated older funding reading; it makes no production data assertion. Browser screenshots were visually inspected in both themes. No production account data was changed.
- Production deployment is pending the reviewed PR and the official release script; final commit/Pages/edge verification belong to the shared private receipt.

## Rollback

Previous reviewed frontend `f9a1575e` / Pages `694c4723`. Backend ownership and
data acquisition remain unchanged by this layout slice.
