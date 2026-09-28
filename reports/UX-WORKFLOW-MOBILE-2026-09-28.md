# Mobile density, visual hierarchy and accessibility review

Reviewed 2026-09-28 in Chrome, local production UI candidate at port 8923.
Frontend branch: `codex/ux-disclosures-20260928`, based on production `0c904fa3`.
Role: independent mobile information-density and accessibility reviewer. The first pass was read-only;
root later assigned the bounded Calendar header correction recorded below. Other corrections were
integrated by their respective owners.

## Method and boundaries

- Actual Chrome viewport overrides: 320 × 640 and 390 × 844. This is desktop-browser viewport
  simulation, not touch emulation or physical-device testing. The viewport override was reset when
  the review ended and browser control was returned to the root agent.
- Both English/light and Chinese/dark were visually checked. All six requested destinations were
  checked at 320 Chinese/dark and 390 English/light. Today and Calendar received extra opposite-size
  English checks. This is not an exhaustive locale × theme Cartesian matrix.
- A separate agent-created tab was used. No user's production tab was altered. No real account
  subscriptions, alerts or production API requests were made. Business records came from the local
  synthetic QA fixture; seasonality alone used the built local public history asset after root fixed
  the fixture's missing route. This establishes rendering, not upstream content correctness.
- Applied the installed `frontend-design` skill through the owner's financial
  research brief: preserve brand, meaning, dates, conditions and usable controls; remove repeated
  decoration/introductions before shrinking text. No new palette or arbitrary visual overhaul.
- Screenshots are local evidence listed below. Read-only DOM geometry supplied exact dimensions.

## Observed first folds

The app header and bottom navigation each occupy about 53px. Useful reading height is 534px at
320 × 640 and 738px at 390 × 844; bottom navigation begins at y=587 and y=791 respectively.

| Surface | Actual view | Observed result |
|---|---|---|
| Today | 320 Chinese/dark | Heading 22px; digest heading 16px; complete four-part dated digest at y=159–544 with 13px body. Liquidity card begins y=554. No horizontal overflow. |
| Today | 390 Chinese/dark | Digest y=159–471; liquidity gauge and upper chart visible in first fold. Research updates begin at y=1685. |
| Today | 320 English/light | Digest y=159–602. All four data paragraphs fit to about y=550; final descriptive disclaimer needs slight scrolling. This does not justify shrinking 13px text. |
| Today | 390 English/light | Digest y=159, height 405px; complete digest plus liquidity gauge in first fold. |
| Calendar, two weeks | 320 Chinese/dark | Toolbar/legend ends about y=324; week summaries begin y=350; first day cards begin y=437, with first nonempty event around y=543. No horizontal overflow. The first calendar day is empty Sunday; that blank day itself is not a layout defect. |
| Calendar, two weeks | 390 Chinese/dark | First day cards begin around y=400; readable 18px dates and compact event labels; Monday event names/times and watched earnings remain visible. |
| Calendar, historical | 390 English/light | SPY and QQQ side by side, 164.5 × 181px each, y=413–594 after the Historical returns jump. Both averages, N=26 up/down counts, worst and best years visible together. |
| Calendar, historical | 320 English/light, initial | Two 129.5px columns. 21px “Down 1.2%” wrapped into two lines; value height 54.6px, card height 240px. Root received screenshot and exact geometry. |
| Calendar, historical | 320 English/light, corrected | Root's <=360px 18px + nowrap rule verified: value one line, height 23.4px; card height 208.8px. No overflow; losses, sample counts, dates and source/method access remain. |
| Explore | 320 Chinese/dark | First company y=296, height 127px; second y=423, height 117px; two complete companies and next summary before navigation. Stock search 16px, 45.6px high. |
| Explore | 390 English/light | Rows y=296/423/550/667, heights 127/127/117/118px; four company rows fit in available area. No overflow. |
| Stock Metrics | 320 Chinese/dark | Six core cards at y=262–551; all values visible before navigation. Both filing links 145 × 44px; every metric help control 44 × 44px. Full dates/methods remain below. |
| Stock Metrics | 390 English/light | Same compact six-card grid starts y=262; values remain legible, independent of metric details below. No overflow. |
| Watchlist List | 320 Chinese/dark | First row begins around y=378; one complete row plus most of second. Fixed stock/price and horizontal table are retained. Dates remain visible; input is 16px. |
| Watchlist List | 390 English/light | Rows begin y=392/529/656; two complete rows and most of a third fit. Local table scrolling does not overflow document. |
| Watchlist Metrics | 320 Chinese/dark | Switching mode initially leaves stock, price, general summary, long-term and trend columns first. It visibly resembles List; metrics are far to the right. This is a mode-order issue, not a font issue. |
| Creators Following | 320 Chinese/dark | Main heading 21px; one complete source-bound view, condition, horizon, repeat control and remaining-count fit. Opposing author follows below. No horizontal overflow. |
| Creators Following | 390 English/light | First author card y=215, height 408px; next author's counterview begins y=631. Full qualifications remain visible, green/red meaning preserved. |

## Ranked actionable findings

No new P1 density regression found in the reviewed candidate. The following are P2 flow/accessibility
issues, rather than requests for a new design system.

1. **Today has no quick path to the reader's stock changes.** Research updates are at y=1779 on
   320 Chinese/dark and y=1685 on 390 Chinese/dark, after two macro comparisons and additional
   gauges. Its useful full digest and liquidity chart should remain. Turn the existing real-count
   stat into a direct, keyboard-focusable jump to the matching research scope. An empty watchlist
   should link to actual research rather than fabricate a count. Do not collapse the owner's liked
   liquidity chart by default or shrink text further. Both other reviewers challenged and agreed
   on this restrained alternative.
2. **Watchlist Metrics does not reveal metrics when selected.** The initial left side is effectively
   the List view; narrative columns precede signal/metric columns. Preserve List and every column,
   but put signals/metrics before long narrative columns in Metrics mode. Keep frozen identity,
   sorting, focus and scroll semantics. The expert reviewer confirmed and took this finding to root.
3. **The USD liquidity help target is 18 × 18px.** Real DOM geometry confirms
   `.today-macro-help`; it has no larger actionable parent. Increase the hit area to 44px while
   retaining a modest question-mark glyph. Do not use tiny text as compensation.
4. **Historical chart readings are pointer-only.** `today-macro.js` has `pointermove`,
   `pointerleave`, `pointerdown` handlers; `sparkLines` creates `svg.today-lines` with `role=img`,
   but no keyboard date selection. Latest legends are readable, but a keyboard user cannot request
   each historical day's raw values. Preserve the three lines; add a focusable date control or
   arrow-key selection and an announced selected date/value. This is pre-existing behavior exposed
   by the accessibility audit, not a new compact-CSS regression.
5. **Calendar's upper stack still delays the first dates on 320px.** Generic introduction, watchlist
   explanatory sentence, mode selector, period controls, category legend and two week summaries
   consume about 376px after the app header. Consolidate the repeated explanatory context rather
   than shrinking 18px dates or 12px event labels. Keep market closure/early close/unconfirmed times
   and watched earnings tickers in the day cells. The other reviewer correctly rejected treating
   an empty first Sunday as a defect; the problem is the preceding UI stack.

Also confirmed the newcomer reviewer's P2 Creator Discover issue: ticker text was a `strong`
element rather than a named stock link, while Following already offered a research action.
The newcomer agent owns the route fix. Their map-only continuation findings are P2 continuity
issues, not total inability to research. The expert's stale/expired metric states need visible text
on touch; a tooltip or aria-label alone is insufficient. Do not remove that state to meet a six-card
first-fold target.

## Integrating-agent corrections after the audit

The findings above describe the measured first-pass candidate. The integrating agents subsequently
reported these targeted implementations; they need root's browser recheck before acceptance:

- **Today chart accessibility:** focusable keyboard date selection with Arrow keys/Home/End and
  slider semantics announcing the date and all three readings; liquidity help target enlarged to
  44px. Tests are in progress. The original three-line chart remains.
- **Watchlist Metrics ordering:** frozen stock/quote followed by six metrics, five signal columns,
  market cap, then the preserved summary and long-term/trend views. List retains its original
  column order. New metric widths prevent the old third-column summary rule from widening YTD.
- **Creator/first-use continuity:** the newcomer reviewer is adding named stock entries and local
  reading-state preservation. No final browser acceptance is claimed in this report.

The 320px seasonality single-line correction was already measured and visually verified, as recorded
above. Today jump links, the final Calendar upper stack, the changed metric table's horizontal scroll,
new stale-state labels and keyboard chart announcements still belong in the integrating agent's final
combined browser pass. These changes must preserve full source wording, dates and both positive and
negative evidence; they do not establish upstream freshness.

### Calendar upper-stack correction

After root assigned this bounded follow-up, the reviewer changed `views/calendar.js` and only the
Calendar rules in `app-ux-mobile.css`. On phones the heading now keeps a short, explicit Eastern Time
label; the full introduction and exact watchlist-scope explanation remain available inside the
existing event filters. Desktop retains those paragraphs in their original places. All category
counts remain visible; only legend and week-header gaps are tightened. Calendar dates, event labels,
timing states, watched earnings, two-week default, query/selection behavior and source data are
unchanged. Failed membership reads and source warnings remain outside the optional filter context.

The expected reduction is roughly 70–90px on a 320px phone, from removing duplicate introductory
rows and excess margins rather than smaller event text. This is an estimate pending root's actual
viewport recheck, not a measured improvement. One bilingual key, `app.calendar.timezone_short`, is
provided for integration. The Calendar suite passed 19/19, including explicit assertions that the
complete scope remains available, the default filter stays collapsed, and failed membership/source
reads are not hidden inside it. Syntax and whitespace checks also passed. The reviewer did not use
the browser during this follow-up because root owned the final browser pass.

## Responsive-code review

- Today/Calendar additions in `app-ux-mobile.css` are restricted to max-width 760px; the root's
  seasonality single-line correction is max-width 360px. They do not change desktop sizing.
- Stock's new disclosure bar has a modest desktop flex layout and becomes a two-column grid only
  at <=650px. Its duplicated Metrics heading remains in the accessibility tree on phones, while
  the generic intro is hidden. Metric labels, values, help and source methods are preserved.
- Existing Creator phone density rules use 650px/600px breakpoints. This review did not change them.
- A complete desktop visual pass is assigned to root after browser handoff; code-scoped breakpoints
  alone are not a claim of desktop visual acceptance.

## Screenshot evidence

- `/tmp/ducky-ux-today-320-zh-dark.png`
- `/tmp/ducky-ux-today-390-zh-dark.png`
- `/tmp/ducky-ux-today-320-en-light.png`
- `/tmp/ducky-ux-today-390-en-light.png`
- `/tmp/ducky-ux-calendar-320-zh-dark.png`
- `/tmp/ducky-ux-calendar-390-zh-dark.png`
- `/tmp/ducky-ux-calendar-390-en-light.png`
- `/tmp/ducky-ux-calendar-history-390-en-light.png`
- `/tmp/ducky-ux-calendar-history-320-en-light.png` (before single-line correction)
- `/tmp/ducky-ux-calendar-history-320-en-light-fixed.png` (verified correction)
- `/tmp/ducky-ux-explore-320-zh-dark.png`
- `/tmp/ducky-ux-explore-390-en-light.png`
- `/tmp/ducky-ux-stock-metrics-320-zh-dark.png`
- `/tmp/ducky-ux-stock-NVDA-390-en-light.png`
- `/tmp/ducky-ux-watchlist-320-zh-dark.png`
- `/tmp/ducky-ux-watchlist-metrics-320-zh-dark.png`
- `/tmp/ducky-ux-watchlist-390-en-light.png`
- `/tmp/ducky-ux-creators-320-zh-dark.png`
- `/tmp/ducky-ux-creators-390-en-light.png`

The first audit pass changed only this review document. The later assigned Calendar follow-up changed
the frontend view, scoped CSS and preservation assertions described above. No commits, backend
settings or account data were changed by the reviewer.
