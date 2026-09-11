# Saved research reads · 2026-09-10

Status: frontend deployed and production add/remove/return workflow verified. Backend companion deployment is recorded in its linked report.

The owner wants existing analysis to display while updates run in the background. Previously each
route initialized a blank analysis map, and a failed watchlist research read erased accepted text.
Saved server summaries still took several seconds to validate across the whole watchlist.

## Behavior

Watchlist, Today, shared stock briefs, stock pages and information maps now preview content already
read in the current authenticated session. Every visit still makes the original fresh GET; no
per-view generation, provider acquisition or new queue is introduced. Stock/map navigation can
reuse the same complete graph. Prices and original analysis timestamps remain separate.

The preview cache is memory-only, at most 32 entries / 8 MiB / five minutes since that read. No
localStorage, sessionStorage or service-worker copy of private research is created. It is scoped
to auth epoch, token, user identity, tier, effective-access policy and evidence selection. Logout,
account/access changes and evidence-selection mutations invalidate previews. Membership changes
update only affected rows and preserve other saved summaries.

Ordinary network failure preserves accepted content and displays the read error. An authoritative
withdrawal, source-change or unavailable result replaces old content and invalidates corresponding
stock/map previews; source dialogs close when their backing content changes. Permission errors
remove saved private content. History/version requests are excluded from this cache.

A preview can briefly precede a source correction received by its fresh GET (normally bounded by
the existing 15-second request deadline). It is not independent proof of present source validity.
A cold browser load or first visit still needs network reads. This improves return navigation and
outage behavior; it does not claim universal zero-latency loading or complete content coverage.

## Verification

Full local suite: 652 passed before the final additional map-navigation test; final targeted suite
27 passed, plus cache/security tests. Exact release CI reports the final total. Tests cover visible
cached content before requests resolve, offline retention, fresh withdrawal replacing prose and
closing a source dialog, private-session isolation, permission denial, TTL, membership changes,
copy isolation and stock-to-map reuse. Copy/link checks pass. A previous test expectation was
updated deliberately: a failed refresh now retains previously accepted rows and its error.

Backend companion: request-local source read reuse measured 61 identical projections at 5.269s
before / 0.784s after, with 55 readable summaries. That is server projection time, not browser p95.
Source fidelity failures and missing summaries remain visible and require their original review
workflow. No model/provider/admission/retry-budget configuration was changed.

## Watchlist membership and read diagnostics · 2026-09-10

Following one stock must preserve other saved summaries. The frontend updates membership
without clearing the whole authenticated read cache. A newly followed stock may reuse its
already-read complete graph; missing content remains pending, and the original read expiry,
analysis date and citations remain. Fresh GETs still replace revoked or changed content.

Shared research responses carry `X-Ducky-Read-ID` and `Server-Timing: projection;dur=…`.
One `ducky_shared_read` backend receipt records the same ID, resource, status, elapsed time,
read-only source count, memo checks/reuse, item count and readable count. Browser diagnostics
separately record cache hit/miss, HTTP response/failure and actual rendered counts; a successful
HTTP request is not proof that the page displayed a summary. The browser ring is limited to
100 entries; logs omit tokens, account identifiers, tickers, URLs and source/prose bodies.
CORS exposes the response headers without an extra request header or network call.

English symbol search now receives separate English sector/industry display fields. Legacy
Chinese-only labels are omitted in English during a rolling release; source names and search
ranking are unchanged. Local checks: 657 frontend tests before the final reuse regression,
5,153 backend tests / 6 skipped before the final additive symbol test, and 9 final focused
backend tests. The local backend count includes a separate unshipped source-note candidate;
exact CI and runtime/browser acceptance are recorded separately.


## Production release and actual workflow

PR27 / main `c32754e4` first shipped saved reads as Pages `016f76d5` (graph
`ff0a0ed0b97c639bdb43`). PR28 fixes the remaining blanket membership invalidation:
main `8d2ca66f4bb3ec645cc7dcc6934852a5b855f43b`, Pages `69e1817f`, graph
`1b55a934e9e6412c5be5`. Both PR CI `34545702304` and exact main CI `34545847535`
passed **658 tests**, copy lint and 1,274 links. Six public entry/module/manifest files
byte-match the deployed build. [Asset receipt](saved-read-20260910/assets.json).

Actual authenticated Chrome walkthrough, 2026-09-11 approximately 00:21–00:24 UTC
(September 10 local time), 1695px desktop viewport:

| Step | Observed result |
| --- | --- |
| Fresh Chinese entry | List first, Overview second; 45 rows and 41 readable summaries after the initial read |
| Explore → search ADBE → select | Stock page has a direct and embedded research map; 19 records; dated 9/10 close; missing summary is explicit |
| Follow ADBE → return to Watchlist | 46 rows, the same 41 summaries, no list-wide loading text; ADBE alone has no summary |
| Switch to English | Same 46 rows / 41 summaries and List-first order |
| Unfollow test stock → return | Original 45 rows restored; 41 summaries remain; ADBE absent |
| Manual refresh | 45 rows / 41 summaries remain visible |
| Stock-row map action | One click opens NVDA map with existing summary, source dates and 9/10 price |
| ADBE map → creator evidence | Opens the exact video and reviewed passage with a 19:45 original-video link |

The test subscription was removed; all original subscriptions remained. DOM observations
verify visible behavior; the deferred-request regression separately proves rendering occurs
before the fresh GET resolves. This was not a physical-phone test or a browser p95 measurement.
Cold language entry still needs a network read. Backend facts, source review coverage and
minute-quote continuity are separate acceptance criteria. Some original-source summaries
remain unavailable; cache preservation does not fabricate or approve them.
