# Information Map: a saved overview first

The owner asked for a concise LLM synthesis on arrival, clearer bullish/bearish labels and stronger green, with background generation roughly every two hours. The frontend previously hid every analysis behind a primary button inside an otherwise empty card below the map.

## Delivered UI

- One overview above the map. Ready analyses show their actual generation time. The overview is visible immediately; reasons, risks and watch items use a compact native disclosure.
- The saved `analysis.overview` replaces the legacy duplicate summary. A valid legacy summary remains readable while a full analysis is pending. Source-changed/withdrawn analyses do not expose old prose or a misleading timestamp.
- Cited node IDs resolve to the same exact source dialog; closing restores focus. Opening reasons or citations makes no network request and never starts a model.
- Source-owned support/counter labels read 看多 / 看空 and Bullish / Bearish. Higher-contrast directional backgrounds, left edges and connectors retain textual labels on each mobile directional node. Context remains context; no direction is inferred by the client. Opaque priority labels are removed from primary cards and source dialogs; ordering remains unchanged.
- English creator sentiment labels match the map.

## Verification

354 frontend tests passed. Added behavioral coverage for immediate overview, local disclosure/citations, single placement, obsolete-source invalidation and missing states. Copy lint and 1,308 built links passed. Layout QA used an explicitly labeled synthetic local fixture, not a production analysis: 1,728px desktop dark, 393px mobile dark Chinese and light English; actual document scrollWidth equaled innerWidth. Citation dialog preserved source dates/passage and restored the triggering citation on close.

Backend cadence, review and warming remain owned by the existing shared analysis producer. Publication of this UI does not by itself prove that an issuer's analysis is ready. Record live output and producer acceptance separately after deployment.

## Subsequent production acceptance and refresh correction

- Whole-card directional styling shipped in `c5f2b24`, Pages `5eeee524`. Actual production AVGO at 393 CSS px had no horizontal overflow. The verified September 3 投资TALK君 point is green throughout, including its border, source label and watermark; context remains blue-grey. The map opens the exact creator point `claim:75b2c484c5bc6622e1a45ec5` and its 16:13 source link. An independent actual 390px run saved `/tmp/ducky-evidence-validation-20260907/final-avgo-whole-green-390.png` and its OCR receipt.
- Revalidation now compares the evidence being presented, not graph reprojection/check timestamps or global ingestion queue counts. It still detects changed/withdrawn sources, conditions, publication/observation dates, quote values/session/freshness, missing evidence and saved analysis content/status/version. It does not rely solely on stored graph ID, because read-time withdrawal may change a projection without changing that ID.
- New-data notices preserve open work until the reader loads the update. The phone notice measures 52px high at an actual 393px viewport, with a 44px action and no horizontal overflow. Hidden notices remain hidden; permission revalidation still withholds inaccessible private content.
- After this correction, 365 frontend tests, copy lint and 1,308 links passed; after integrating the independently verified mobile-navigation and record-reader changes through `a8d0901`, all 375 tests passed. The displayed ready overview in the local layout fixture remains explicitly synthetic; backend AVGO analysis publication is still a separate acceptance requirement.

## Final frontend release

Frontend `3099c9b3460c9904f47c688d6d1fe91d92e6383e`, Pages `5972c551`, includes the compact notice and the subsequent queue-state correction. Pending, waiting, building and retrying all display the same analysis placeholder and no longer count as new research. Ready analyses, explicit failure/missing states, source withdrawal and actual content changes remain observable. Existing global shared-read permission protection is unchanged.

The integrated release passed **385 frontend tests**, copy lint and **1,342 internal links**. Actual production AVGO viewport/document width was 393/393 CSS px; the visible update notice measured 51.98px and its button 43.99px (fractional layout at the existing browser zoom). At 320px, the English light-theme fixture remained within its viewport with a 44px action. The temporary fixture server was stopped and the temporary dependency symlink removed after layout checks; no fixture is included in the public site.

## Creator position statements use the same source point

A later real INTC traversal exposed a consumer mismatch: the API supplied a reviewed `self_reported_position_behavior` point, but the frontend allowed only attributed opinions and verified mentions. Filtering out the new point made the old neutral call reappear. The shared creator renderer now accepts the reviewed behavior basis, so feed sentiment, ticker chips, creator details and the exact map link all use the same canonical point. Legacy calls remain in the input/history and are suppressed only where the current source covers that ticker.

The expanded source qualifications distinguish a self-reported action at publication from the original outlook label. They reuse supplied action/source stance, including nested map evidence data, and never infer a current position or guess missing fields from titles. Regression coverage exercises the real creator route with a same-stock legacy neutral call, a canonical held-position point and a second stock in the same post; it verifies focus, one visible interpretation, source links, original-label preservation and no mutation request.

Released `74f8d9b944529a632de7e97bbe1f6d4500bc0ce3`, Pages `e0b6d287`; **392 frontend tests**, copy lint and **1,342 links** passed. Production at an actual 393/393 CSS px viewport/document width showed INTC's five support records. The 投资TALK君 holding card opened `CEGiQA6CNd4` / `claim:231a64321ade3830e177cc93` in one expanded interpretation, with `$INTC 看多`, `作者自述操作 · 持有`, `原观点标签 中性` and the explicit current-ownership limitation. Its 4:06 source link remained intact. Returning to the information map reopened that same point's source dialog, retaining August 24 publication separately from September 6 first observation. No source call or return-study record was changed by this UI fix.
### Creator source read recovery

An intermittent failed initial `/kol/feed` read previously left only “加载失败” on the creator source route. A compact retry now reopens the same route, retaining creator, video and point parameters. It disables on click to avoid duplicate attempts and ignores stale session/aborted-route callbacks. The existing GET-only data and authorization flow is unchanged. Mounted route tests cover a failed feed followed by a successful exact-source retry and an aborted route; the full suite passes 395 tests after integrating the latest homepage and billing changes, copy lint and 1,342 links.
