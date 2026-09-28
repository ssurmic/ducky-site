# Observed UX audit · 2026-09-28

The owner asked for an integrated new-user experience and a clickable UI before backend work. The supplied meta prompt is design background, not a requirement to stop at every suggested approval stage. This prototype is a review artifact, not a production release.

Audit sources: rendered authenticated Ducky pages in Chrome, the two supplied screenshots, current frontend source at base `3666f37`, and the provided UX brief/system walkthrough/design review. Production watchlist was only read; it was not cleared to simulate a new user. Empty-state findings came from code and are exercised separately in the prototype. Browser-rendered observation is distinguished from code inspection below.

| Surface | Observed problem | Consequence | Design response |
|---|---|---|---|
| Watchlist | Rendered list has a checkbox plus 16 information/action columns; long thesis paragraphs are visible in parallel. Separate add and table-search controls. | The user must compare unrelated kinds of evidence before identifying a meaningful change. | Default to a scanable list: company, quote, change in research, reference level, next event. Expand metrics, preserve direct map and chart access. |
| Watchlist empty state | Code ends in the generic empty component. | The user cannot judge the value of following a stock. | Readable starter stock rows and an explicit sample-list action; no automatic production follows. |
| Overview | Existing information repeats across long signal/summary components. | Switching views does not establish a different, useful reading mode. | A concise research card per stock with the change, supporting view, risk, reference, and next event. |
| Creators | First rendered author has 29 views; four long excerpts are shown before the second author. At the default desktop viewport only one author dominates the first screen. | Useful tickers and differences across creators are buried. | Cross-author views first, ticker filters, visible author directory, a source drawer and individual author profile. |
| Explore | Supplied screenshot/source show six large Reddit-attention cards and a second general creator feed. | Prominence says little about why a stock deserves research. | Research questions with named related stocks first; discussion volume stays a compact, separate attention measure. |
| Calendar | Rendered two-week cells are useful; explanation is behind day selection, while historical monthly returns sit below the full grid. | New users must already know which event matters. | Three upcoming events with a one-line impact, then the calendar and full event detail. |
| Today | Clear dated market close note, market context, macro creator coverage and research changes. One research-feed block returned an error; macro and recent saved analyses remained readable. | The core daily orientation works; partial failure should not erase healthy sections. | Preserve day-at-a-glance structure, make the transition into a stock obvious, keep retained-content error state. |
| Stock | Source inspection shows research map before some price context. | A person seeking a price or next event must navigate deep into the page. | Stock as the common hub: change and price plan first, evidence and history directly reachable. |

Data observations to retain separately: one rendered creator row used an AMD label with prose about Grab; some saved stock descriptions equated quarterly disclosure proxies with purchase cost. These need source/meaning review. The prototype does not reinterpret those records or treat a new UI as correction evidence.

Acceptance priorities: one coherent empty-watchlist journey; first-screen ticker and meaningful viewpoints; direct maps; price reference with basis/date/risk, not an unsupported instruction; usable 320/390px layouts; keyboard and dialog focus; explicit local-only saves; unavailable data never shown as zero.
