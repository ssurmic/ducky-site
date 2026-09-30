# Market reading help · 2026-09-30

Status: implemented and locally accepted; production publication pending.

Base: frontend `935900a1`. Companion K producer: backend PR #290, candidate `436033a0` (complete local gate passed; hosted gate/release tracked separately).

The owner requested a small question-mark button for USD liquidity, 10-year Treasury yield, VIX, CNN Fear & Greed, K and VIX/VIX3M. Each visible label now opens its own localized explanation in the existing accessible modal. No provider request, calculation, account mutation or backend contract change is introduced by this follow-up. Missing readings still have usable definitions.

The visible glyph is 18px, with a real 44×44px button target. The dialogs support pointer/touch, Enter, focus containment, Escape, close buttons and focus return. Definitions remain outside the default card content, preserving six desktop columns and three phone columns. Source-date and unavailable-value meaning remain explicit. The existing liquidity explanation now says each input keeps its publication date and makes the 60-point boundary unambiguous.

## Definition references

- [Cboe VIX](https://www.cboe.com/tradable-products/vix): 30-day implied volatility, annualized; not a directional forecast.
- [Cboe term structure](https://www.cboe.com/tradable_products/vix/term_structure): VIX and VIX3M compare different implied-volatility horizons, not futures prices.
- [CNN Fear & Greed](https://www.cnn.com/markets/fear-and-greed): seven equal-weight components, 0–100.
- [FRED DGS10](https://fred.stlouisfed.org/series/DGS10): nominal Treasury yield; basis-point changes are distinct from price returns.
- K and liquidity follow the existing shared product definitions. K is CNN Fear & Greed / VIX; original source clocks and unavailable states are unchanged.

## Validation

20 browser combinations passed: 320×600, 390×700, 820×900, 1440×900 and 700×390; Chinese/English, dark/light. All six buttons opened and closed using pointer and keyboard, retained focus, remained within the viewport and had 44px targets. No page errors or horizontal page overflow. On the short phone fixtures the K value remains above the bottom navigation. Screenshots reviewed at 320px English dark and 390px Chinese light. Browser viewport/touch emulation only, not physical-device testing.

A functional DOM test covers all six dialogs, meaningful localized labels, focus restoration and the unavailable K state. 26 focused tests passed. Full build/test result and publisher receipt are recorded in the PR. The first build attempt used a Python without Jinja2; rerun with the configured validation interpreter passed. No failed run was treated as a pass.

Rollback: revert this presentation-only change; the existing six readings and source disclosures remain intact.
