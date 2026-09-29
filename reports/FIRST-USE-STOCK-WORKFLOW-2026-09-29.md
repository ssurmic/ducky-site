# First-use stock research — 2026-09-29

Status: implemented and locally accepted; production release requires the reviewed merge and deployment receipt.
Baseline frontend: `70b72adb58a1dec3432c44af6f93ab99493a46ad`.
Shared backend design reference: `fec9a4959a976e53d92300d33d7d16d9721e77f4`.
This report describes public UI behavior. The private backend handoff remains the current architecture authority.

## Design decision, reviewed before implementation

An empty personal list should help the reader choose a company to research, then save it deliberately. Three independent reviews covered the beginner's first minute, experienced/researcher journeys, and source-to-stock integration. They challenged an Explore redirect and a mandatory selection wizard; the selected design reuses a short dated Explore preview in place, without copying its whole feed or adding sample membership.

- Color: reuse Ducky's existing dark base `#0b0f14`, surface `#121821`, text `#e6edf3`, action orange `#ff9000`, support green `#3fb950` and risk red `#f85149`, plus their existing light theme tokens. No new palette or semantic color remapping.
- Type: preserve the existing system/PingFang stack. Company names and tickers lead; reading text 13–14px, secondary metadata 11–12px, search input 16px, common targets at least 44px. Reduce repeated instructions and empty surfaces before reducing type size.
- Layout: left-aligned, single search, then four compact company rows within reading width. The existing Stock workspace is the detail view. No new preview modal, full-page welcome card, mandatory persona question or automatic follow.
- Principles: real saved source dates; discussion attention is not sentiment; inspect before saving; one explicit membership action; preserve exact claims and missing states. Brand chrome stays quiet while actual companies occupy the first screen.

```
Watchlist  0/50
Research first; save a company when you want to follow it.
[ Search company / ticker                         ]
Recently discussed                 Collected date
Company / ticker         Discussion count    Open
Company / ticker         Discussion count    Open
Company / ticker         Discussion count    Open
Company / ticker         Discussion count    Open
More stocks to research
```

Critique of the initial plan: a centered duck illustration plus another search CTA repeats the same task without showing value. A four-card recommendation carousel implies curation that the API does not supply. Replace both with source-ranked, dated rows and plain research actions. Keep the existing stock metrics/maps and Today liquidity comparison; this change addresses entry and continuity, not calculation semantics.

## Bounded behavior

Empty Watchlist retains one company search. Selecting a result or a saved discovery candidate opens the existing stock workspace without membership mutation. The normal explicit Add action retains directory/server eligibility checks. Failed or stale discovery never becomes fabricated sample data, and the search remains usable. Non-research entitlements retain the existing manager path.

Stock membership uses consistent Add to watchlist / Remove from watchlist wording. A successful Add shows a ticker-specific inline confirmation and View watchlist link, without auto-navigation or a promise of push delivery. Today offers a compact Research a stock entrance only after an explicit zero-watch response; existing market charts remain.

## Acceptance and release

Local acceptance on September 29:

- Three reviewers independently audited new-user Watchlist, cross-page journeys and stock publication. Root reviewed the integrated changes. The independent Watchlist code review found no blocking regression. Root found and fixed a Today race: a late zero-watch summary must not reopen the entry after membership was added; the regression is tested.
- Full frontend build and **882 Node tests passed**; **14 Python tests passed**, copy lint passed, and **2,109 internal links** passed. The first integrated run had two new-test failures (a locale added during integration and an invalid expectation that a completed fetch's detached abort signal would later abort); both were corrected, with final tests green.
- Local browser fixture is explicitly synthetic, uses loopback only, forbids external requests and keeps its test Add in memory. The real production empty-account audit was read-only. No actual account membership was seeded.
- Browser interaction: empty search → NVDA Overview → Research Map → explicit Add → success notice, retaining the map tab and button focus → View watchlist → actual fixture 1/50 row in default List. There was no POST before the explicit Add. A failed ranking still allowed a valid MU search result.
- At actual **320×600 CSS pixels**, both languages and both themes showed **three complete company rows**, with 494px of content height. First row began at about y=262 (Chinese) / y=282 (English). At **390×700**, all four rows were fully visible, with 594px of content height. Inputs measured **16px / 44px high**, with no document overflow. This was viewport simulation, not touch emulation or a physical device.
- Desktop 1440×900 exposed a pre-existing flex interaction that put the empty search to the right of the title. The final override reserves a whole header row, constraining only the input to 850px: search and candidates both begin at x=261.2. The source-dated rows remain left aligned and all four are visible. Chinese/dark and English/light were visually inspected, with phone themes checked in the eight-size/language/theme matrix above.
- Today zero-watch entry is visible before the unchanged macro component (English 390×700: entry y≈121, macro y≈175); its success/unknown/access-change states have regression coverage. No macro calculation or chart data changed.

Production release and real-source verification must be recorded separately from these local checks in the shared English backend handoff. The rollback baseline is frontend `70b72adb58a1dec3432c44af6f93ab99493a46ad`.

## Remaining scope

The new native creator opinions have a distinct reviewed-summary capability. Their research-map/feed integration remains a separate backend projection task; this slice does not turn native paraphrases into transcript evidence or support counts. A readable source card is not a new source-fidelity verdict. No source correction, model call, notification activation, account seed, migration or provider fetch belongs to this UI change.
