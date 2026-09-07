# Homepage research and public ledger interaction fixes

Scope: owner reported that “看看 Ducky 怎么研究” did nothing, plus the ledger notice and wide table shown in screenshots. Existing application overhaul, shared navigation, authentication, public examples, prices and research data are preserved.

## Reproduced

- Homepage CTA changed the fragment to `#home-dossier` and moved the page by only 41px at desktop width. It opened zero dialogs and zero evidence sections; its destination was the already-visible hero card.
- Ledger review notice was inserted before the centered `.wrap`: 1584px wide against a 1080px content area.
- Ledger table was 1225px wide in a 1080px viewport. The horizontal scrollbar was below thousands of pixels of rows; opening a disputed return further widened its cell.
- Ledger generated-at value was an unformatted ISO string; Chinese filters exposed internal kind codes.

## Changes

- CTA and card arrow open one native research dialog, with the existing dated examples and evidence expanded. The single existing dossier moves into the dialog and returns to its placeholder; no duplicate IDs, histories or data requests.
- Direct fragment navigation, stock keyboard navigation, Escape, close, backdrop, browser back, language links, focus restoration and prior evidence state are retained.
- Ledger overview groups ticker/type/mode/time, four return periods and a two-line summary. Full summaries, scores, original prices and review evidence open in a native dialog. No source values are changed or removed; original 62 visible rows remain, including losses, actual zero and disputed/missing values.
- Phone ledger uses record cards; all sorting keys remain available in a selector. Filters include an explicit reset and persistent selected type/mode labels.
- Review notice is inside the content column, with a concise expandable explanation. Timestamps use readable UTC labels with exact datetime attributes. Type labels are translated.
- CSS is scoped to the homepage or ledger. Other data tables retain independent horizontal scrolling with bounded height.

## Validation

- Frontend suite: 293 tests passed. Added bilingual dialog/deep-link/back/state tests and ledger filter/sort/reset/evidence/data-immutability tests. Targeted suite re-run after final changes.
- Build: 20 localized pages. Copy and link gates passed (942 links). Build asset tests: 4 passed, 1 existing fixture skip. Backend invariant gate: 783 passed, 1 warning.
- Real Chrome viewport simulation: desktop 1280×800 and 1584px; phones 393×650 and 320×600. No document overflow. Latest ledger first row at y=417px (Chinese 393×650), y=467px (English 320×600). At the smallest viewport, the first row’s first two metrics begin at y=549px; additional content remains scrollable.
- Dark homepage/ledger and light homepage inspected. Light ledger used temporary local copies with the existing root theme attribute; these files were removed before release. English light review dialog inspected at 320×600.
- All 14 homepage tour buttons switched to one corresponding panel and a valid application destination. No browser console errors observed in the homepage or desktop application sweep.
- Production read-only application sweep: watchlist, briefing, chart, calendar, radar, alerts, creators, profile and billing. Calendar holiday opened its detail dialog; creator feed showed publication dates in descending order; profile/billing were inspected without saving or purchasing. Phone navigation and the More menu were also exercised. These were browser viewport checks, not physical phone or touch emulation certification.

Production deployment and final URL checks are recorded in the release follow-up.
