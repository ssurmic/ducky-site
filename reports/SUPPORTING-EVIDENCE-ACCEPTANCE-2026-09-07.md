# Supporting Evidence — implementation and browser acceptance

The authenticated Pro route is `#/evidence/<ticker>`, beside the watchlist in desktop
navigation and under More on phones. A selected watchlist stock, chart and stock brief
link to its map. The first view contains one shared summary and six balanced points;
supporting views, opposition and descriptive facts remain distinct. Search covers point
text, author, dates and saved evidence. Source dialogs preserve conditions, observation
and publication dates, video time ranges, original links and saved calculation inputs.

The feature uses the private `/evidence/{ticker}` and history API. No inference, source
acquisition or personal-data lookup is triggered by viewing a graph. Raw captions, review
drafts and private validation metadata are never part of the page response. Changed or
withdrawn sources are checked again on read. The old graph remains a dated snapshot.

## Automated validation

- 328 frontend tests passed before final copy/compact-filter refinements; final run below.
- Source passages, balanced first six, search, show more, missing states, unsafe link/text,
  login deep links and late responses after logout have targeted tests.
- Bilingual build, copy lint and internal links passed. Existing navigation-count assertions
  explicitly include the newly added route; no other navigation route was removed.

## Browser validation

Local browser with a synthetic account and production-derived, sanitized shared data.
No actual account, trade, subscription or notification was changed during these checks.

- Desktop 1280×720 dark: sidebar entry, connected graph, summaries, controls and source cards.
- Chinese 320×650 light and 390×650 dark; English 390×650 dark and 320×600 light.
- Replaced the phone button row with one native filter next to search, shortened duplicate
  explanatory copy, compacted the ticker root, and kept inputs at 16px and main controls 44px.
- At 320×600 the app leaves 470px of content height after header and bottom navigation.
  Before compacting, the first point started below the viewport. After compacting, its title
  and attribution are visible on the first screen; final position is recorded below.
- Verified watchlist row → stock detail → exact ticker graph, ticker switch, zero-result
  opposition filter, source dialog, Escape closing and focus restoration to the same point.
- Swept watchlist, briefing, chart, calendar, radar, alerts, creators, profile and billing.
  Existing routes retained their navigation and content layout. The preview intentionally
  uses empty/fallback data for unrelated pages; it is not a production data-coverage test.
- No physical iPhone/Safari or touch emulation claimed. These are viewport simulations.

Production deployment and real-source summary/extraction acceptance are recorded below.

## Production release

Code `0e76ddc` deployed to Cloudflare Pages `4c54422f` and `duckybot.app`.
Final frontend validation: 328 passed, 20 bilingual pages, copy lint clean,
1,332 internal links, asset isolation 4 passed / 1 existing fixture skip.

The existing signed-in Chrome Pro session successfully read real ORCL/AVGO graphs.
The ORCL creator card showed 投资TALK君, 2026-09-07, separate observation/acquisition
times, and video 19:21–19:32 with the actual `Y1XBxQ90bxY&t=1161s` source link.
No holdings, watchlist, subscription or notification preference was changed.

A real twelve-stock watchlist revealed a three-row phone chip bar; it now scrolls
horizontally in one row. On the released English 320×600 page, the first point spans
y=389.4–516.9, fully above the bottom navigation. Page scrollWidth is 320 and both
search inputs use 16px. Chinese source dialogs and the English history selector work.
The saved 01:28 UTC AVGO version shows its accepted real-model sentence and two clickable
point references, explicitly labeled as a historical map.

Production also exposed a backend price-provenance read timeout. The backend retained
the correction checks and added a batched query plus the price owner's receipt index;
post-fix real projections measured 2–89 ms and the same browser retry succeeded.
Source changes withhold affected readings immediately on the next read.

Current summaries can show a pending state while shared local inference is busy.
An early ORCL sentence omitted creator attribution and mixed Chinese into English;
the backend now requires the author, publication date and explicit opinion wording
for cited creator views and validates language again on read. The source corpus and
its translation quality are still being processed; no broad extraction-accuracy or
complete historical-coverage claim is made. The backend release report contains the
retained failures, scheduler receipt and remaining coverage boundaries.
