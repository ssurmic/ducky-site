# Product journey QA · 2026-09-06

## Browser evidence

Used one dedicated Chrome automation tab, because the in-app browser was unavailable. No viewport
settings changed. Reused an existing signed-in session strictly for reads; no orders, follows,
watchlist changes, notifications, email sends or credentials were submitted.

- Production Profile opened successfully after the module hotfix: normal form labels/actions, no raw errors.
- Production watchlist and an individual stock chart loaded. The chart rendered 15 canvases without an
  error box or horizontal page overflow at the browser's existing desktop size.
- English registration exposes Google and email paths, required matching-password fields, and labeled
  controls. English password recovery exposes its verified-email input and request action with no error.
  No registration, reset email or password change was attempted. Signed-out live login was not repeated,
  because logging out would modify the shared existing session.
- English homepage navigation, public video example, loss-inclusive strategy comparison and app links
  were inspected. Pricing belongs to the parent release and was not changed here.
- Production creator simulation rendered the clearly fictional fall-then-rebound example. The response
  rule ends below holding, preserving the missed-rebound tradeoff instead of showing only a favorable case.
- Production leaderboard had zero eligible creators and 25 long, zero-sample rows. All were marked
  unranked truthfully, but they buried the explanation and navigation.

## Changes

Creator tabs, discovery/following scope, a public creator ID and explicit fictional-preview selection
now have canonical shareable URLs. Login return state keeps only these known public fields; arbitrary
queries, credentials and simulation holdings are discarded. The two approved radar screen IDs
`insider-oversold` and `institution-oversold` likewise survive sign-in. This enables meaningful homepage
links to the actual feature instead of dropping every visitor onto the default tab.

Simulation settings remain in memory while switching creator workspace tabs; they are never placed
in URLs, browser storage or server requests. Leaving/reloading the page still resets amounts, as the
existing visible explanation states. Language switches retain the selected tab/demo, not holdings.

All unqualified leaderboard rows now live inside a native disclosure with a visible count. Eligible
ranked rows stay immediately visible. No sample, losing result, price gap or ranking calculation changed.
Direct links to non-feed creator tabs start with intake collapsed so the requested feature is visible.

## Verification

- Full frontend suite: 90 passed; module graph tests: 5 passed.
- Bilingual build, copy lint and 708 internal links passed.
- Dedicated localhost browser fixture uses only mocked read endpoints and fake creator identities.
  Direct English demo URL rendered; changing simulated capital to $25,000, visiting Leaderboard, then
  returning to Play Around retained $25,000. The unranked disclosure kept all four fixture rows and
  was initially collapsed. Language switch opened the same explicitly fictional demo in Chinese.
- No real device, mobile viewport, payment sandbox, Google consent or delivered notification is claimed.

## Finding owned elsewhere

Production watchlist labeled the relative benchmark for TTMI and CRWV as “定制ASIC”. This is misleading:
TTMI is a PCB company and CRWV is a cloud infrastructure company. Parent was notified; peer taxonomy
and historical-return comparisons belong to a concurrent owner and were not overwritten here. Source
facts need deterministic company/peer validation before presenting an inferred group as an established
sector comparison. The original cached timestamps and original values were left untouched.

## Integration links

- `#/creators?tab=lab&preview=fictional` — clearly fictional interactive demo.
- `#/creators?tab=rank` — leaderboard and collection progress.
- `#/creators?tab=research&scope=discover` — all creators' recorded-view research.
- `#/boards?screen=insider-oversold` / `#/boards?screen=institution-oversold` — approved radar presets.

No push or deployment performed by this subtask. Parent owns SYSTEMDESIGN/tracker updates and production acceptance.
