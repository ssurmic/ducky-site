# Watchlist and evidence reading acceptance · 2026-09-08

Changes:

- Heatmap defaults to equal-size cells. Each name retains a readable ticker, daily
  change and recorded price when giant issuers are present. The quote session remains
  visible. Exact market-cap areas are available via a separately labeled toggle; no
  financial calculation or investment weighting was changed. Missing-cap stocks and
  ETFs remain present in equal-size mode. Cap mode keeps a readable stock list open.
- The watchlist filter reuses the accessible, debounced symbol picker. Selecting a
  company only filters; adding requires an explicit action. Existing watched symbols
  are selectable for filtering, while the separate add form still disables duplicates.
  The original API owns entitlement and cap checks. No request-side market/model work.
- Search for opinions/authors/dates was removed from the evidence graph. Stock selection,
  stance filters, exact citations, history and source dialogs remain. A single expansion
  displays all returned graph nodes. Every selected stock center shows the recorded
  price and its session, with missing data kept distinct.
- Source-only research records show their original text and translation-unavailable
  state. They do not become fabricated directional claims or synthesis inputs.
- Creator pages display shared verified spans without upgrading full-video review.
  More than six spans now have an explicit expansion instead of silent truncation.

Validation before publication:

- 342 JavaScript tests pass, including explicit add versus selection, zero/missing/loss
  data, 50-symbol area conservation, source filtering, all-node expansion and untrusted
  source links. Existing calendar, creator, auth and billing regressions pass.
- Copy and link lint pass. App-module release isolation tests pass.
- Chrome viewport simulation: watchlist and evidence at 320×600 and 393×650, zh/en,
  dark/light (16 combinations); neither route overflows horizontally. No physical-device
  or touch-emulation test is claimed. Default phone cells measure 108px tall. At 393px,
  two complete rows fit above the bottom navigation. The first cell begins at ~318px;
  the narrow English case begins at ~349px. Evidence's first node begins at 255–257px.
- Shared creator span component checked in both languages/themes at both widths; no
  horizontal overflow. Full creator routes are additionally checked after release.
- Desktop 1366×900: 15 names remain readable with NVDA/AVGO present; cap/equal toggles
  preserve the list. Desktop graph keeps a visible center price and no opinion search.
- Isolated browser fixture verified CEG selection does not add, explicit Add changes
  the fixture count from 15 to 16 and renders CEG. No production watchlist was changed.
- Source dialog displays publication/observation and exact passage; close restores focus.
  “Show all viewpoints” expands a 15-node graph from six to fifteen without another fetch.

Backend coverage and limitations are recorded separately in the central evidence audit.
This release does not claim every source is ingested, every video reviewed, real-time
quotes, or that a source mention is a bullish view.

## Production walkthrough

Checked on production `7563d19` / Pages `f064fc7f` and the following expiry-display
release `8c2aa8c`, using the existing signed-in account without changing account,
watchlist, alert or billing state:

- At 393×650, watchlist, briefing, evidence, creators, calendar, radar, alerts,
  profile, billing and the AVGO chart loaded without horizontal page overflow.
- Production retains 15 watched symbols. CEG resolves to Constellation Energy and
  presents an explicit add action; the production action was deliberately not clicked.
- Profile Save, Save Password and Enable Web Push buttons are each 44px tall.
- Selecting the September 7 market closure opens a 369px-wide modal inside the
  393px viewport, retaining the closure state, next session and source link.
- The homepage “See how Ducky researches” link opens its research dialog and sets
  `#home-dossier`; the example includes dated price follow-up. Closing works.
- Public navigation includes creator/KOL views and the grouped feature directory;
  the historical ledger remains accessible outside the primary navigation. The ledger
  has no horizontal page overflow at 1366px or 393px; wide tables scroll inside their
  containers.
- AVGO's selected stock shows $357.90 with its September 4 recorded session. The
  August 5 TALK 君 context node opens the 22:20–22:31 source passage; July 20 opens
  7:09–7:15. Both appear in the creator feed with the same publication and source time.

The live creator walkthrough also detected a separate semantic defect: a Starlink
passage containing the adjective “bullish” was attributed to BLSH. It was escalated to
the shared evidence producer for correction and publication-gate regression coverage.
UI consistency alone does not establish issuer or claim accuracy; final backend
correction acceptance belongs in the central evidence audit.

### Final source-navigation acceptance

Frontend `32a785c` / Pages `33c27ec3` with backend `8010822` and its subsequent graph
refresh was checked independently in Chrome. Release gates report 344 frontend and
2,034 backend tests passing. The wrongly attributed BLSH material is absent from both
current views, while legitimate AVGO mentions remain.

Clicking the August 5 AVGO node opens creator `touzi-talk`, post `eMXOSnMyk0o`, point
`mention:3e806d42b4ac71101596542f`; the matching 22:20 passage receives visible focus.
Returning to all creators restores the 30-post page, and selecting Financial Education
displays its posts without retaining the old source filter. At 393×650, clicking the
July 20 node opens post `dAkVdEmVUP0`, point `mention:c97d537d64290db0a4bd5d4e`, highlights
7:09 and reveals its short source excerpt. The focused card fits between y=186 and
y=456; there is no page overflow. The browser viewport was restored after testing.

The first release check caught an old saved graph lacking new source-link fields.
It was refreshed through the normal graph producer before the above click-through
checks passed; merely deploying the frontend was not treated as sufficient acceptance.
