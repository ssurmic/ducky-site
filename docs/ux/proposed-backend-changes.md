# Proposed contracts for later integration

Status: design proposals, no backend implementation or activation in this change. Use existing owned read models and writes; final field names must be agreed with their owners. Most reordering requires no new API.

September 28 follow-up: the activity archive needs frontend integration with existing APIs,
not a new firehose backend. See the [verified mapping and public read checks](../../reports/UX-ACTIVITY-REFERENCE-2026-09-28.md).
The local pure adapter is tested against those field meanings; authentication, access-delay rendering,
coverage freshness and server pagination remain production wiring work. Track all UX decisions in
the [change register](change-register.md).

| UI need | Existing capability | Proposed addition / required behavior |
|---|---|---|
| Compact watchlist and overview | `/watchlist`, `/me/stock-research`, `/briefing/stocks?fields=signals` | Reuse existing quote clocks and reviewed overview; distinguish missing summary, stale retained summary, withdrawn evidence and valid empty data. No new inference on read. |
| Long-term and trend perspectives | Existing `digest.views.left/right` | Keep the two viewpoints separate from bullish/bearish source stances. A missing reviewed viewpoint must not hide available numerical facts. |
| Option walls and support | Existing `option_concentrations`, daily ranges and moving averages | Retain snapshot time and expiry. Show modeled Gamma concentration levels, the 20-session closing low and averages separately. A price below an old support must be labelled breached, not silently presented as support below the market. No new calculation on read. |
| IV/HV20 and attention | Existing near-expiry ATM IV, HV20 and Degen | Preserve expiry-specific IV / annualized 20-session realized volatility, components and ratio. Do not substitute fixed-30-day IV. Degen is attention from mention volume, growth and ranking; it is not valuation or directional sentiment. No synthetic per-stock undervaluation score. |
| Today three-line comparison | Existing macro observations and history | Reuse dollar funding score, 10-year yield and QQQ/SPY observations with their original session dates. Normalize each plotted series independently over the displayed window, retain raw units on selection, and disclose insufficient/flat series instead of inventing a line. No inference on read. |
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
