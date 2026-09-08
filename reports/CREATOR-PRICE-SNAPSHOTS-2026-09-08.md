# Creator and detection price snapshots — 2026-09-08

Status: frontend published as d498cd66; Pages b618a4d7. Backend 9946396 is live.
Source-specific NKE correction remains a separate unfinished acceptance item.

The owner narrowed creator research to publication time and twenty sessions. The main
card now shows publication reference, latest recorded close with dates, change to date,
reviewed directional stance and any condition. Existing prices remain visible while
the twentieth session is pending. Historical controls and recorded-time selectors are
removed from the main UI; sources and stored timestamps remain under details.

The new backend publication_20 uses the same reference as change to date: the last
completed regular close at publication. Counting starts with the first close strictly
after publication. Existing archived windows are not rewritten. API keyset pages are
loaded explicitly, scoped to the selected creator, with retries and stale-request guards.

The shared component also reads social item.price_snapshot on current cards and history.
Those prices are labeled detection reference and twenty sessions after detection. An
overheated state gets a separate risk badge and does not manufacture bearish sentiment.

Validation: 424 frontend tests passed; focused tests cover pagination, conditional
views, losses/zero, incomplete windows with known prices, stance enums, and detection
versus publication labeling. Actual browser fixture review covered 320/393-pixel English
light mode and Chinese dark mode; prices, dates, stance and conditional text remain
readable. Fixture data is explicitly synthetic. Production acceptance remains pending
backend candidate availability; the earlier stock navigation release is already live.

Final audit correction: an absent price snapshot is awaiting calculation, rather than
automatically labeled missing prices. Known publication time, price coverage and window
maturity are distinct states. The coverage line explicitly counts loaded views only;
it is not a complete creator-history count. A regression loads an older mature losing
view after an uncomputed first page and verifies that both remain visible. Focused
creator UI tests: 9 passed. The backend supplies explicit returned-page pagination
metadata and keeps missing prices separate from missing publication timestamps.

The creator overview also labels its bounded channel sample and signals earlier
records when the backend reports truncation. The archive entry says “Browse indexed
videos” instead of suggesting a partial count is all channel videos. Chart evidence
labels recorded_at as the opinion-version timestamp, not first_seen_at.
Final local frontend suite after merging the tutorial release: 430 passed.
Exact-head CI run 34273615424 passed. The final two label changes explicitly say
“最新已记录收盘” / “Latest recorded close”. Pages was deployed manually after a normal
push to main; the repository's automatic Pages job is intentionally skipped.

## Actual production acceptance, 2026-09-08 20:14–20:23 UTC

The existing backend producer warmed canonical studies for posts 127, 166, 211 and
462 with no model/provider call. Nine accepted points were delivered to nine studies
with zero missing or mismatched records. The same four posts' map delivery checked
22 points across 11 tickers with zero missing or mismatched records. This measures
accepted-point delivery, not complete source extraction: NKE has no newly accepted
canonical opinion yet and its conditional source repair remains open.

Actual Chrome viewport width and document scroll width both measured 393 pixels
for Chinese and English creator-price and social-history screens. AVGO's accepted
bullish point claim:75b2c484c5bc6622e1a45ec5 displays the green stance separately
from the red -2.5% price change: publication reference $367.24 on September 2,
latest recorded close $357.90 on September 4. Its 20-session window is pending.
The main UI has no recorded-time, history-version or alternative-window selectors.

MU's saved social reading at 19:00 UTC displays detection reference and latest close
from September 4 ($1,016.59, compactly formatted $1,017), actual 0.0% change and a
separate red overheating-risk badge. The 20:00 reading has a September 8 reference
awaiting finalized prices. It remains missing; no earlier date is substituted.
The backend release coordinator owns the separate preceding-close context fix.

Saved production PNGs under `/tmp/ducky-evidence-validation-20260907/`:

- `creator-price-zh-393-production-20260908.png`
- `creator-price-en-393-production-20260908.png`
- `social-price-zh-393-production-20260908.png`
- `social-price-en-393-production-20260908.png`

The release coordinator receives these for independent OCR. The source-bound JSON
receipt is `/tmp/ducky-stock-navigation-qa/production-delivery-20260908.json`.
Some older legacy research snapshots initially lacked the new price context; their
views remained visible with “awaiting calculation”. The natural producer subsequently
populated the third legacy AVGO row without a manual source review or record rewrite.

Follow-up entry audit found that chart/watchlist `#/creators?ticker=AVGO` links lost
their ticker during initial state setup. Explicit stock links now filter the existing
related-content feed across creators and preserve the stock in language and research
navigation. The legacy implicit watchlist scope still shows the full people-first
feed, and name lookup clears the stock tag. Exact-source links keep their source.
Seventeen focused navigation, people-search and research tests pass, including a
real mount regression that retains an unfollowed AVGO creator and excludes TSLA.
This follow-up is queued for the next coordinated frontend release.
