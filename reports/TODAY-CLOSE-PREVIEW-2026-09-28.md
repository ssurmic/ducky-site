# Today close snapshot and saved event preview

Status: implemented candidate, locally tested; not merged or deployed. The prior production
receipt remains [Today freshness](TODAY-FRESHNESS-2026-09-28.md#production-release-receipt).
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

## Release boundary

No deployment, merger, production account write, notification, paid call or producer activation
was performed for this frontend slice. Backend activation and actual source coverage need
separate release evidence. The candidate can render the additive contract without claiming
that a new close edition has already been published.
