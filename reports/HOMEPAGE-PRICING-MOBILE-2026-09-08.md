# Homepage pricing, bilingual copy and mobile audit — 2026-09-08

The owner's phone screenshot showed two tall Free/Pro cards consuming most of
the page. They asked for quieter pricing, concrete paid value, idiomatic English,
easier language switching and another audit of phone pages and interactions.

## Delivered behavior

- Pricing follows the product tour, examples and evidence. Free is a compact row;
  Pro has a small price, three specific benefits and a quiet link. Optional payment
  and access details expand below. The giant $0, orange Pro border and hero price
  upsell are removed. Free registration remains visible.
- Benefits explain Information Map and source-linked stock briefs, current radar
  and oversold screens, and creator views with original videos and later prices.
  Expanded details retain the five-day free delay, alert limits and coverage caveat.
- Chinese leads with ¥499/year; English with $9/month and $90/year. Chinese USD
  alternatives are in details. The billing link retains the displayed currency
  and term through sign-in and email setup. Only allowlisted navigation choices
  survive; arbitrary amount, payment-rail and token parameters are discarded.
- The English headline is “Your investments. Backed by research.” Homepage
  introductions, headings and plan copy now use shorter, concrete English.
  The Nokia example describes the newly issued shares explicitly. Original
  sources, dates, negative outcomes and historical-example status remain intact.
- Phone language switching is directly in the header, with a 44px target. At
  320px the duck retains the full accessible brand name while the visible wordmark
  is hidden. At 390px both duck and wordmark fit.
- The phone product tour uses a native, labelled tool selector instead of a tall
  grid of buttons. All 14 tools, including the new Market reports entry, remain
  reachable. Desktop keeps the existing tool navigation.
- The actual app's bottom navigation remains Watchlist, Calendar, Information Map,
  Radar, More. Alerts are available through More. The billing page removes the
  redundant “select Pro” control and reduces the benefits panel's height.
- Public data filters use 16px input text and 44px controls on phones. Empty
  tables no longer force the whole page wider. Wide evidence tables keep all
  columns and support keyboard horizontal scrolling in a labelled region.

No prices, entitlements, checkout/order API behavior, user data, research rules,
notifications or backend runtime were changed. Live `/billing/plans` was checked:
Pro is USD 9/month, USD 90/year, CNY 499/year, with 100 alerts. At the inspection
time the global available-rails response exposed Stars only; configured per-plan
rail names do not prove that every checkout method is currently available. The
subscription UI continues to use the live catalogue and available methods.

## Browser evidence

`homepage-mobile-20260908/serve.py` serves the real built public pages plus the
existing isolated app fixture. Its inspection scripts are local-only and are
not published into `dist`. App fixtures block remote requests and API mutations.

| Measurement | Before | After |
|---|---:|---:|
| English pricing, 390px phone | 1,229px | 519px |
| Chinese pricing, 390px phone | Screenshot: two tall stacked cards | 497px |
| Pricing, 320px phone | — | 559px ZH / 602px EN |
| Pricing, 1,728px desktop | — | 506px |
| First billing price card, 390px short phone | y=331px | y=243px |

Pricing measurement includes its heading, both plans and closed optional details.
The English phone section is about 58% shorter. Public phone header is 65px; app
header and bottom navigation leave 470px at 600px height and 520px at 650px.

- Final public matrix: nine page templates × two languages × 320/390px × two
  themes = **72 combinations**, at 650px height. Homepage, privacy, disclaimer,
  research-records, idea, trending, track-record, ideas and 404. No document
  horizontal overflow or runtime errors. Intentional scrolling tables are
  recorded separately from accidental overflow.
- Final app matrix: **22 routes × two languages × 320/390px × two themes = 176
  combinations**, at 650px height. Watchlist, evidence, briefing, chart, calendar,
  boards, alerts, creators, profile, billing, opportunities, vibe, market, macro,
  screens, updates, research, login, register, forgot, reports and record reader.
  No detected horizontal overflow or runtime errors. Some routes exercise empty
  or unavailable fixtures; this does not assert complete live research coverage.
- A preceding 600px sweep covered the original 20 app routes and all public page
  templates. The final billing layout was also reviewed at 390×600 in both themes.
- Clicked tool choices in both languages, the new report choice in both themes,
  pricing details, all six English FAQs, mobile menu/Escape, and the public
  language switch retaining theme and pricing anchor. Billing USD monthly/annual
  and CNY choices changed the displayed price without creating an order.
- Desktop pricing and both phone themes were visually reviewed. Public ideas'
  wide table receives keyboard focus and moves horizontally with arrow keys.
- Earlier touch, heatmap and 75/125/200% native browser zoom evidence is retained
  in [the mobile interaction report](MOBILE-UI-AUDIT-2026-09-08.md). This iteration
  rechecks their routes and preserves those changes.

These are Chrome rendering and fixture checks, not physical iPhone/Android,
Safari, Telegram WebView or physical two-finger pinch certification. No account,
watchlist, alert, notification or payment submission was used for acceptance.

## Validation and release

Implementation and login-choice regression: **387 frontend tests passed**.
Asset isolation: four passed, one existing optional fixture skipped. Copy and
internal-link checks passed. Clean backend `2df7346` selftest: **2405 passed**, five
warnings, ALL GREEN; no backend implementation changed in this work.

Release identifiers and production acceptance are appended after deployment.
