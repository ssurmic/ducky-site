# Today close snapshot and saved event preview

Status: frontend assets deployed as `e19f4bbc`, verified on 2026-09-28 at 23:19:45 UTC.
The first live close snapshot was read on 2026-09-29 at 00:13–00:18 UTC; the compact
follow-up below is a tested candidate, not yet a separate production release. See
[the receipt below](#production-release-receipt). The prior production receipt remains
[Today freshness](TODAY-FRESHNESS-2026-09-28.md#production-release-receipt).
Frontend base: `8cfb816e74ec06a04daa23570a57acc1c36ad649`; the matching additive backend
contract was reviewed against backend base `bc18b0658ecb68e3db26e83d1c017d05ca5c655e` and
its close-digest candidate. No runtime publication is established by these tests.

## Reading contract and limits

Today still reads only `GET /macro/beta`. A saved digest may add `edition=close_snapshot` or
`daily_close`, `publication`, and `preview`; documents without those fields retain the prior
four-section rendering. A close snapshot explicitly describes quotes captured near the close,
with the source data-as-of time in ET, available/expected counts and missing instruments.
A date-only daily-bar as-of value remains a date; it is not converted to a fabricated prior-evening ET timestamp. It does not claim final settlement, complete market coverage or an exact publication deadline.
The server's edition controls that label; wall time and the older `ready`/`stale` states do not.
`phase=revised` marks an updated edition without replacing the saved dates.

The structured preview must match the digest's `anchor_session`. A mismatched preview is
withheld rather than attached to another note. The next calendar day and next market session
are separate labels. Events retain their individual dates, exact ET time or confirmed timing
category, unconfirmed time, tickers, complete conditional impact and original HTTPS source
links. Source-record dates remain separate from the preview preparation clock; date-only
source records are not converted to the previous evening in New York. Impact explanations
describe mechanisms or attributed source notes, not predicted outcomes.

Three saved events appear initially; a named disclosure gives the remaining count and total.
Every returned event remains in that disclosure, including same-session after-close or
time-unconfirmed earnings. Additional impact conditions, original notes and source links
remain in each event's details. `ready`/`empty` calendar coverage is distinguished from
`partial`/`unavailable`; missing records with unconfirmed coverage never mean “no events.”
The Calendar action uses the existing date route. Opening the preview makes no per-event
request, source acquisition or inference call. `today_events`, when supplied for the close
writer, is not mixed into the forward event list.

Current-date notes remain expanded. Older notes and their original preview remain together
in the dated archive disclosure above the macro tiles. The existing research and macro paths
remain available. This frontend does not control the producer schedule, source arrival,
replication delay, source completeness or revision retention.

## Refresh and continuity

A mounted Today page rereads the same saved endpoint at 60-second intervals while visible
and online; an explicit Refresh published data control remains available. These checks do not
infer publication phase or trigger generation. Unchanged content is not repainted. A changed
edition preserves keyed disclosures, keyboard focus, selected historical chart date and the
visible content anchor. Route cleanup aborts outstanding reads and removes listeners/timers.
Account epoch guards reject late responses. Hidden/offline pages pause periodic reads.

A temporary read failure retains the last accepted view with a GET-only retry. Access denials
remove the earlier private content. The API's existing authentication, timeout and cache
revocation contract remains in effect; the new code adds no account writes or subscriptions.

## Local acceptance

The focused suite covers initial/revised/legacy editions, object and string missing lists,
actual zero, all eight synthetic events, timing categories, conditional impact/source details,
unsafe links, historical anchor mismatch, weekend date separation, incomplete coverage,
visible refresh, unchanged response reuse, hidden/offline/disposed behavior, transient errors,
access denial, account/abort fencing and focused chart-date restoration.

The full build and 839-test Node suite passed before the final date-only correction; final committed-candidate
validation is recorded in the PR. The independent Python checks passed 3 export, 8 homepage
proof and 3 creator-source tests. Asset isolation passed 4 tests with 1 expected local historical
graph skip. Copy lint and 2,103 internal links passed. The homepage proof test deliberately
prints an invalid-fixture diagnostic while succeeding.

`tests/browser/today-close-preview.mjs` exercised 12 isolated Chromium combinations:
320 × 650, 390 × 650 and 1440 × 900, each in English/Chinese and light/dark. Phone runs use
touch emulation; these are not physical-device or production checks. All passed with no
horizontal document overflow, runtime errors or outbound requests. Eight synthetic events
were reachable; remaining events and per-event details opened, source/Calendar links retained
their targets, and visible preview controls were at least 44px high.

At 390 × 650, the available app content was 544px high. The snapshot began near y176; the
preview began near y463 in Chinese and y517 in English, with the first event near y560/y614.
At 320 × 650 it began near y479/y551. This is a full reading page: event impacts require a
short scroll on phones, and all eight are not claimed to fit above the fold. Main event text
remained 13px; dates and source metadata remained secondary. An initial screenshot attempt caught the route fade transition; those visual measurements were discarded. The corrected script waits for every digest ancestor to have computed opacity 1 and disables animations for capture. Regenerated local PNGs and geometry JSON
were inspected; no screenshot of synthetic data is presented as live market acceptance.

## Original candidate boundary

Before the release below, the implementation and local checks did not perform a deployment,
merger, production account write, notification, paid call or producer activation. That earlier
acceptance established rendering of the additive contract, not publication of a new close
edition. Backend activation and actual source coverage require their own release evidence.

## Production release receipt

[PR #111](https://github.com/ssurmic/ducky-site/pull/111) merged at **23:18:28 UTC** as
`e19f4bbcbe69368124ab57c98160341fb1375980`. Its hosted check passed in 2m0s (run
`36497062007`). The official publisher reran the bilingual build, **839 Node tests**,
**14 Python tests**, copy lint (**4,111 files**) and **2,103 links** against that exact
merged main revision, all passing, and exited 0. [Pages `73924238`](https://73924238.ducky-site.pages.dev) was published; production `VERSION=e19f4bbc`
and CSP were verified at **23:19:45 UTC**.

The additive UI renders server-labelled close snapshots/daily-close editions, source
as-of dates/times, actual coverage and missing instruments. A saved structured preview
keeps every returned event, typed timing, conditional impact and original HTTPS sources;
older previews remain bound to the original digest session. Date-only daily-bar as-of
values remain dates, not fabricated prior-evening ET clocks. Visible Today pages reread
only the existing shared endpoint each minute, preserving disclosures, focus and chart
selection; hidden/offline/disposed/account boundaries and access revocation remain.

Local acceptance used 12 isolated Chromium combinations at 320 × 650, 390 × 650 and
1440 × 900 across English/Chinese and light/dark, with touch emulation on phones. The
final captures waited for every ancestor opacity to reach 1; an earlier mid-transition
capture was discarded. All eight synthetic events were reachable, source/Calendar controls
were at least 44px high, and no overflow, runtime error or outbound request occurred.
These were viewport simulations, not physical-device or live-content acceptance.

**Initial live content acceptance:** at 00:13–00:18 UTC on September 29, the authenticated
Chinese/dark 390 × 700 and English/dark 1440 × 900 pages displayed the September 28
close snapshot, published at 00:11:49 UTC, with its actual **2/19** instrument coverage.
The NKE event retained its September 28 date and unconfirmed time. The Calendar link
selected September 29; event details and the separate 02:32 ET source-record time were
readable. Neither viewport had horizontal overflow. These observations establish that
this saved edition and event list were readable, not complete instrument or calendar coverage.
The earlier refresh control and Friday archive were also readable after asset deployment.
No account write, alert, notification or model call was part of these browser checks.

A separate backend source-selection issue remained at this observation: the close prose
used older yield/VIX readings (5.17/14.21) while the stored current panel held 5.24/16.07.
This frontend follow-up does not repair or certify those source choices. Its correction
and any subsequently published edition require their own backend evidence.

## Compact preview follow-up candidate

For the known `market-digest/1.3` close-snapshot contract only, a valid same-session
structured preview replaces the duplicated deterministic date/count/coverage paragraph
in the visible presentation. The source document is not changed. Daily-close notes,
legacy editions, unknown versions and malformed or mismatched previews retain their
exact original prose. Invalid preview dates cannot suppress the fallback paragraph.
The structured list still retains every returned event and its source details.

English now uses “1 scheduled event” for exactly one event. More than five missing
instruments use a counted native disclosure; the available/expected count remains visible,
and the full missing list remains accessible through a control at least 44px high.
The disclosure uses the existing session-bound reading-state key so refresh preserves it.
There are no new endpoints, timers, requests or backend operations.

The 27 focused Today tests passed, including source immutability, all prose fallbacks,
0/1/2 grammar, full missing-list retention and the existing refresh/account/access guards.
Two synthetic scenarios passed all **24** isolated Chromium combinations: an eight-event
preview and a sparse 2/19 snapshot with one unconfirmed earnings event, at 320 × 650,
390 × 650 and 1440 × 900 in both languages and themes. Each capture waited for ancestor
opacity 1. All events, disclosures, sources and Calendar links remained reachable;
refresh retained the opened disclosure, controls measured at least 44px, and no document
overflow, runtime errors or outbound requests occurred. These are local viewport/touch
simulations, not additional live-content or physical-device checks.

For the sparse fixture at 390 × 650, the preview began near y438/y473 and the first event
near y535/y570 in Chinese/English. At 320 × 650, the English event begins near y654 and
requires scrolling; the complete note is not claimed to fit above the fold. The available
app content remained 544px high and event reading text remained 13px. Original PR #111
measurements above describe its earlier synthetic fixture, not this compact candidate.

The final candidate's bilingual build and **842 Node tests** passed. Python checks passed
3 export, 8 homepage-proof and 3 creator-source tests; asset isolation passed 4 with
1 expected local historical-graph skip. Copy lint scanned 4,234 files without violations;
2,103 links passed. The invalid homepage-proof fixture deliberately prints a diagnostic
while its test passes. Hosted CI and the subsequent publisher receipt must identify their
exact revisions; the initial production facts above remain separately dated.
