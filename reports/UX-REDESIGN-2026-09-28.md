# Integrated UX prototype acceptance · 2026-09-28

Status: implemented and tested locally as an interactive design preview. Not merged, deployed,
or connected to a production account. Real-user usability acceptance and production integration remain separate.

## Scope and baseline

The owner authorized a team and Goal mode to redesign the integrated UX, beginning with a new user
and an empty watchlist. The owner explicitly allowed mock UI before backend implementation. Attached
briefs were reference material; their embedded workflow instructions did not override the request.

Frontend baseline: `ssurmic/ducky-site` `3666f37` from `origin/main`, in a fresh worktree on
`codex/ux-redesign-20260928`. Private backend guidance/current-status documents were read (local
backend revision `a4851d0`); no backend files, services, paid models or production records were changed.
The existing dirty frontend checkout and existing backend worktrees were left alone.

The audit used rendered Today, Watchlist, Calendar and Creators pages, the supplied Explore/Creators
screenshots and current source. The live watchlist was not emptied. New-user behavior was examined
in source and then exercised with isolated prototype state.

## Delivered behavior

- Five visible primary destinations; one stock hub connects views, opposing evidence, dates and a plan.
- Today keeps market orientation, then connects the day's research questions to stocks and events.
- Empty Watchlist offers inspectable examples and explicit add actions. List is the default, with
  sorting, filters, row expansion, a fixed phone identity column and a visible horizontal-scroll hint.
- Overview puts quote and reference/own plan together, followed by the latest view, support, risk
  and next event. Plans saved from a stock appear back in its card/list.
- Explore starts from research questions and named stocks. Mention volume stays a separate, compact
  attention measure. Search, theme and sort survive a stock round trip.
- Creators starts with views from different authors. Ticker, stance, following and saved filters,
  author profiles, full source context and reversible bookmarks work. Mobile search/filter controls
  disclose on demand instead of occupying the first screen.
- Calendar adds upcoming-event impact, typed related tickers, two-week/month/agenda views,
  stock/date context links and separate unconfirmed events. Historical examples include losses.
- Stock pages contain overview, a clickable evidence map and retained history. Source saves can be
  found and reversed; missing quote/reference/event states do not invent timestamps or usable facts.
- Reference price → editable stock/condition/value/expiry/note → local save → visible personal plan.
  TSM's absent quote leaves a blank required price. AAPL's absent range stays unavailable.
- Chinese/English and dark/light share 686 matched `ux.*` localization keys. No production locale
  strings were replaced. Prototype modules are outside the production build.

Everything financial is illustrative, including dates and charts. Authors and quotations are fictional.
The only persistent write is `ducky.ux-lab.20260928` in local storage. No account, actual watchlist,
creator subscription or notification is changed. A local save explicitly says notifications are inactive.

## Verification

| Check | Result |
|---|---|
| Existing frontend build and Node suite | 773 passed, 0 failed |
| Integrated preview suite | 10 behavior cases passed; Node reports 11 including the parent |
| Copy lint | Passed |
| Built internal-link check | Passed |
| Locale key-set equality | 686 preview keys in each language; complete root sets match |
| Module syntax and Python preview server compile | Passed |
| Prototype request boundary | Test fetch spy accepts only the two locale paths; no production storage keys |
| Loopback preview server | Intended assets served; GET/HEAD of repository metadata and traversal outside the preview rejected |

Commands:

```sh
DUCKY_TEST_PYTHON=/tmp/qa-venv/bin/python npm test
node --test prototypes/ux-lab/acceptance.test.mjs
python3 scripts/lint_copy.py
python3 scripts/check_links.py
```

The integrated cases cover empty start, explicit follow/search, editable plan persistence, missing
quote defaults, watchlist context retention, ticker-scoped calendar, reversible source bookmarks,
nine routes in both languages, recoverable loading/failed refresh and local storage/request isolation.
Agent module checks also covered creator directory/profile/filter flows, evidence/history, unknown-last
sorting and calendar date validation. Those exploratory checks supplement the committed suite.

Rendered verification used Chrome through the provided browser tools. Desktop was 1728×902; phone
viewports were 390×650 and 320×600, not physical devices. At 320px, eight principal routes in Chinese
and English had document width = scroll width = 320; the watchlist table and filter/theme strips scroll
inside their own containers. Visible controls had accessible names. Main search/actions and mobile
controls use 44px targets; dense date cells remain bounded inside the calendar.

On the final 390px Creators default view, the first claim occupies y341–385 and the second starts at
y541. The first claim's condition, author/date and source action are visible above the bottom navigation.
Phone-to-desktop resizing automatically reopens the filter panel. The source dialog was opened and
closed with Escape; focus returned to the exact claim button. The AMD reference was edited to an
illustrative $185 plan and the stock page immediately showed that value. A related event link opened
the filtered calendar on September 30. Theme/language, empty and sample scenarios were exercised.

Initial assembly exposed a missing parenthesis, a null event date, unmerged new copy keys and mobile
filter overload. These were fixed before the final passing suite. Further fixes preserved filters on
follow/redraw, stopped edited prices being replaced by reference defaults, neutralized missing quote
colors, made bookmarks reversible and separated missing source metadata. The only browser console
error retained in the inspection log was the earlier fixed syntax error; no subsequent errors appeared.
One browser-control timeout recovered through the existing tab; it was not an application failure.

Generated `public/calendar.json` changes from the build were restored; they are not part of this slice.
No production backend gate is claimed because this change contains no backend candidate or release.

## Review and remaining work

Run `python3 prototypes/ux-lab/serve.py`, then open
`http://127.0.0.1:8765/prototypes/ux-lab/#/today`.
The [review guide](../docs/ux/README.md) links the audit, design directions and journeys.
[Proposed contracts](../docs/ux/proposed-backend-changes.md) identify how to replace fixtures with
existing validated fields and where reference methodology or write acknowledgements need a decision.

Production integration must preserve access/source-withdrawal gates, quote clocks, historical versions,
account isolation and server-side pagination. Numerical levels need a defined method, evidence date,
expiry and invalidation conditions. This preview does not demonstrate a predictive trading method,
real notifications or measured improvement in user outcomes. Deployment is not part of this delivery.

Rollback: the prototype is outside `dist`; remove this prototype/`ux.*` additions or revert its commit.
No database, production membership or service rollback is required.
