# Website content navigation and reading · 2026-09-08

## Implemented behavior

The application separates event radar, market reports and opportunity tools. Parent destinations are links with independent disclosure controls. Child links have quieter typography and only the current link receives accent color. The mobile More menu uses the same tree and closes after navigation. The homepage catalog also includes market reports and links its categories to their actual parent.

A list entry links to `#/record/<encoded ID>`; full text is rendered only on that destination. The reader preserves the report date, sections, actual figures, losses, missing evidence, sources and outcomes. Telegram decoration and redundant bilingual headings are presentation-only transformations. Original stored text remains collapsed and unchanged. No model, data-provider call or investment algorithm change is introduced.

## Identity and access

`radar_archive.record` shares the existing public/private archive filters. `/public/radar/record.json?id=…` applies the five-day cutoff; `/radar/record.json?id=…` requires fresh Pro and is private/no-store. Hidden receipts and excluded kinds remain inaccessible. Source delivery aliases resolve to their existing source record. The website keeps canonical source IDs, not a new per-user copy or table.

New daily, market, macro and week-ahead reports carry one generated report ID and an explicit language on their two existing deliveries. Unique EN/ZH pairs group before filtering and keyset pagination, including interleaved deliveries. Ambiguous repeated identities retain every receipt. Existing reports can group only under the known producer header contract: consecutive receipt IDs, same report kind and header date, EN marker followed by CN marker within ten seconds, and saved bodies. Uncertain matches stay separate. Both receipt IDs resolve to the same first record; the second body is withheld until its own cutoff passes. Raw ledger rows are never deleted or rewritten.

The original `radar_archive.UNION` remains unchanged for signal screening and research. Website grouping uses a separate read projection, avoiding changes to event counts, confluence or strategy evaluation.

## Verification

- Focused regressions cover grouping before pagination, Chinese search, exact aliases, cutoff between translations, missing/private/ambiguous records, interleaved deliveries, and fresh-Pro API access.
- Frontend regressions cover single-body navigation, section formatting, source text preservation, loss values, literal HTML, locale switching, canonical login targets, event dates and provenance.
- Read-only production sample: the four 2026-09-07 report pairs resolve to `s:435`, `s:432`, `s:430`, `s:426`; morning and evening macro reports remain distinct. No source data was changed.
- Browser layout audit: all 16 primary destinations in Chinese and English at 320/390 × 650, light/dark; all retained 520 px content space and no horizontal overflow. This matrix uses read-only fixtures; Information Map and opportunities intentionally showed unavailable-fixture errors and require separate real-data confirmation.
- Actual saved report bodies were used for report-list/digest/volatility reader layout. At 320 × 650, the first English report moved from y=620 to y=435. The mobile tree opens, scrolls within the viewport and closes after selecting Vibe Check. Desktop report reading was inspected at 1440 × 850.
- This is browser viewport/layout verification, not physical-phone or touch-device certification. Legacy reports without an English source retain their original language; no translation or financial claim is fabricated during formatting.

## Production acceptance

Published backend implementation through `5a7ae06` and frontend through `d13f893` (Pages `c5a52ba4`). Final presentation polish is published from frontend `4f287c9`, Pages `522b0d07`, at https://duckybot.app/app/#/reports.

- API report bodies retain paragraph boundaries through the existing redaction rules. The production audit caught the previous whitespace collapse, which raw-ledger fixtures alone did not expose. The original immutable ledger is unchanged; the visible original-record fold remains privacy/compliance redacted.
- The historical 09/07–09/11 week-ahead EN/ZH pair now resolves to `s:424`. Week-ahead grouping uses the known producer header, exact week range, adjacent receipt IDs and ten-second bound; new deliveries carry explicit shared identity. Uncertain pairs remain separate.
- All 16 primary destinations were inspected on the signed-in production website, plus seven Radar categories and four report categories. Radar showed 48 recent records, including 42 index events; the report list showed 10 reports after five bilingual pairs were unified. Empty insider/political/industry filters remain explicit empty states, not invented results.
- Information Map loaded 18 AVGO points; its synthesis was still pending. Oversold discovery loaded 14 candidates, including names outside the watchlist. Stock briefs visibly retained revision/pending states, and Vibe Check disclosed missing directional-source coverage. This verifies navigation and truthful delivery states, not completeness of every research pipeline.
- The production phone-layout audit confirmed bottom navigation order (Watchlist, Calendar, Information Map, Radar, More), Alerts in More, independent parent/disclosure controls and automatic menu closure after selecting Reports. The canonical reader switches one displayed body between English and Chinese; its original fold is closed by default. Browser viewport emulation supplements the exact 320/390 CSS-width local fixture matrix; no physical-device certification is claimed.
- Local integration gates: 2,383 backend tests and selftest ALL GREEN; 385 frontend tests. Production API regressions: 49 passed / one optional skip; production full selftest subsequently ALL GREEN (2,400 passed / one optional skip, including concurrent integrated work). The ASR media-preflight fixture was isolated from operator executable paths after reproducing its environment-dependent failure.
- No test messages, model generation, strategy changes, state migrations or per-user report computations were introduced. Homepage, chart touch behavior and the latest Information Map/mobile changes from other tasks were retained.

Final checks: canonical alias `s:436` opens `s:435`; the English reader selects one English body, and legacy `#/boards?board=volscan` renders the Market reports destination with two distinct scans. Duplicate category labels and stock-section separators were removed; replacement text follows the selected report language. Final copy lint and all 1,342 internal links passed.
