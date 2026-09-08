# Website content navigation and reading · 2026-09-08

## Implemented behavior

The application separates event radar, market reports and opportunity tools. Parent destinations are links with independent disclosure controls. Child links have quieter typography and only the current link receives accent color. The mobile More menu uses the same tree and closes after navigation. The homepage catalog also includes market reports and links its categories to their actual parent.

A list entry links to `#/record/<encoded ID>`; full text is rendered only on that destination. The reader preserves the report date, sections, actual figures, losses, missing evidence, sources and outcomes. Telegram decoration and redundant bilingual headings are presentation-only transformations. Original stored text remains collapsed and unchanged. No model, data-provider call or investment algorithm change is introduced.

## Identity and access

`radar_archive.record` shares the existing public/private archive filters. `/public/radar/record.json?id=…` applies the five-day cutoff; `/radar/record.json?id=…` requires fresh Pro and is private/no-store. Hidden receipts and excluded kinds remain inaccessible. Source delivery aliases resolve to their existing source record. The website keeps canonical source IDs, not a new per-user copy or table.

New daily, market and macro reports carry one generated report ID and an explicit language on their two existing deliveries. Unique EN/ZH pairs group before filtering and keyset pagination, including interleaved deliveries. Ambiguous repeated identities retain every receipt. Existing reports can group only under the known producer header contract: consecutive receipt IDs, same report kind and header date, EN marker followed by CN marker within ten seconds, and saved bodies. Uncertain matches stay separate. Both receipt IDs resolve to the same first record; the second body is withheld until its own cutoff passes. Raw ledger rows are never deleted or rewritten.

The original `radar_archive.UNION` remains unchanged for signal screening and research. Website grouping uses a separate read projection, avoiding changes to event counts, confluence or strategy evaluation.

## Verification

- Focused regressions cover grouping before pagination, Chinese search, exact aliases, cutoff between translations, missing/private/ambiguous records, interleaved deliveries, and fresh-Pro API access.
- Frontend regressions cover single-body navigation, section formatting, source text preservation, loss values, literal HTML, locale switching, canonical login targets, event dates and provenance.
- Read-only production sample: the four 2026-09-07 report pairs resolve to `s:435`, `s:432`, `s:430`, `s:426`; morning and evening macro reports remain distinct. No source data was changed.
- Browser layout audit: all 16 primary destinations in Chinese and English at 320/390 × 650, light/dark; all retained 520 px content space and no horizontal overflow. This matrix uses read-only fixtures; Information Map and opportunities intentionally showed unavailable-fixture errors and require separate real-data confirmation.
- Actual saved report bodies were used for report-list/digest/volatility reader layout. At 320 × 650, the first English report moved from y=620 to y=435. The mobile tree opens, scrolls within the viewport and closes after selecting Vibe Check. Desktop report reading was inspected at 1440 × 850.
- This is browser viewport/layout verification, not physical-phone or touch-device certification. Legacy reports without an English source retain their original language; no translation or financial claim is fabricated during formatting.

Deployment and final gate results will be recorded below after integration with current remote branches.
