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
When the chosen currency has no available method, it now says so explicitly and
points users back to the currency selector. Telegram-only instructions appear
only when Stars is available for that selection. CNY and USD switching is tested
against an actual-shaped Stars-only catalogue without placing an order.

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

Final merged implementation, login-choice and currency-availability regressions:
**393 frontend tests passed**.
Asset isolation: four passed, one existing optional fixture skipped. Copy and
internal-link checks passed: 2594 files and 1342 links. Clean backend `2df7346`
selftest: **2405 passed**, five
warnings, ALL GREEN; no backend implementation changed in this work.

Released frontend `1c66a753a91152065cb9ab381fd2bcb67ac2c6f6`, Cloudflare Pages
`b19f8300`, to https://duckybot.app. This supersedes the initial layout release
`51d4f09` / `6eb502a4` and the terminology follow-up `46de12d` / `b0184a71`.

Production acceptance at an actual 390×649 CSS viewport used the existing Pro
session: the real 17-stock heatmap, equal/cap modes, CIEN details and optical
description, all 15 CIEN chart canvases, zoom in/out/reset, the third Information
Map destination and More → Alerts. No account data was added or removed. Live
source-analysis pending states remain pending; layout acceptance is not proof
that every stock has a completed brief.

The public Chinese and English plan links opened the corresponding CNY annual
and USD monthly selections. Language switching preserved the dark theme and
pricing anchor. Full Chinese benefits expanded/collapsed. The final CNY gap
message additionally passed 390px Chinese and 320px English × light/dark at
600px available height, with zero overflow/errors and 470px content space.

An older Chrome DevTools session timed out during synthetic touch clicks; it
was not treated as a successful interaction. A fresh browser tab completed the
production checks above. The previous separate touch-emulation evidence remains
in the mobile interaction report; no new physical-device claim is made.

Live HTML, application module entry and versioned page styles were compared with
the deployed build. Versioned styles matter: an unversioned workspace.css URL
still served an older cached copy, while the URL actually used by the app matched.
Final live module graph is `84171085ac0a31679b74`. Both homepage languages,
both app shells, the module entry and all four versioned app styles matched
the final build byte for byte. Production CNY billing shows the explicit gap
message and ¥499/year with no runtime warnings/errors.

[Release CI](https://github.com/ssurmic/ducky-site/actions/runs/34215684067)
completed successfully. The final backend tracker is documentation only; no
backend services needed a restart.
