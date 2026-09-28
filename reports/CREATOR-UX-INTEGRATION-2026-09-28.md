# Creator views: production UI integration

Status: implemented locally; deployment and visual browser acceptance pending the integrating agent. Date: 2026-09-28.

Frontend starting revision: `3987be2`. Backend documents inspected at local revision `a4851d0c861f6356d52abffe2a18a871b2329848`; no backend code, model execution, stored research or API contract changed.

## Reading behavior

- A visitor with no followed authors enters source-backed discovery unless an explicit route chooses another scope. The existing discovery read retains its ticker, watchlist, stance, query and account boundaries.
- Following opens a compact set of author cards. Each author exposes one recent distinct viewpoint with stock links. Other viewpoints expand within that author's card. Supportive views are green and risk views red; the stance remains textual.
- A selected author opens with the main stock viewpoints. Full video records remain below them in a collapsible archive. Exact source links still open the complete selected post and focused point directly.
- Discovery keeps conditions visible beside its main viewpoint. Mobile search and filters use a collapsed disclosure; desktop filters stay open, including after a viewport resize. The optional author chooser follows the reading results.

## Repeated wording

`creator-view-groups.js` collates presentation only. It requires a matching stable author, post and point identity, ticker, both language titles, an attributed-opinion basis, and a source URL matching the original post. It compares every raw field except the explicitly named source-receipt fields. Unknown fields, different wording in either language, conditions, horizon, action, stance and source stance keep records separate. Missing identity, unsafe or mismatched sources and withdrawn/superseded statuses cannot group.

Every grouped item retains its complete original view and post. Expansion lists every publication date and source title, and each button opens that exact record, source excerpt and time. The source modal also exposes original publication/observation/update information where provided and a direct exact-source route. Repetition is labeled as one author's repeated wording, not independent corroboration. The full original video archive remains available.

No semantic equivalence, new support score, performance claim or historical knowledge is inferred. No local bookmarks or synthetic claims are introduced into production.

## Validation

Executed against the actual production view modules with mocked HTTP boundaries:

```sh
node --test tests/creator*.test.js tests/evidence-source-navigation.test.js tests/evidence-grouping.test.js tests/workspace-ux.test.js
```

Result: **132 tests passed, 0 failed, 0 skipped**. The command includes existing bilingual discovery, exact-source, account/access, cursor, withdrawal, search cancellation and follow-confirmation coverage. New tests check conservative collation, changed and opposing views, preserved source identity and excerpts, first-view author diversity, the complete retained archive, no-follow discovery and mobile-to-desktop filter behavior. New reading-path mocks assert GET-only requests. Syntax checks and `git diff --check` passed.

At this focused run the integrating agent had not yet merged the nine new `app.creatorsux.*` strings, so it emitted missing-translation warnings. The canonical bilingual copy and `public/css/app-ux-creators.css` have since been integrated into the application template. The subsequent combined npm test suite passes 805/805; final build/browser/release evidence belongs to the [production acceptance record](UX-PRODUCTION-2026-09-28.md).

This is mocked API integration evidence, not a live-content or viewport measurement. The integrating agent owns the full build, 320/390 px and desktop checks in both languages/themes, deployment receipt and live-source verification. No production account writes, commit or publish action were performed by this slice.

## Research map follow-up

The same presentation rule is now connected to `mapView` through `exactAuthorRepeats(nodes, {ticker})` in `evidence-grouping.js`. A matching group exposes one original lead card and expands to the remaining original cards. Existing multi-source nodes are retained whole; their source receipts are not flattened or rewritten. Each expanded card keeps its original source dialogue, exact creator/post/point route, dates and share context.

Preview slots count collapsed groups so repeated statements cannot consume the first six slots. Lane, author and footer counts continue to describe original records. The repeat disclosure explicitly states that repetition does not add independent support. Existing analysis citations, graph history, scoring, color rules and server source gates are unchanged.

The grouping key compares the full node and every source's semantic fields after removing only named receipt fields. The stock scope must be explicit and author identity unambiguous. Different title language, stance, reason, conditions, horizon, source semantics, freshness or an unknown field keeps nodes separate. Missing bilingual titles/IDs, mismatched source URLs, omitted evidence, self-reported positions and mere mentions do not collate. Currently only source-bound YouTube attributed opinions qualify; other providers are conservatively left separate. This is exact wording collation, not a semantic duplicate detector or a claim that source dates have the same meaning.

Validation: **42 tests passed, 0 failed, 0 skipped**, using `tests/evidence-repeat-groups.test.js`, `tests/evidence-grouping.test.js`, `tests/evidence-topics.test.js` and `tests/evidence.test.js`. New cases preserve all node/source IDs and timestamps, existing multi-source receipts, opposed/changed/unknown fields, missing identity and translation cases, balanced preview access, zero fetches during presentation, exact source routes and focus restoration. Syntax and diff checks passed. Browser/deployment acceptance remains with the integrating agent.
