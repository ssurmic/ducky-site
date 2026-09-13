# Stage A requirements · reconstructed from supplied MDs

This is a working acceptance checklist derived from the three supplied documents. It does not
claim to be the missing original `03_TASKS.json` or `04_ACCEPTANCE.md`.
Owner clarification 2026-09-09: finish both phone and desktop; interactions must feel smooth
and professional. Owner agreed to isolated current-mainline baseline; original dirty directories
stay intact. Three agents: one implementation/browser owner, two independent read-only reviewers.

| ID | Requirement | Acceptance evidence |
|---|---|---|
| R01 | Keep public homepage A/B/C and all previous routes | Baseline build/old-route smoke; default page targets unchanged |
| R02 | Separate authenticated preview, default off | CLI/build config tests; disabled no new module/CSS/API request |
| R03 | Reuse safe existing bounded research reads | `/kol/research?limit=100`, `/watchlist`; API contract/read-side audit |
| R04 | Watched/all readable scopes; useful first three records | Browser and 100-record view tests; no irrelevant fallback in matched scope |
| R05 | Filter by ticker/creator/date/text with truthful limits | Server ticker/creator keysets; local date/text; at most five user-requested pages |
| R06 | Original source offset, excerpt, conditions and historical versions | Zero/unknown offset tests; original and correction retained; actor/position semantics |
| R07 | No false coverage, timestamp, direction or validation claim | Unknown clocks remain unknown; missing counts use —; source check remains unknown |
| R08 | Dedup only identical known records; preserve conflicts and losing evidence | Adversarial adapter tests; each point independent of sibling changes |
| R09 | One selector powers list and count drill | Counts, local ticker filter and original cursor binding tests |
| R10 | Smooth navigation/filter input/paging | Abort stale work; input focus stable; keyboard focus and reading scroll restore |
| R11 | Account isolation and auth unchanged | No response persistence; session epoch/user gate; existing backend owner tests |
| R12 | Phone 320×650 and 390×650, both languages/themes | Screenshots, first useful content position, main height, overflow/touch target checks |
| R13 | Desktop 1280×850, both languages/themes | Hierarchy, readable source actions, detail expansion and adjacent overview |
| R14 | Professional restrained UI | Existing brand/theme; clear spacing, type hierarchy, neutral evidence states; no chart library |
| R15 | Keyboard/reduced motion/error recovery | Visible focus, native disclosure, async status, reduced-motion CSS; local errors retain exit |
| R16 | Old-page and 100-record performance | Five-run timings; old requests unchanged; no per-card fetch/model or background polling |
| R17 | Real retained data is separate from synthetic UI testing | Dated provenance + actual fields/IDs check; no fixture relabelled as live |
| R18 | Deliver reviewable changes and rollback | Diff, commands/logs, default-off rebuild, no push/deploy; final release-review report |

Scope differences identified by review: this existing endpoint has saved research, not every
discovered video/mention. Full original records remain accessible through the old creators
workspace. No acquisition-speed, sentiment, trading return or complete-history search promise.

No new payments, schemas, migrations, producers, external data APIs, dependencies, model calls,
notifications or production writes. Native device testing and production release are unperformed
unless explicitly documented later; browser viewport tests must not be described as device tests.

## Owner release update · 2026-09-09

The owner approved publishing, then explicitly requested a more visible entry, green bullish / red
bearish author labels, and a price comparison delegated to the data reviewer. These supersede the
local-only release boundary above; previous evidence remains dated local evidence.

- R19: desktop Brief directly after Watchlist; mobile Brief second primary item. Information Map
  remains accessible in More. The existing default-off navigation is restored by a false override.
- R20: author bull/bear labels and thin card borders use green/red, with text retained. Stock price
  movement has separate color, independent of author stance.
- R21: reuse call.price_context from the same study response. Display publication reference close,
  latest recorded close, separate trading dates and saved percentage change. No per-card API/model
  work, no intraday/filled-trade/strategy return claim, no reversal for bearish views.
- R22: preserve provider/corporate-action review gates, missing history and date uncertainty, actual
  zero movement and losses. Allow an explicit production site setting with CLI rollback.

Additional coverage: 8 pure price contracts plus an independent-direction view test, 3 release-flag
Python tests, 581 frontend tests, updated 12-case browser matrix; production acceptance is in RELEASE.md.
