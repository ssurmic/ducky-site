# Product positioning: creator analysis and stock evidence

**Evidence date:** 2026-09-13, 03:37 UTC. **Status:** official-source competitive research and local implementation review; this report is not a deployment receipt. No creator additions, ingestion runs, model calls or production writes were performed for this review.

## Owner headline retained

The owner explicitly chose the existing homepage headline. This review preserves it:

- Chinese: **一只股票的所有信号，一页看完。** (`home.h1a`: `一只股票的所有信号，`; `home.h1b`: `一页看完。`)
- English: **Every signal on a stock. One page.** (`home.h1a`: `Every signal on a stock.`; `home.h1b`: `One page.`)

Supporting copy and source details must make the actual coverage readable. The headline does not authorize invented sources, complete-coverage badges, missing data represented as zero, or a claim that every creator/video is processed. The public interactive map is explicitly a dated selection.

## Direct competitors: verified evidence and remaining uncertainty

Only official product pages were used. A published methodology describes the product's stated rules; this review did not independently audit a competitor's extraction accuracy, prices or execution results.

| Product | Evidence visible in official material | Limits and comparison implications |
| --- | --- | --- |
| **InfluAlpha** | The [MU asset page](https://influalpha.com/stocks/MU) groups different creators' buy/sell calls under one stock, with dates, quotations, source-call links and benchmark comparisons. Its [video analysis example](https://influalpha.com/video_analyses/i-just-bought-my-next-great-stock-new-stock-buy) includes quotations, AI-extracted context, the full transcript and source-video links. The [methodology](https://influalpha.com/methodology) explains timestamp eligibility, returns and derived channel portfolios. | It already has stock-level aggregation and inspectable source context. Do not describe it as sentiment-only, score-only, or lacking quotations/timestamps. Its stated new-extraction rules exclude neutral mentions and hypothetical/conditional future scenarios from recommendations; historical classifications have not all been reprocessed. Its portfolio and call metrics are calculated representations, not verified creator executions. |
| **FinTuber** | The [official homepage](https://www.fintuber.io/) presents creator leaderboards, period filters, win rates, S&P 500 comparisons, top picks and side-by-side creator comparison. Official indexed page text also describes transcript-based extraction and publish-date-based performance tracking. | The directly readable homepage confirmed the comparison workflow. This session did not verify a public per-call view showing detailed reasoning, separate condition fields or exact video-segment links. That is an evidence gap, not proof those features do not exist. |
| **AlphaCheck** | [Official homepage indexed content](https://alphacheck.ai/) describes stock mentions, recommendation strength, context quotations explaining the speaker's reasoning, then-versus-latest prices, channel history, winners/losers and hypothetical investment comparisons against benchmarks. Its [official pricing page](https://alphacheck.ai/pricing) describes individual-video analysis and channel tracking. | Reasons and context are already part of its published offering. Do not describe it as simulation-only or sentiment-only. The homepage's direct fetch timed out/returned 502 in this session; these feature statements came from official indexed content, not a successful interactive product test. Exact timestamp behavior, condition handling and non-creator disclosure integration were not verified. |

InfluAlpha's [corrections policy](https://influalpha.com/corrections) and methodology disclose practical limits. Their existence is a useful reference for transparent product communication, not evidence that Ducky has superior accuracy. A source link, AI summary, stock page or historical-price comparison alone is not an exclusive differentiator.

## What Ducky can substantiate now

This review concerns the homepage/product-preview changes based on frontend revision `da912b8`, with the current working changes reviewed separately from deployment.

| Capability | Inspectable evidence | Bound to preserve |
| --- | --- | --- |
| Stock-centered source comparison | `public/home-signals.json` contains dated creator views and disclosure records for NVDA, MU, AMD and TSLA. `templates/_partials/homepage-hero.html` keeps the stock, attributed text, date and original-source link together. | These are selected records dated through 2026-09-11, not exhaustive coverage or live quotes. Disclosure rows use factual/context classification; a reported share change does not automatically establish bullish/bearish intent or current ownership. |
| Current Research Map interaction | `public/js/app/research-map-preview.js` adapts the five public NVDA records into the existing `mapView` renderer: three creator views and two disclosure records. Cards retain dates and original links. | The adapter does not invent source-owner IDs, review receipts, observation times, analysis text or acquisition counts. The public map is a subset, with a visible coverage note. It is not a new independent research source. |
| Detailed creator analysis | The existing creator views and source detail workflow support attributed summaries, reasoning, source excerpts, publication dates, video positions and source-bound conditions where available. The homepage presents the creator's language and a page-language translation. | Do not promise every field for every video. Summaries are attributed paraphrases, not verbatim quotations. A source's conditional reasoning must not become an unconditional current trade. A missing field or unfinished source is not complete coverage. |
| Current selected creator examples | In this session, all six retained examples in `public/home-creators.json` matched the current source reader on ticker, stance, complete bilingual title, source URL and publication timestamp. The New Money GOOGL example lacked a current counterpart and remains withheld, with the creator retained in the roster. | Source matching does not establish investment performance, full creator coverage or a hit rate. These examples were selected for a direction-consistent later price move; that selection remains disclosed. The previous raw creator staging archive remains outside the public release. |
| Dates and later-price context | Creator publication dates are displayed separately from the comparison's base-close session. Existing examples retain their price bases and dates; the broader historical record includes losses. | Later price changes are descriptive comparisons. Do not turn them into verified executions, alerts delivered at the time, independent proof of a creator's self-reported past success, or overall strategy returns. |

The defensible positioning is the **combination** of stock-centered organization, detailed creator reasoning and conditions, bilingual reading, and non-creator sources such as company disclosures, insider trades and reported fund holdings. This is a useful research workflow; the evidence does not establish universal exclusivity or completeness.

## Copy direction beneath the retained headline

Explain what the investor can inspect, rather than calling the analysis “the most complete” or “the most detailed.” Demonstrate detail with the reason, applicable condition, opposed view, publication date and original passage. Keep factual records distinguishable from opinions.

Suggested supporting copy, subject to the actual fields shown by each view:

> Ducky 用 AI 将你关注的 YouTube 博主分析、公司公告、机构持仓与高管交易，按股票聚合。观点、理由、适用条件和原始出处一起看，减少反复翻视频、找资料的时间。

> Ducky brings creator analysis, company filings, reported fund holdings and insider trades together by stock. Read the reasoning and conditions, compare opposing views, and check the original sources without repeating the same searches.

Time savings are presented as the consequence of this workflow, not a measured benchmark. Do not claim a number of hours saved, faster analysis than competitors, superior returns or a larger complete archive without corresponding evidence. Keep the homepage focused on research and source inspection; simulations, leaderboard scores and hypothetical portfolio returns are not the homepage positioning for this change.

## Creator roster check

A read-only comparison at the evidence time found:

| Catalog set | Result |
| --- | --- |
| Public homepage roster | 34 creators |
| Active recorded creator registry | 34 creators, exactly the same stable IDs |
| Inactive registry entries | 0 |
| Curated seed entries | 28, all already represented in the public 34 |
| Additional recorded/seed candidates absent from the homepage roster | 0 |

Retain **34** as the verified current count. Do not add names, avatars, video totals or a larger coverage count based on competitor rosters or planned ingestion. A separate **“更多博主陆续加入 / More creators coming”** label describes future expansion only; it must not count as currently available coverage or imply a promised date. No roster or source configuration was changed by this audit.

## Verification record

- Official pages and methodology were read during this session; inaccessible or only indexed material is identified above.
- The owner-selected headline was read from both current i18n files and was not changed by this report.
- The public selected-data adapter and its source fields were inspected directly.
- The six retained creator examples were compared against current source-gated reads without model calls, price fetches or source writes.
- Registry comparison used a read-only connection and read the seed list without running its writer. It did not read account subscriptions or other per-user records.
- This report records evidence and boundaries. Full build, browser acceptance, merge and deployment receipts belong to the accompanying release report.
