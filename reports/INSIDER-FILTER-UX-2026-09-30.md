# Insider transaction filters and compact records — September 30, 2026

Status: frontend PR candidate; not merged or deployed. The source baseline is `2ab0892af8e0552de7e86c03b4a0af3b5f18a05a`. Final release receipt remains with the integrating reviewer. No account writes, inference, collection or source corrections are part of this change.

## What changed

Insider records have direct All / Buy / Sell buttons and exact market-cap bands. These describe reported transaction sides, not bullish or bearish sentiment. New Insider visits use all available filings; the former verified-open-market threshold is an explicit advanced filter. Existing bookmarks retain their query, including other-direction records and the threshold filter. Active advanced constraints remain removable and visible when the controls are closed.

The market-cap bands remain the API's separate definitions: micro below $300 million; small $300 million–$2 billion; mid $2–$10 billion; large $10–$200 billion; mega at least $200 billion; unknown is distinct. Quick labels do not merge mega into large. Range descriptions remain in accessible names and the selected-band caption. Discrete filters query immediately; free-text search waits 500 ms and at least two characters, or an explicit form submission. Clearing a query is supported. Requests retain abort, account-epoch and query-generation fences.

Structured Form 4 cards lead with issuer, filing side, amount, reporter, reported price and cap band. Transaction and filing dates stay separate. A compact card replaces duplicated prose; the original filing reader and source link retain the full saved text and footnotes. Historical prose-only records retain their existing readable lead. The source reader now labels a sale as a sale and reads sale-side venue amounts. Tax purpose requires typed row-local evidence and never changes the transaction into a market forecast.

## Numeric contract and limits

- A legacy single saved transaction may show its reported line price and original security title. It is not labelled as the mean of the full filing; a missing currency receipt is explicit. An ordinary share is never relabelled as an ADS or current market quote.
- `facts.trade_metrics` is optional. Only recognized `form4-trade-metrics/1` with complete, compatible, finite priced rows, matching counts/shares, explicit USD basis and a matching share-weighted mean enables a weighted-average label. A known missing or malformed projection stays unavailable. Joint reporters do not multiply the filing amount.
- Holding percentage requires a source-owned eligible single-sale scope, direct ownership, one matching sale/security/quantity, a positive sold quantity, nonnegative remaining quantity and the matching reported-scope formula. Genuine zero remaining shares can mean 100%; absent, indirect or contradictory holdings stay unavailable. This is a percentage of that disclosed holding, not the person's total portfolio.
- Typed `transaction_purpose` with `form4-purpose/1` and attached evidence permits a tax-related-sale label. If whole-side coverage is not established, the wording only says the filing includes such a sale. The UI does not interpret prose or calculate currency conversion. Attached conversion and purpose footnotes remain accessible.
- All means the available archive, not every SEC transaction. The producer's coverage and admission rules still apply. The new neutral venue controls depend on the companion backend change that selects sale or purchase buckets by saved direction, rejects a contradictory declared side, and retains genuinely unverified legacy venue states. This frontend must not be released before that read contract is deployed.

## Validation

Focused behavioral tests cover direct filters, exact cap edges, explicit legacy bookmarks, query debouncing, rapid reverse response ordering, source-reader return state, locale links before click/open-in-new-tab, account change, route disposal and the initial All-to-Funds request race. Numeric tests cover weighted versus simple mean, missing and malformed rows, mixed security units, unsupported currency, missing holdings, genuine zero after a sale, contradictory ownership/quantity and typed purpose evidence. Existing full-text and other-category checks remain.

The initial full run found a genuine loss of legacy prose-only leads, which was repaired, and an obsolete expectation that a direction filter must expand the advanced controls. The replacement assertion checks the visible selected Buy button and exact bookmarked return. Independent review additionally found the sale-venue local-filter mismatch and the early category-switch bootstrap race; both received targeted fixes and regressions. Desktop browser review found an inherited rule hiding the category navigation; the activity workspace now overrides it without changing the reports layout. Final local gate: 994/994 Node tests passed, including the desktop category-visibility regression; the focused workflow run passed 62 tests before that one additional CSS test. Python checks ran 19 tests: 18 passed and one expected local asset test skipped. Build and bilingual key parity passed; copy lint scanned 4,359 files cleanly; 2,145 internal links passed. The eight synthetic source-owner metric examples also matched the frontend acceptance cases, including 10%/100% reported scopes, 17.5 weighted mean and explicit unavailable outputs. The integrating reviewer performed the bounded browser checks below.

## Browser acceptance recorded by the integrating reviewer

- **1440×900, Chinese, dark:** the restored category rail is visible. Sell returns three synthetic rows; the complete example displays its $150 weighted price, tax-related-sale label and 20% reported holding scope. Advanced controls use the neutral transaction-venue label. Selecting Large retains both the cap and Sell filter in the English-language link.
- **390×700, Chinese, dark:** Sell returns three rows and keeps control focus. The first record begins around y=440.
- **320×600, English, light:** Small returns one record and More filters opens successfully.
- **390×700, English, light, delayed responses:** sequential Buy then Sell returns three matching Sell records without an old Buy response replacing them. The first card shows the red sale amount, $150.00 weighted price and 20% reported scope before the bottom navigation. The cap rail remains contained.

These are synthetic browser viewport checks, not production membership writes, live numeric acceptance or physical-device/touch tests. They are not a claim that every locale/theme/viewport combination passed. The fixture footer identifies the synthetic records and lack of production connection.

## Reproduce synthetic browser review

Build with the repository's supported Python, then run:

```sh
python tests/browser/serve-product-focus.py --port 8977
```

Open `/qa-device?width=390&height=700&lang=zh&theme=dark&case=insider-ux&route=boards%3Fboard%3Dinsider%26mode%3Darchive`. Repeat with 320×600 and 1440×900, both languages and themes. `slow=1` delays Buy responses longer than Sell to exercise rapid changes. The local measurement disclosure retains only the last 30 request URLs and methods. All records and identity values are synthetic; the server never forwards authentication or API traffic.

The fixture includes a complete multirow weighted purchase, a complete sale with an explicit reported holding percentage, missing holdings, a mixed-security unsupported mean, an ordinary-share legacy line price and every cap band. Check that a direction and the first useful record remain visible, horizontal scrolling is confined to the cap controls, common controls are at least 44 px, inputs are 16 px, and the full source reader returns to the exact filtered list. Viewport simulation is not a physical-device or live-data acceptance claim.
