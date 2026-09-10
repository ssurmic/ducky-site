# Saved research reads · 2026-09-10

Status: implemented and locally verified; release/browser acceptance follows when completed.

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
account/access changes and successful membership/selection mutations invalidate previews.

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
