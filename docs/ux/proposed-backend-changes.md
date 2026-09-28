# Proposed contracts for later integration

Status: design proposals, no backend implementation or activation in this change. Use existing owned read models and writes; final field names must be agreed with their owners. Most reordering requires no new API.

| UI need | Existing capability | Proposed addition / required behavior |
|---|---|---|
| Compact watchlist and overview | `/watchlist`, `/me/stock-research`, `/briefing/stocks?fields=signals` | Reuse existing quote clocks and reviewed overview; distinguish missing summary, stale retained summary, withdrawn evidence and valid empty data. No new inference on read. |
| Reference range | Existing price, range and options fields | A shared stock reference object with `state`, `as_of`, `currency`, `method`, `window`, `levels[]`, `source_ids`, `valid_until`, and conditions that invalidate a level. Each level includes type, value/range and evidence. This is not a personalized recommendation. Missing/expired/insufficient evidence must suppress a numerical recommendation. |
| User-defined plan | Existing alert draft workflow | A structured draft for `ticker`, `operator`, `value`, `currency`, `expires_at`, optional user note and reference IDs/version. Save acknowledgements distinguish draft, pending, paused, active, rejected, failed and expired. UI must not say active from HTTP 202 alone. |
| One-click conditions from a row | Existing ticker-only alert route | Typed context or allowlisted deep-link prefill; server validates supported predicates. A level can prefill an editable draft but never submit silently. |
| Creator first-screen views | Verified creator spans, current feed and history query | Prefer existing verified span rendering. A bounded cross-author feed can supply claim/source/creator IDs, stance, publication time, observation time, last correction and related tickers. Pagination and filters remain server-owned for actual production results. |
| What changed since last visit | Existing research change/history outputs | Stable change IDs with original/source revisions and verified baseline. A missing baseline is not “0 changes.” Keep a source correction separate from a new bullish/bearish stance. |
| Explain why a theme contains a stock | Existing source-local associations | If absent, proposed typed relations: company-direct, peer-context, broad-market; link exact source IDs and qualification. Do not spread one video's full ticker list over every theme. |
| Calendar impact | Existing event hint, relationship and historic-comparison components | Move existing meaning into the first screen. Retain event time and time certainty, market session, original source and complete historical return windows. No need for per-viewer calculation. |
| Save a view | Prototype browser bookmark | Decide whether a production bookmark belongs to an existing member record; retain claim/source revision and the behavior when the source is withdrawn. No independent evidence store. |

Error contract: an unavailable quote is `null` with a reason, never zero; insufficient reference evidence gives a textual state; rejected or withdrawn sources are not replaced with unrelated text; unsupported alert predicates return actionable validation; paused delivery has a visible state. All dates keep their original meanings and time zones.

Before production integration: map prototype fixtures to existing validated fields, remove fixture-only text, test account epoch isolation and late responses, preserve source withdrawal gates, verify full creator filters before pagination, then run the frontend suite and owner review. Deployment and service activation remain separate operations.
