# Research UI, positioning and locale review

Owner requests: date labels on the research curve; a headline explaining Ducky's actual advantage over general AI; English pricing without CNY and Chinese pricing for Chinese readers; historical SPY/QQQ monthly comparisons and midterm-election context in the calendar. Related owner follow-up asks for illustrative member previews, one public video summary and readable historical records instead of a raw JSON landing link.

## Product changes

- The earlier dated chart release (`5fd04028`) keeps its unchanged research data and synchronized three-series date inspector.
- Headline: “持续筛查美股异动，跟踪信号后的表现。” / “Find US stock signals. Track their outcomes.” Copy describes the existing recurring event/oversold screening, price/options context and dated loss-inclusive outcomes. It does not claim exclusive data, a superior model or proven returns.
- Two member preview cards contain decorative skeleton elements only. No current paid report is embedded and obscured with CSS. Existing API entitlements remain authoritative. Homepage individual-stock example cards were removed; public aggregate history and full historical losses remain available.
- One intentionally public Wall Street Millennial summary (`f8kUx5_1cWc`) uses an already reviewed caption-based artifact supplied by the creator task. Original publication date, 15:44 duration and source links at 00:03, 05:49 and 11:40 are visible. Views remain attributed to the creator. No video-understanding or current stock-call claim.
- `/research-records/` and `/en/research-records/` show all 95 completed and 3 open positions in the existing public oversold experiment. Stock/status filters compose. All 43 losing completed positions remain. Earlier periods are correctly identified as summary-only. Raw data remains a secondary disclosure/download, with no claim that previously public history is private.
- Three pricing cards in each language: Chinese Signal ¥749/year and Pro ¥1,899/year; English Signal $15/month or $135/year and Pro $39/month or $351/year. Production `/billing/plans` verified 2026-09-06 UTC. Actual available checkout rails still come from the API; orders retain their real currency. The English storefront omits CNY copy and CNY payment controls. Chinese annual billing highlights CNY; monthly and non-CNY checkout denominations remain factual.
- Calendar includes a month slider, a midterm-only filter, a selected-month/following-month-to-December selector, mean/median/positive-year counts and best/worst outcomes. Paired SPY/QQQ bars scroll by touch, native scrollbar or explicit earlier/later buttons. A data table remains available.
- The shared static snapshot contains 320 completed months, January 2000–August 2026. September comparisons have 26 observations; midterm September comparisons have six (2002, 2006, 2010, 2014, 2018, 2022). Unfinished months and unfinished year-end windows are excluded. Monthly compounding is used for multi-month windows.
- A clearly dated 2026 disclosure links to the Federal Reserve's September 15–16, October 27–28, December 8–9 meetings and the FEC's November 3 congressional election date. Historical seasonality is not represented as this year's forecast or as proof of an election effect. The 2026 disclosure expires from the UI in another calendar year.

## Sources and regeneration

- [Perplexity alert capabilities](https://www.perplexity.ai/changelog/what-we-shipped-july-18th), [Koyfin alerts](https://www.koyfin.com/features/alerts/), [Fiscal.ai assistant integration](https://docs.fiscal.ai/docs/guides/mcp-integration): official feature review, not a paid-account trial. Generic research/alerts alone are not an exclusive claim.
- [SPY history](https://finance.yahoo.com/quote/SPY/history/) and [QQQ history](https://finance.yahoo.com/quote/QQQ/history/): adjusted daily closes retrieved via existing yfinance on 2026-09-06 UTC. Month-end and previous-month-end closes/dates are stored alongside each computed return. No transaction costs or taxes are included in this ETF seasonality reference.
- [Federal Reserve calendar](https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm), [FEC election cycle dates](https://www.fec.gov/help-candidates-and-committees/filing-reports/election-cycle-aggregation/).

Regenerate with the backend's yfinance-enabled venv: `python scripts/gen_seasonality.py`. This is an explicit offline build step; never a web-request job. `--csv-dir` accepts previously fetched `ducky-seasonality-SPY.csv` and `ducky-seasonality-QQQ.csv` for repeatable regeneration. Output uses atomic replacement and rejects a grossly incomplete history. The static snapshot's cutoff is always visible; this change does not install a new timer.

## Verification

38 frontend tests passed in the isolated UI release; the combined release with safe post-login return passed 43 tests, the 20-page bilingual build, 91-file copy lint and 706-link check. New checks reconcile every monthly return to its underlying closes, verify compounded year-end windows, missing-month exclusion, complete midterm samples, filters, losses, no private preview payload, video timestamps and localized prices. Final isolated release gates and deployment evidence are recorded in the backend owner tracker.

Native browser review covered Chinese dark mobile and English light desktop seasonality, midterm filtering and year-end selection; member previews and the 98-position table were inspected at phone widths. A 320px header overflow found during review was fixed. Prior chart date/touch/keyboard and light-theme checks remain covered by four dedicated tests.

The combined release `a60d0432` also preserves the requested internal destination after sign-in. This was implemented and tested independently by the authentication task, with a route allowlist and short-lived session storage. It supersedes the initial UI batch's sign-in limitation. Member plan links first open the public pricing section; entitlement checks remain server-side.

Production homepage verified in a native browser at `a60d0432`: new English headline, two illustrative member cards, one public video sample and no CNY text in English pricing. Phone review confirmed 320px document width, the 3-of-98 open-position filter, and horizontal calendar navigation reaching the exact right-hand scroll boundary. The authenticated production calendar was not accessed through this task’s signed-out browser; its mounting and controls were verified in the test suite and local browser preview.
