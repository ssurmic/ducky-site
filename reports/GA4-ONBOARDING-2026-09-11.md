# GA4 onboarding — 2026-09-11

## Current state

The owner requested Google Analytics onboarding today for `https://duckybot.app/`.
The existing one-day thread reminder `ducky-ga4` was paused to avoid duplicate setup.
Work is isolated in `codex/ga4-onboarding-20260911`, based on frontend main `cb25c3c`.

The signed-in Analytics UI had no existing Analytics account and opened the provision
wizard. The following form values are ready:

- Account: Ducky Bot; all optional account data-sharing options disabled.
- Property: Ducky Bot — duckybot.app; United States / Los Angeles reporting time; USD.
- Finance; Small (1–10); objectives: traffic and engagement/retention.

Creating the account opened the **Google Analytics Terms of Service Agreement** dialog.
The owner has been asked to authorize accepting the Analytics terms and Google Ads Data
Processing Terms. Neither the checkbox nor **I Accept** has been clicked. Account and
property creation, a web stream, a measurement ID and real event receipt remain unverified.
There is no production deployment for this work yet. `ga4_measurement_id` is intentionally
empty; do not substitute a made-up or example ID in production.

## Prepared website behavior

- Shared first-party bootstrap on public and app pages, English default aliases plus `/en/`
  and `/zh/`. Empty ID removes the bootstrap, consent panel and Google CSP allowances.
- Basic opt-in: no Google analytics request or cookie before consent; equal 44px Allow /
  No thanks buttons. Privacy page reopens the choice; app footer links to it.
- Consent and GA cookies expire after 180 days. Revocation deletes `_ga` cookies and sets
  the Google collection disable flag. Other account state is untouched. Cross-tab changes
  are respected. Previously collected data is not deleted by browser opt-out.
- Manual `page_view`, `send_page_view:false`. App route categories become virtual paths
  such as `/en/app/stock/` and `/zh/app/calendar/`. Local navigation comparison counts
  a different stock as another view without sending its ticker, and excludes refreshes
  and same-page filters. The effective route is recorded after the auth gate.
- Fixed page titles and sanitized URLs/referrers; no raw queries, hash identifiers, account
  IDs, emails, watchlists, form fields or research contents. A credential-bearing arrival
  never loads the Google tag in that document, even after authentication cleans the URL.
- Production origin only; Pages/local previews and `/app/preview/` do not send events.
- No Google Signals or advertising personalization; no Ads/DoubleClick CSP endpoints.
  Scripts remain free of unsafe-inline/unsafe-eval. Google collection hosts follow the
  official CSP guidance; the owner request is the explicit exception to the old no-GA rule.

## Local evidence

- 713 Node frontend tests passed, including opt-in/out, expiry, cross-tab withdrawal,
  sensitive arrivals, sanitized page/referrer fields, navigation deduplication, preview
  exclusions and safe session context updates.
- Python suite: 13 tests, 12 passed and one existing skip. New build checks render both
  languages with GA enabled and disabled, and reject malformed measurement IDs.
- Copy lint: 3,694 files; links: 1,890; both passed while the production setting was disabled.
- Browser viewport simulation: EN privacy at 320×650, ZH app login at 390×650, EN/ZH
  privacy with the exact light-banner media rules forced in an isolated local fixture,
  and EN desktop at 1440×900. No horizontal overflow; buttons 44px; phone panel height
  148–169px, desktop 98px. Phone main starts at 61–65px, leaving about 404–429px of content
  above the panel. Light checking was a CSS fixture, not an OS theme change. No physical
  device or touch-emulation claim. The app fixture was logged out, not a member route sweep.
- Temporary fixtures used `G-QAONLY00` only on localhost, where collection is disabled.
  A clean build removes all fixtures before deployment. No real Google hits were used
  to claim success; only stubbed queue assertions have passed so far.

## Remaining completion steps

1. After explicit terms approval, re-read the Google dialog, accept the required processing
   terms and Analytics agreement, then create one web stream for `https://duckybot.app`.
2. **Disable all Enhanced Measurement, including browser-history page views**. `send_page_view`
   does not disable that separate mechanism. Keep Google Signals, user-provided data and
   advertising options off. Record actual account/property/stream/measurement IDs.
3. Put the real public `G-…` measurement ID in `site.config.json`. Build and recheck both
   language shells, CSP, links, the enabled consent UI and analytics tests.
4. Review/rebase concurrent frontend changes, finish CI, merge and deploy exact main through
   Cloudflare Pages. Preserve the previous deployment as rollback. Never deploy the QA fixture.
5. Visit the real website through the browser, choose Allow and navigate actual public/app
   pages. Verify one received page view per navigation in GA4 Realtime/DebugView, safe page
   fields and the actual Google request path. Also verify opt-out. Record real evidence.
6. Link Search Console if its verified property is selectable, and give the owner direct
   links to Realtime, acquisition, Pages and screens. Keep search clicks separate from
   on-site views. Historical visits cannot be recovered by installing a tag today.

## Official setup references

- [Create an Analytics account and property](https://support.google.com/analytics/answer/14183469?hl=en)
- [Manual page views and Enhanced Measurement interaction](https://developers.google.com/analytics/devguides/collection/ga4/views)
- [GA4 configuration and SPA context updates](https://developers.google.com/analytics/devguides/collection/ga4/reference/config)
- [CSP destinations](https://developers.google.com/tag-platform/security/guides/csp)
- [Analytics Terms](https://marketingplatform.google.com/about/analytics/terms/us/)
- [Data Processing Terms](https://privacy.google.com/businesses/processorterms/)
