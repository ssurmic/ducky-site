# Search Console and English default · 2026-09-10 PDT

Owner request: verify the product in Google Search Console, improve SEO, and make the default language English. The existing product domain is `duckybot.app`; `duckyapp.bot` did not resolve in the initial DNS check.

## URL and indexing contract

- No-prefix HTML routes (including `/` and `/app/`) serve English. Existing `/en/` URLs remain the canonical English pages, and `/zh/` contains Chinese. Both English entry paths work without JavaScript or browser-language guessing. Default aliases are byte-identical to the corresponding English output.
- Every localized public page has matching canonical, reciprocal en/zh-CN alternatives and English x-default metadata. The sitemap contains only those canonical public URLs. It excludes app/preview shells, the generic idea-detail placeholder and 404s; duplicate English aliases are not submitted as separate content.
- Account shells retain HTML noindex and are crawlable so Google can read that directive. Removing the old robots block does not alter API authentication or expose private reports. Generic detail shells and 404s also carry noindex. The go-link endpoint stays disallowed.
- Removed the old sitemap lastmod that stamped every build date without proving content changed. Dated research records and losses remain unchanged.
- Homepages include the Google verification meta tag from the operator's signed-in Search Console property, plus WebSite/Organization brand markup with the existing fluffy duck asset. The verification marker is public by design and must stay published.

## Language compatibility

Language toggles preserve hashes, selected idea slugs and the existing homepage theme/design behavior. Chinese legal/research links and install manifests use /zh/. Both locales use the same app module graph.

Read-only inspection of the production backend at `33cde4f0` confirmed Chinese Google/X callbacks and password-reset emails still target `/app/#/oauth` and `/app/#/reset`; English already targets `/en/app/`. A narrow frontend compatibility redirect sends those legacy Chinese paths to `/zh/app/` before boot/auth, retaining the exact query/fragment in the same origin. Normal root visits remain English. Password reset credentials are still stripped by the existing recovery form. No backend deployment is needed for this migration.

## Validation and publication

Local validation: 664 frontend tests passed; asset pipeline 4 passed / 1 existing conditional skip; copy lint passed (3,490 files); 1,878 internal links passed. Backend selftest ALL GREEN (793 pytest tests). Root and localized HTML, reciprocal metadata, sitemap exclusions, verification marker, manifests and legacy recovery behavior have dedicated checks. Chrome verified root English, Chinese toggle, 390×650 English/light and 320×650 Chinese/dark; these are browser viewport checks, not physical phones. Deployment and Search Console verification are pending. Do not interpret a published sitemap, a submitted URL or a verified property as proof of indexing or rankings.

Previous production for rollback: Pages `f6960534-86c4-4505-8ca8-b34f6f890bd3`, source `1f6d9ac2f0c49398a8dd56b2d1dda2e72322c4ea`.

References: [Google property types](https://support.google.com/webmasters/answer/34592), [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [site names](https://developers.google.com/search/docs/appearance/site-names), [recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
