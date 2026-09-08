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
