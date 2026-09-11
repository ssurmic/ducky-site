# Today navigation and disclosures · 2026-09-11

Status: deployed and verified in the signed-in production app.

## Changes

The app brand linked to the public homepage, taking signed-in users out of the dashboard. It now defaults to the same-document Watchlist route while the session restores and continues there after authentication. Signed-out users retain the localized public-home link. The explicit logout action is separate. Existing auth credentials and session logic are unchanged.

Today previously filtered readable analyses and took the first three records in API order, so alphabetically early symbols dominated. It now orders the complete response by analysis `as_of`, newest first, with missing or invalid dates last and stable ties. Five stocks appear initially; Show all exposes every returned stock, including unavailable records. This is reading order, not an investment score or strategy change.

Research updates and stock analyses have native keyboard-operable disclosures. The collapsed state shows the stock, summary preview and actual analysis/source date; expanded rows retain full accepted text, exact citations, stock and map links, and separate publication/observation/readability clocks. Pending or withdrawn summaries do not invent an analysis date. Expanded controls survive shared revalidation and route return within the same account; source withdrawals still remove affected text and close stale source dialogs.

The Today layout adds a dated heading, distinct update/analysis sections, compact bordered cards, counts and clear expand/collapse labels in English and Chinese. No additional API, quote, inference, notification, or per-stock request is introduced by expansion or sorting.

## Validation

- 685 frontend tests, including complete-list recency ordering, unknown dates, reveal-all, keyboard disclosures, refresh/return state, source withdrawals, account reset, bilingual built brand links and actual built OAuth boot preserving its token without a logout request.
- Python build-graph checks: 4 pass / 1 existing retained-fixture skip; release config 3 pass; public price export 3 pass. Bilingual build, copy lint and internal links passed.
- Central backend selftest: ALL GREEN, 793 pytest tests; architecture lint: 0 failures / 0 warnings. Backend code was not changed.
- Synthetic browser: 320×650 and 390×650, both languages and both themes (8 combinations), plus desktop. No document overflow; main content height 522px; first update at y=355.875. At least one complete update is readable above the phone navigation. Inputs/citation controls remain 44px high; inputs use 16px text.
- Browser interactions: Show all reveals all eight intentionally alphabetized fixture stocks with TSLA/NVDA first by date; Enter expands the stock, and exact source and map actions remain available. Brand click returns to Watchlist from nine app routes. The route sweep verifies this navigation behavior, not complete data coverage in each fixture route.
- Empty changes, no watches, pending research, previous accepted research and request failure stay distinguishable. Viewport tests are not physical iOS/Android device checks. Synthetic records never use production sessions or sends.

## Publication and rollback

Previous production: source `a3c16e71`, Pages `d67bd897-bd1b-4ab2-8ba1-9f0a6b435cb3`. Only the frontend requires release. No database migration, backend deployment or investment algorithm change is involved.

Published through PR41, merge `e0457434a835e22ac9ad7296a7a6924bc7e8abaf`, Pages `2308f071`. PR CI `34577395976` and exact-main CI `34577557292` passed. Production serves app graph `06fff310cec2056a30be`. Six HTTP checks passed against the release build; the three HTML shells differ only by an existing Cloudflare-injected beacon, while versioned CSS and modules match byte for byte. This change does not configure analytics.

The real signed-in page previously exposed three analyses and linked the brand to `/zh/`. After release it shows five analyses initially, with a complete-list control; expansion reveals every returned stock and source citations. Clicking the duck returns to Watchlist while signed in, and returning to Today restores the expanded list and row. No watchlist, subscription, credential, notification or research record was modified during browser acceptance.

English production acceptance also confirmed the localized Show all control and a signed-in brand click returning to Watchlist.
