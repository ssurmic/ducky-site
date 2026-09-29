# Ticker identity and phone reading workflows · 2026-09-29

Status: implemented candidate; release and production acceptance are recorded in the private shared engineering handoff after publication. This report is frontend evidence, not a competing system design.

## Problem and decisions

An empty phone Watchlist previously exposed fewer than two full stock choices, while a single macro gauge could occupy most of the screen. Some structured tickers still inherited orange link styling. Phone research maps stacked desktop branches, delaying counterevidence and source reading.

Reviewed Apple [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [UI design tips](https://developer.apple.com/design/tips/), and the W3C [carousel tutorial](https://www.w3.org/WAI/tutorials/carousels/). The design adapts content grouping to the available space, retains 44px common targets and 16px inputs, and provides controls and a position indicator alongside native horizontal scrolling. No autoplay. NN/g's [mobile carousel review](https://www.nngroup.com/articles/mobile-carousels/) informed the decision to keep evidence categories and counts visible rather than hiding all discovery behind sequential swipes.

Ticker identity uses fluorescent lime `#b7ff3c` on a small dark `#14251a` backing in both themes, with an explicit system monospace font. Ducky's existing orange actions, body type, source colors and bullish/bearish semantics remain. The design critique rejected greening whole badges, prices or sentences; only structured symbol leaves receive the new class.

## Implemented behavior

- Empty Watchlist: compact phone rows with ticker/company, attention count, direct Add, map link and optional native disclosure for the complete dated overview. Existing eligibility, capacity, pending, duplicate-click and membership acknowledgement checks still own the write.
- Today research starters: six columns on large screens and two on phones. Actual source rank, mentions, neutral attention change and collection time remain. Opening a stock or its map keeps the Today return context. Complete available overview text is expandable, never clipped to remove a condition.
- Today legacy macro records: four compact, source-dated readings; tap to open the original gauge, notes, historical comparison and methodology. A missing value remains missing. Current-session Today retains four compact metrics, with one selectable historical comparison on phones and both comparisons on desktop. Selection, chart date, focus and expanded details survive approved refreshes.
- Research map: phone cards reuse the attributed author/topic groups and source DOM. All interleaves support, counterevidence and context. Four category controls and counts stay visible; native horizontal scrolling, a next-card peek, Previous/Next buttons and position are available. Full qualifications, repeated-source receipts and exact original-source links remain. Desktop keeps its three branches. Compact phone price context retains its date and detail action.
- Populated Watchlist Overview: existing map, metrics, alerts and disclosure actions move directly below stock identity, ahead of long research text. The default List and its fixed stock column, sorting and horizontal table navigation remain.
- Creator page: an accepted, complete empty video-view section becomes a short state only when the same scope already contains readable historical views. Real content, loading, denied access, errors, partial results and pagination never receive that treatment.
- Structured ticker coverage includes search, Today, Watchlist, stock, map, Explore, calendar, creator opinions/history, disclosures, chart, briefs and alerts. Ticker styling does not convert attention to sentiment or style arbitrary prose/common words.

## Acceptance

- Final build and full Node suite: **952 passed**. Python: **19 tests, 1 expected skip**. Copy lint: **4,323 files**, clean. Link check: **2,133 links**, clean.
- Independent mobile map tests: 51 passed; independent creator compact-state tests: 22 passed; peer review and targeted state/refresh/membership tests: 89 passed. These subsets overlap with the full suite.
- Real Chrome browser with a local isolated synthetic fixture, not production account writes. Phone viewport simulations 320×600 and 390×700, English/Chinese and light/dark. No physical-device or touch-emulation claim.
- Empty Watchlist: 390×700 shows four complete rows before the bottom navigation, compared with fewer than two full prior cards. All eight language/theme/size combinations retained 44px Add buttons, 16px search and fluorescent symbol color without horizontal page overflow. Final 320×600 remeasurement: three complete rows in both languages, third row bottom 543px English / 542.5px Chinese against navigation at 547px.
- Browser interaction: opened a complete candidate view, added that stock in the in-memory fixture, confirmed Added and 1/50 while the same view remained open. No real membership was changed.
- Today research starters: six cards in two columns; the complete comparison section measured 459px at 390px width, with all six cards visible together when scrolled to that section.
- Today: all four legacy readings are visible on the 390px first screen; current-session comparison selector changes the visible chart and uses 44px controls. Source dates remain independent and visible.
- Map: phone Next reaches the opposing author as group 2/3. The original-source dialog retains the qualified claim, source-video offset, publication date and condition. Closing retains group 2/3. Desktop 1440px remains three-column. Independent regressions verify focus and reading-state retention across refresh and responsive changes.
- Route sweep includes populated/empty Watchlist, Today, Explore, stock metrics/map, calendar, creators, profile/billing, alerts, briefs, chart and company disclosures. Some generic fixture account/creator responses are incomplete; this is layout inspection, not certification of live account or notification configuration.

## Boundaries and follow-up

No acquisition, inference, metric computation, source identity, database, authentication or notification contract changes. Existing APIs supply the same saved data; this change neither repairs a producer nor proves live freshness. The ticker color is an identity cue, not a bullish judgment.

Account configuration was reviewed. For an already verified returning user, a future dedicated account change can put notification/security destinations before the full profile form; that flow is deliberately left intact in this release. Populated List continues its explicit side-scroll design so full metrics and source-qualified views remain available. Device testing is browser viewport simulation; physical iOS/Android touch and assistive-technology acceptance remain unmeasured.

Rollback: revert this frontend revision via the normal reviewed publication path. Saved memberships and research records remain authoritative.
