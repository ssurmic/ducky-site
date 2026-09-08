# Information Map naming acceptance

Owner request: call the customer-facing feature 信息导图 / Information Map. The application title, navigation, homepage feature title and feature guide use the new name in both languages. The creator passage cross-reference also names the Information Map. Internal evidence terminology, source records, routes, API contracts and algorithms are unchanged.

Validation on source base 21896ff: bilingual build and all 345 existing frontend tests passed. Copy lint passed (2,252 files), all 1,332 internal links resolved, and git diff --check passed. The build's unrelated calendar rollover (timestamps and removal of the September 2 fallback event) was inspected and restored; this change contains no calendar update.

Browser validation used the actual local renderers and an existing production-derived layout sample under a synthetic account, with no production connection. Both languages × 320/390 × 650px high × light/dark were visually inspected. Titles remain on one line at y=75, 26px high. Main content has 520px available; the sample shows four complete cards. Document width equals viewport width in all eight combinations. The English More menu reads Information Map. The homepage guide reads 信息导图 and its feature CTA reaches the existing sign-in gate. These are viewport simulations, not device, authentication, current-data or delivery acceptance. No sample is a new demo recording.

Release is coordinated with the active information-map owner; this branch does not deploy independently. Re-recording awaits source-bound creator review, summary readiness and the outstanding designated-receiver delivery acceptance.
