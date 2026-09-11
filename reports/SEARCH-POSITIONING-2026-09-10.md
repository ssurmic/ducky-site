# Search positioning · 2026-09-10 PDT

Owner requested either “Financial Key Opinion Leader Aggregation” or “All-in-One Daily Stock Analysis Tool”. The English search and sharing title is now **Ducky Bot | All-in-One Daily Stock Analysis Tool**. The description explains daily US stock analysis with financial key opinion leader aggregation, company events, technical indicators and original sources. Chinese metadata uses **Ducky Bot | 一站式每日美股分析工具** and corresponding Chinese prose.

This changes the three authored metadata keys in each locale. Landing content, research delivery, dates, source records, access, favicon URL and the canonical/language contract remain unchanged. The static copy checker exempts only the complete owner-approved English descriptor from its ALL-IN substring ban. A regression checks that standalone trading calls, incomplete lookalikes and additional banned text remain blocked. Backend compliance rules are unchanged.

## Validation

- 669 local frontend tests passed, including the narrowly scoped compliance regression. Initial PR CI `34561204611` hit an existing diagnostics test that mistook timestamp milliseconds `.999Z` for the synthetic user ID `999`. The assertion now rejects the actual private field names and retains private-text checks; production diagnostics code is unchanged. Final CI receipts follow.
- Copy lint: 3,469 files passed. Internal links: 1,878 passed.
- All three homepage outputs contain the intended title, description and sharing title; English aliases and language alternatives are retained. In-app browser checks confirmed both new page titles, with desktop English, 390×650 Chinese and 320×650 English screenshots. These are browser viewport checks; the visible landing content and layout were not edited.
- No Google Analytics tag was found in source or live root/en/zh/app HTML. Search Console verification does not install website analytics.
- The signed-in Search Console Performance page showed “Processing data, please check again in a day or so”; no traffic counts were available. Missing data must not be reported as zero.
- The supplied search screenshot shows an old Ducky TradeBot title. This indicates that the displayed title has not caught up with the live site. The duck image is already recognizable there; the screenshot alone cannot identify the cached favicon version. Small-icon rendering loses fur detail even with a high-resolution original.

## Publication

Release checks and deployment receipts pending. Previous production: `ef8e64f3-de30-4c54-899c-bc4e39fc6bf8`, source `0a754d8`. The title update is not a claim that Google has reindexed or will use the exact title. The homepage indexing requests from the earlier SEO release were accepted; repeating requests does not improve their priority.

## Analytics navigation

[Search Console Performance](https://search.google.com/search-console/performance/search-analytics?resource_id=https%3A%2F%2Fduckybot.app%2F): clicks from Google Search, impressions, click-through rate and average position; Queries and Pages break down search performance. Indexing → Pages counts indexable/indexed URLs, not pageviews.

Google Analytics needs a separate website integration to collect users, sessions, page views and engagement. Its Reports → Engagement → Pages and screens shows Views, Active users and Views per active user. An implementation for this hash-routed app would need deliberate route measurement, excluding auth credentials and personal data; none was installed in this wording task.

References: [favicon rules](https://developers.google.com/search/docs/appearance/favicon-in-search), [Google title links](https://developers.google.com/search/docs/appearance/title-link), [Search Console metrics](https://support.google.com/webmasters/answer/7576553), [GA4 Pages and screens](https://support.google.com/analytics/answer/12926732?hl=en).
