# Empty Watchlist quick add — 2026-09-29

Status: implemented and locally validated; production publication is recorded in the shared private Handoff after release.

An empty Watchlist previously showed four narrow discussion rows, each requiring a trip through a stock page before following. It now offers up to six existing ranked stocks across the available content width, with direct **Add to watchlist**, stock and research-map actions. Successful additions remain in the same selection session, marked **Added**; **View my watchlist (n)** appears beside the candidate heading (sticky on phones) and opens the normal saved list. The next visit defaults to that normal list. Search selection and Enter remain research actions during selection; only explicit Add writes membership.

## Design decision

Reuse Ducky’s existing typeface and theme tokens: dark background `#0b0f14`, surface `#121821`, text `#e6edf3`, secondary `#9aa7b4`, accent `#ff9000`, and existing light equivalents. Ticker 18px/700 (17px phone), company 13px, saved overview 14px, metadata 12px, input 16px, actions at least 44px high. Left-aligned search and three desktop columns become two and then one on narrow displays. No onboarding illustration, decorative metrics, arbitrary recommendation list or forced auto-follow.

The design critique removed the old fixed 850px content restriction and a first-add transition that destroyed the remaining choices. Tiles represent actual stock choices. A missing overview leaves a compact factual tile; it does not manufacture explanatory text to fill space.

## Data and interaction contract

- Reuse one `/radar/social.json` saved ranking; no per-candidate quote, directory, model or provider fetch. Show the true ranking date, mentions and attention change, with attention distinct from sentiment.
- Show an existing bilingual `overall` only with its own valid `overall_as_of`. Both come from the exact same ticker/rank row. Preserve the full sentence and qualifications. Do not substitute ranking time or insert undated prose.
- Reuse existing `POST /watchlist` and server-owned eligibility/capacity decisions. Rank grants no eligibility. Only an exact ticker plus boolean `added` acknowledgement can mark membership saved.
- Pending and already-added buttons reject repeated submissions. Shared membership cache/version fencing, account epochs, route aborts and disposal remain in force. Background membership/research reload does not delay choosing another candidate.
- Failures remain inline and support deliberate retry. Post-add permission denial stays visible across Done, clears stale overview/research, and blocks further writes until a successful read. A failed follow-up read does not erase an acknowledged add.
- No backend/schema/model/notification changes. No production account was modified for QA.

## Validation

- Full build and Node suite: **939 passed**.
- Python discovery: **19 tests, 1 expected skip**.
- Copy lint: **4,312 files**, no errors; link check: **2,109 links**, no errors.
- Focused regression coverage includes sequential and duplicate clicks, exact acknowledgements, capacity/ineligibility rejection, read denial, slow/failed follow-up reads, account changes, route abort/disposal, search after first add, and summary-date provenance.
- Independent targeted tests: **36 passed**. Independent UX review found search-semantics and hidden-permission-error defects; both were fixed and added to regression coverage. A same-read-cycle late research response is fenced after membership denial.
- Real browser, isolated in-memory fixture: desktop 1440×900, Chinese dark and English light; all six cards appear in three columns with no horizontal overflow. English columns measured about 371px each.
- Eight phone variants: 320×600 and 390×700 × Chinese/English × light/dark. All had no horizontal overflow, 16px search and 44px action height (subpixel measurement tolerance). First Add was above bottom navigation in every variant: bottom 468px Chinese / 509px English at 320px; about 427–429px Chinese / 488px English at 390px.
- Browser interaction: add NVDA, then AMD, observe 2/50 and both original cards marked Added, then explicitly open the populated list and confirm both research-map links. Synthetic data only.

Rollback: revert this frontend commit through the standard reviewed Pages publication path. The existing membership records and backend API remain authoritative; reverting the UI does not remove stocks.
