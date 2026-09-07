# Homepage stock lookup: light-mode contrast

The owner reported unreadable text after entering a ticker in the homepage
“先查一只股票” section on a phone in light mode.

The card used undefined `--card` / `--line` variables with hardcoded dark
fallbacks while its text inherited the light palette. This produced dark text
on a dark background. The ticker input, chips and separators also used fixed
colors; action links used the bright brand orange in both themes.

The stock card and market-focus card now use the existing surface, text and
border tokens. Inputs and ticker chips use theme-aware control colors, and
record/action links use the theme-aware orange text token. The change is
limited to this section's CSS.

Validation:

- 196 frontend tests passed; module-graph tests: 4 passed, 1 optional skipped.
- Build: 20 pages; copy lint: 1,593 files; link check: 728 links, no warnings.
- Backend selftest: ALL GREEN, including 783 pytest tests.
- Browser matrix: Chinese/English × light/dark × 320/390/1440px, with three
  real public NVDA records loaded in each combination. No horizontal overflow.
- Inspected text contrast: minimum 4.82:1 in light mode and 7.40:1 in dark mode.
  Loaded market-focus news and the unavailable state were also reviewed in
  light mode. [Measurements](stock-light-2026-09-06/contrast.json).
- Local browser QA sets `data-theme` through a temporary server and proxies
  read-only public API data to avoid localhost CORS. This helper is outside
  the repository and is not included in deployment. Physical iOS/Android
  devices were not tested.

Screenshots: [Chinese light](stock-light-2026-09-06/zh-light-390.png),
[English light](stock-light-2026-09-06/en-light-390.png),
[Chinese dark](stock-light-2026-09-06/zh-dark-390.png).

Production: released source `671a6a68`, Pages `4a870af4`. Both formal homepage
languages reference `/css/site.css?v=671a6a68`; downloaded CSS matches the
committed file byte for byte (SHA-256 prefix `b68621d82dad5045`). Live Chrome
at 390px loaded three public NVDA records with the dark theme, the new themed
surface, and no horizontal overflow. Light-mode validation is the local
forced-theme matrix above; no operating-system preference was changed.
