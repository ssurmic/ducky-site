# Ducky UX journey review · 2026-09-28

Status: local frontend prototype only. No backend producers, account state, paid models, remote branch, production routes or deployment were changed. The previous local candidate is `9e174ea`; this report accompanies the next bounded prototype revision.

## Problem and resulting behavior

The interface exposed useful features but made their availability depend on where users entered. Explore had no cross-stock metric comparison; activity sent new users to an empty Watchlist; stock pages always claimed Watchlist as their parent. Repeated theme controls and a dense Today page made the first useful action harder to find. Prototype source views and saved items also lost identity across pages.

Explore now supports summary and metric comparison for all example stocks, including stocks the user has not followed. Each result names its overview, metric, map and disclosure destinations. Watchlist retains its list/overview/metrics roles and adds a direct metric entry in the fixed identity column. Both routes use the same stock workspace and readings.

Stock Overview begins with a company description and the research debate, then support/risk, sources and reference planning. Specialist metrics remain a named section. Stock navigation tracks the originating history entry, with separate reading positions for semantic sections. A metric deep link locates its named section once, without repeating that jump after a plan save or theme change.

Shared fictional creator IDs and view IDs now connect matching stock evidence to the creator source and saved-view list. Opening Saved resets unrelated discovery filters. A source deep link retains the exact view while navigating to a stock and back. Explicitly closing it returns to the list URL. The evidence timeline uses the actual example record dates; it no longer presents a current sample quote as an earlier price snapshot.

Today preserves the liked liquidity / QQQ / SPY comparison, with a visible compact entry and retained series/date/expansion. The lead story and important changes come before the activity preview. Empty-watchlist users receive one concrete NVDA reading task. Optional theme cards no longer precede the first stock result on phones, and theme bookmarks without a retrieval destination were removed.

Price-level actions now name and prefill the intended above/below condition. An upper wall does not open an already-satisfied downward condition. Missing or equal comparison prices require an explicit direction choice in metric/Watchlist reference actions. The secondary destination is My watch plans; these are still inactive local drafts.

## Persona review and second pass

Three independent agents reviewed the researcher, beginner and experienced-user journeys. They then implemented bounded Explore, Watchlist/metrics and Today changes in separate files. The root agent integrated the stock workspace, source identity, navigation state, copy and English handoff.

A second review found additional concrete defects, which were corrected:

- A stock opened from My watch plans inherited an unrelated return destination.
- A “follow changes” label actually opened a price-only plan.
- Creator Saved inherited unrelated ticker/search filters and hid newly saved views.
- Exact creator-view IDs disappeared from URLs before a stock round trip.
- One global stock return target corrupted older browser-history entries.
- Metric deep links replayed focus after every redraw.
- Stock Overview reused the scroll position of its Metrics section.

A phone browser pass also found a conflicting mobile tab style that added a blank grid row, and a nullable native append that rendered the word `null`. Both were corrected. Intermediate checks are recorded as debugging evidence, not shipped successes.

## Validation

Final verification:

- `node --test prototypes/ux-lab/acceptance.test.mjs prototypes/ux-lab/activity-adapter.test.mjs`: 23 test nodes passed (18 integrated journey cases, their parent and four adapter cases).
- `DUCKY_TEST_PYTHON=/tmp/qa-venv/bin/python npm test`: 773 existing frontend tests passed, including the build.
- `python3 scripts/lint_copy.py`: 4,055 files passed. `python3 scripts/check_links.py`: 2,067 links passed. The first checks overlapped the build's replacement of `dist/` and failed on disappearing generated files; rerunning after the build passed.
- Browser checks: 390×650 Chinese/dark and 320×600 English/light; Explore summary, empty-watchlist metric comparison, stock overview/metrics, source dialogs and saved creator views. No horizontal page overflow on these routes; the metric table scrolls internally.
- Browser action path: zero follows → nine-stock Explore metric table → NVDA IV/HV explanation → named metric focus → $230 upper-level plan with `condition=above` → back to the same comparison and horizontal position.
- Exact creator view and excerpt retained across stock/creator pages. Three independent reviewers rechecked the reported state defects; the original failure paths passed after corrections.

 The acceptance suite covers actual action paths: empty-watchlist comparison, section links and returns, shared creator source/bookmark identity, directional price plans, ticker-scoped activity, macro state and missing values. The prototype's fetch guard still permits locale files only, and its state stays inside the isolated preview namespace.

No measured user-study improvement is claimed. Agent scenario review and browser viewport checks establish implementation behavior, not real-world adoption or physical-device touch quality.

## Integration and remaining work

The backend mapping from the [activity review](UX-ACTIVITY-REFERENCE-2026-09-28.md) remains valid: Radar archive/record/coverage reads, shared stock data and existing account mutations are the intended owners. This revision changes presentation and navigation; it adds no request-time calculation or inference.

Production work still requires authenticated access/delay/pagination states, reviewed provenance for reference ranges, notification lifecycle wiring and account-owned bookmarks. The prototype's manually defined bounds are explicitly disclosed. Degen remains attention; no undervaluation index was invented. Calendar and existing full-source coverage limits remain as previously documented.

The English [change register](../docs/ux/change-register.md) and [persona/content map](../docs/ux/user-journeys.md) are the continuation entry points. They distinguish implemented UI, compatible read contracts, production wiring and deployment.

## Subsequent owner authorization

After this prototype review, the owner explicitly requested retaining green supportive cards and red risk cards, collating repeated opinions by the same author with history preserved, auditing all production connections, and deploying the new UI. That is the next implementation stage. This prototype acceptance does not claim that production integration or deployment is already complete.
