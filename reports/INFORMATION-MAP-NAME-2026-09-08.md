# Information Map naming acceptance

Owner request: call the customer-facing feature 信息导图 / Information Map. The application title, navigation, homepage feature title and feature guide use the new name in both languages. The creator passage cross-reference also names the Information Map. Internal evidence terminology, source records, routes, API contracts and algorithms are unchanged.

Validation on source base 21896ff: bilingual build and all 345 existing frontend tests passed. Copy lint passed (2,252 files), all 1,332 internal links resolved, and git diff --check passed. The build's unrelated calendar rollover (timestamps and removal of the September 2 fallback event) was inspected and restored; this change contains no calendar update.

Browser validation used the actual local renderers and an existing production-derived layout sample under a synthetic account, with no production connection. Both languages × 320/390 × 650px high × light/dark were visually inspected. Titles remain on one line at y=75, 26px high. Main content has 520px available; the sample shows four complete cards. Document width equals viewport width in all eight combinations. The English More menu reads Information Map. The homepage guide reads 信息导图 and its feature CTA reaches the existing sign-in gate. These are viewport simulations, not device, authentication, current-data or delivery acceptance. No sample is a new demo recording.

Release is coordinated with the active information-map owner; this branch does not deploy independently. Re-recording awaits source-bound creator review, summary readiness and the outstanding designated-receiver delivery acceptance.

## Production verification

The coordinated release owner reports frontend 6211f90 / Pages fda59603, with 351 frontend tests and 2,090 backend tests plus selftest passing. Independent browser verification on duckybot.app confirms both homepage feature guides show 信息导图 / Information Map. The Chinese feature CTA reaches the existing /app/#/evidence sign-in gate; the Google sign-in link loads, with no captured warning/error logs. No sign-in was submitted. The English 390×650 screenshot shows the name on one line with the complete feature CTA. Two DOM measurement calls timed out after resizing; the browser accessibility snapshot and screenshot succeeded, so no exact production pixel metrics are claimed.

The private creator passage workflow remains subject to the feature owner's case acceptance. The marketing access description still calls summaries “shared”; the two corresponding keys in each language were reported to the release owner for removal of that implementation adjective. This does not affect the verified naming change. The preferred creator case and final video remain pending.
