# Phone browser density acceptance · 2026-09-07

The owner’s actual phone screenshot showed 22px date numbers, large empty cards, and stacked calendar controls. This release reduces dates to18px, event/weekday labels to12px, and quiet day cards from116px to68px. Event cards grow to fit their contents. The period controls use one row; the description can span the header width. Common tap areas remain44px; text inputs remain16px. No event, price, source status, rule or historical result is changed.

## Scope

- Calendar: compact headings, scope note, source-state notice, mode/filter controls, dates and cards. Full event dialogs and source links remain available. Desktop retains seven columns per week.
- Watchlist: adding is a disclosure, initially open if no cached symbols; ordinary returns lead with existing stocks. Narrow English sort/refresh stay on the same row. The updates link remains after the stock list.
- Alerts: updates becomes a compact header link. The input precedes optional example disclosure. Translation and explicit confirmation are preserved.
- Creators: Following leads with recent content; Discover and Add still show the full person lookup, independent of stocks.
- Chart: related links and legends follow the chart; an empty symbol status no longer reserves blank space. All panes are allocated after all series exist, using proportional sizing so adding MACD cannot squeeze RSI. The bundled5.2 API is documented at [IPaneApi](https://tradingview.github.io/lightweight-charts/docs/api/interfaces/IPaneApi#setstretchfactor).
- Billing: currency selection uses the shared surface/text colors,16px font and44px target in both themes.
- Integration: latest main2ac32fe’s market page, navigation, notification controls and unknown-watchlist states are retained. Normal radar entry leads with results; screening links still open and focus their explicit form.

## Measured acceptance

Anonymous local fixture at127.0.0.1:8880, read-only synthetic account/data. Separate date fixtures use the existing calendar export; incomplete source coverage stays visibly disclosed. Screen coordinates are CSS pixels. These measurements are layout evidence, not production price or source coverage evidence.

Before/after calendar comparison used the same Chinese calendar and partial-source notice,393×700 viewport,570px available app content. Baseline workspace CSS c4b00ef: first day518px below content top,116px quiet cards, no complete day card and two partial cards visible. Compact CSS: first day306px below content top before the final full-width header refinement,68px quiet cards, six complete and eight at least partially visible. Final320/390×600 English layout retains18px dates, no horizontal overflow, and one complete pair of dates despite the longer warning/labels. This smallest warning state still requires scrolling; it is not described as a full two-week overview.

Calendar interactions checked: holiday dialog with closure and next-session explanation, source link,44px close target, close/focus restoration, next period, Today and Month. Holiday modal at393×700 stayed between y114 and586. Desktop1024×700 retained14 dates in two seven-column weeks and no main overflow. Independent route audit covers the other eight main pages and added market/error states.

Independent Chrome touch simulation used the current source through an anonymous local fixture at8894: iPhone12Pro390×844, verified coarse pointer/touch events; radar disclosure/selection, More→Profile with focus restoration, English/light and Chinese/dark holiday dialogs,3M chart selection and vertical touch drag over the canvas passed. This is browser touch simulation, not physical iOS/Android or Safari-engine testing. Account changes, payment and notification sends were not performed.

## Gates and limits

276 Node tests passed after the final navigation and account-link integration. Twenty pages build;940 links pass; copy lint passes; asset graph4pass/1historical fixture skip. A link scan started during a rebuild saw incomplete output; after the build finished it passed. The fixture is not a live account workflow. Remaining nonblocking density opportunities (including subscription introduction and first-record body placement) are listed in the independent audit instead of claiming every page needs no further work.

Permanent acceptance instructions are recorded in frontend CLAUDE.md and backend WORKFLOW.md: every affected UI change must check real browser viewport constraints, languages, themes, core content position, dialogs and desktop regression. Shared layout changes trigger the route sweep.

## Release

Implemented and deployed as main `aa6c0b11` / Pages `56c5c40a`, then the separately integrated account-country regression was corrected in `797f51f6` / Pages `81dc329f`. Final app graph: `fe4bc95159e9ea2d4bf0`. Both language app shells, workspace CSS, profile module and chart module return200 and match the local final build byte for byte. The signed-in production calendar loads the9-symbol watchlist, September7 holiday and September10 ORCL/macro events correctly.

Final refined Chinese393×700 calendar: content570px, first card328px below content top,6complete/8at least partially visible dates, no horizontal overflow. Independent final chart measurements320/390×650 in both themes: content520px, chart top231px,289px visible; panes212.5/85/70.5px plus28px time axis. Period selection and theme changes preserve those heights. Independent touch simulation evidence is described above; physical Safari remains untested.

The independent audit is committed with this release. Permanent backend rules/tracker were pushed as `2d38464`, then updated with this final deployment receipt. Temporary root fixture/tab and dependency symlink are cleaned after verification. No other task’s browser tab or server is closed.
