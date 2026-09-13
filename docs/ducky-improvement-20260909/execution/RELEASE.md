# Research Brief publication · 2026-09-09 PDT / 2026-09-10 UTC

Owner authorized production publication after reviewing the sample preview, then requested a prominent research entry, green bullish/red bearish author labels and publication-versus-current price comparison.

## Reviewed release

Frontend commit: `c82e7770cb197e4bfcc51a6d742d19279edee78b` (parent `4a88b28ecd23c4f75f84f33a4a5081ad444bc882`). Existing Cloudflare Pages project `ducky-site` and domain `duckybot.app`; no hosting migration. Previous production deployment: `b6eb9c76-507e-4bed-bbde-c3448bae13c0`.

`site.config.json` explicitly enables the preview. This owner-approved release supersedes the earlier local/default-off delivery boundary. Absent or invalid configuration remains off; `build.py --no-research-brief-preview` explicitly disables the feature. The off build and existing navigation tests passed (25 tests).

Mobile: second bottom tab 今日研究 / Research. Desktop: immediately after Watchlist. Bullish/bearish labels have green/red text and matching card borders; positions/background remain separately classified. Saved price direction is independent of author direction.

Prices reuse the existing `creator-price-context-v1` projection in the two existing initial GETs. Publication reference is the last completed session close at original publication, not an intraday fill. Latest means latest stored close with its session shown. Return is the saved unadjusted-close percentage, without fees/dividends or bearish inversion. Unknowns stay missing, zero and losses remain, provider/corporate-action reviews suppress comparison. Expanded source details explain the method and recorded processing time.

## Local release acceptance

- JavaScript: 581 passed, 0 failed; price adapter includes 8 focused tests and view coverage keeps exactly two initial GETs.
- Python: 10 passed, 1 existing history-asset test skipped; explicit config/CLI switching has three passing cases.
- Copy: 3,036 files passed; internal links: 1,294 passed.
- Release UI: 320/390/1280 px × zh/en × light/dark (12 combinations), no overflow or script errors. These are browser viewport simulations, not physical-device or touch acceptance.
- Committed build has `VERSION=c82e7770`, research enabled and billing disabled. User attachments, raw audit docs and logs are not part of the GitHub commit or public dist.

## Backend gate qualification

The direct live DGX harness on unchanged backend `0f75ed27f0a0946edc87b8fd39171e7d36e73b43` reported one pre-existing failure: a cold-cache test used 2026-09-10 as a future event but the UTC clock had crossed into that date. Expected `unavailable`, actual `not_recorded_before_event`; the runtime behavior is correct. The same failure reproduced locally.

A test-only correction freezes the existing fixture clock at 2026-09-06 and explicitly covers future and historical cold-cache statuses. The entire earnings-context test file passed (22 tests). Full backend verification runs in an isolated DGX worktree of the exact deployed commit plus this fixture correction, using the same `bin/selftest.py` harness. No live backend files, data, services, collectors or models are changed. The launcher itself hardcodes the live directory, so the isolated check invokes its Python harness directly. Original failure and corrected run logs are retained separately. The fixture patch remains available locally and is not included in the frontend deployment.

The first isolated full runs exposed four additional test-environment failures (`model_busy`): mocked creator queue tests still used the same-UID runtime lock shared with production GPU workers. All four passed in isolation; complete captured trace established the admission failure. The common test store fixture now provides a private temporary lock while retaining the actual admission implementation. No production lock is removed, bypassed or changed. Earnings, creator fixtures, scheduling, cache and admission/preflight suites passed together: 222 tests. The final isolated gate includes these two test-only fixture corrections. Earlier unsuccessful attempts remain in the audit directory.

Final isolated DGX gate: **4,634 passed / 7 skipped / 2 warnings; ALL GREEN**. Test corrections are retained in local backend commit `57cf95e` and were not pushed/deployed. Frontend commit was pushed normally to `main`; exact-commit GitHub check: https://github.com/ssurmic/ducky-site/actions/runs/34422167979.

## Publication and live acceptance

Initial production deployment: `8980c925-b413-427f-986b-42be9258a954`, source `c82e777`, at https://duckybot.app/app/#/research-brief. Existing authenticated session recovered normally.

Production acceptance on real current `/3` records:
- Entry is second mobile tab and second desktop item. 320/390/1280 px in Chinese and English have no page/price-strip overflow. Dark theme was inspected in production; the complete light/dark matrix is retained from local browser acceptance. Phone input is 16px, mobile tabs 54px tall; available main height is 470px at 320×600 and 520px at 390×650. These are viewport checks, not physical touch/device tests.
- UBER: red author-bearish label, saved 2026-09-04 close $75.76 → 2026-09-09 close $71.08, displayed -6.18% in red. Independently checked arithmetic. Bullish labels use green. Current TSLA/GOOGL revision-review flags correctly withhold percentages even when endpoints are present; the earlier arithmetic worksheet does not override those review states.
- Original offset is preserved (UBER 445 seconds). Source details resolve the exact Meet Kevin video and highlighted UBER point. Related history resolves the same author/ticker/point; returning restores expanded evidence and reading position.
- More retains Information Map and other original tools. All nine existing route shells loaded at 390px without overflow: watchlist, briefing, chart, calendar, radar, alerts, creators, profile and billing. Billing correctly renders profile under the existing open-access policy; no new checkout.
- Sweep found one pre-existing missing copy key, `stockbrief.topic_price_position`. The source defines it as the close's position in the saved 20-session range; added 股价位置 / Price position in both languages. Follow-up frontend commit `b38999bfc3234a8a65b6726e7c0750b2ee54fbc5` passes all 581 JS tests; final copy scan is 2,956 files and link scan 1,294 links. The final two-line copy release passed exact-commit CI and was published. Both live language pages render the translated price-position topic; no new warning/error remained after the final reload.

Temporary browser viewport overrides were reset. No account/profile/notification setting, subscription, price source, backend runtime or production data was edited. The known original backend test fixtures remain unfixed in the live repository; the corrected fixtures are retained in the isolated local test commit and audit patches. Production hardware was never stopped to make tests pass.


## Final release receipt

Final production deployment: `1c7bce1e-5242-4c88-adef-b97065b38961`. Source: `b38999bfc3234a8a65b6726e7c0750b2ee54fbc5`. Public route: https://duckybot.app/app/#/research-brief. Exact-commit CI passed: https://github.com/ssurmic/ducky-site/actions/runs/34422764451. Deployment URL: https://1c7bce1e.ducky-site.pages.dev. The source checkout is clean except for the intentionally local audit documentation.

Rollback: re-deploy prior known production `8980c925-b413-427f-986b-42be9258a954` for the tiny copy follow-up, or `b6eb9c76-507e-4bed-bbde-c3448bae13c0` for the pre-feature release. To keep current source while disabling Research Brief, build with `--no-research-brief-preview` and publish that reviewed build; omitting the flag now follows the explicit true site configuration. There is no backend or data migration to undo.

Evidence: `production-research-viewport-checks.json`, `production-route-sweep.json`, `production-final-console.json`, saved production screenshots, frontend/CI logs and the qualified backend harness logs in this directory. Screenshots/data records are private local evidence and were excluded from public upload. Physical iOS/Android touch testing and completeness of source acquisition are not claimed.
