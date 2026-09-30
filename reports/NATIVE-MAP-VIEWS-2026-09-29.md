# Attributed video views beside stock research maps

Status: implemented candidate; not committed, deployed or accepted with live new-video content.

The stock workspace's Map tab and the standalone research map previously showed only the existing evidence graph. Reviewed video views were already readable in stock Overview, but a reader entering directly through Map could miss them. Both current-map routes now offer a **Video views** button and an attributed four-card shelf below the retained graph. The button scrolls to and focuses the shelf heading. Each preview names its author and stance; opening it retains the full claim, conditions, horizon, original video link and separate source clocks.

## Scope and contracts

- Frontend base: `6e4e0a13` on `origin/main`; backend contract inspected at `9ba5e5bc` and the shared native-recovery candidate.
- Reuse the existing authenticated `GET /kol/opinions` with exact `ticker` and `scope=discover`. It does not require following the creator or adding the stock, and performs no account or source writes.
- Keep video summaries outside graph nodes, evidence counts, support scores and stored analysis. Only the existing validated company-subject association may enter a ticker view; a mentioned stock or macro topic cannot supply that association.
- Historical map versions and dated examples never fetch or display current video views. An independently permitted compact video preview does not unlock a free account's unselected research map.
- Reuse the shared view component's revision, account, visibility, read-error and source-denial handling. Refreshing the graph does not recreate the video reader, discard its source modal or issue another opinions request.
- Video times remain approximate navigation links. This UI does not turn a paraphrase into a transcript quotation, certify source fidelity, infer notification delivery or activate processing.

## Verification

Six new route-level DOM regressions exercise both map entrances, exact ticker selection, no implicit follow, author attribution, bullish and bearish views, complete source details, original-video links, keyboard focus return, independent graph refresh, denied-source withdrawal, historical isolation, invalid ticker responses and disposed late reads. Existing free-map tests retain their original map-access and explicit-save assertions while allowing the new independent read-only preview.

The backend companion tests exercise synthetic accepted receipts through the real publication, materialization and authenticated ticker/macro API reads, including replay and withdrawal. Their replica acknowledgement is a fixture. They are not a new production-success receipt.

Node 24: 69/69 focused tests and 975/975 complete frontend tests passed. The prescribed Python suites passed 18 tests with one explicit skip (including 14 export/home-source tests). Bilingual build, copy lint and 2,145 internal links passed. Root browser viewport acceptance is recorded below; production-content acceptance remains pending. An attempted isolated headless check exited on a temporary fixture-server read while `dist` was rebuilding; it establishes no visual acceptance and was not resumed.

Root's CUA check found the 390px phone video shelf readable, but desktop dark-mode connector paths painted beyond the graph and through the adjacent video shelf/footer. The existing SVG allowed visible overflow. Only the connector SVG viewport now clips overflowing paths; the graph cards and their focus outlines remain unclipped. A stylesheet/layout regression covers the graph-relative viewport and focused connector state. After this correction, the two map test files passed 36/36, the bilingual build passed and `git diff --check` was clean. This records the observed failure and bounded correction; the corrected desktop visual check remains with root.

## Browser QA entry points

Loopback fixture server: `http://127.0.0.1:8976/qa-frame?lang=zh&theme=dark&case=native-opinions` with either `#/stock/NVDA?tab=evidence&from=explore` or `#/evidence/NVDA`. Replace `lang` with `en` and `theme` with `light` for the other combinations. All records and credentials in this fixture are synthetic.

Check 320×700, 390×700 and 1440×900: `[data-map-video-views]`, `.creator-opinions`, `.opinion-preview-author`, `.opinion-preview-open`, `[data-opinion-dialog]` and `.opinion-original`. Confirm the button and source controls remain reachable, no document overflow, complete modal qualifications, approximate original source link and focus return. No physical-device or new-video live-content acceptance is claimed here.

Root browser acceptance used the actual Chrome UI at 390×844, 390×640 and 320×640, plus the desktop viewport. Both routes, languages and themes were inspected. The 320px English light layout had no document overflow; complete conditions and time horizon remained readable in the modal, the original video link retained its approximate 0:32 anchor, and closing restored the invoking card focus. In the 390px English dark layout, the shelf heading began at 98.6px and both preview controls fit with a 147.3px height. These are viewport simulations, not physical-device tests. SVG clipping recheck is recorded below when complete.

The final desktop English dark recheck loaded fresh CSS (computed SVG overflow: hidden) and visually confirmed map connectors stop at the graph boundary, leaving the opinion cards and footer clear. The fixture server cache was corrected locally for this recheck; no cache behavior change was added to the product.
