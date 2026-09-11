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

Local validation: 664 frontend tests passed; asset pipeline 4 passed / 1 existing conditional skip; copy lint passed (3,506 files); 1,878 internal links passed. Backend selftest ALL GREEN (793 pytest tests). Root and localized HTML, reciprocal metadata, sitemap exclusions, verification marker, manifests and legacy recovery behavior have dedicated checks. Chrome verified root English, Chinese toggle, 390×650 English/light and 320×650 Chinese/dark; these are browser viewport checks, not physical phones. Deployment and Search Console verification completed; final receipts are below. Do not interpret a published sitemap, a submitted URL or a verified property as proof of indexing or rankings.

Previous production for rollback: Pages `f6960534-86c4-4505-8ca8-b34f6f890bd3`, source `1f6d9ac2f0c49398a8dd56b2d1dda2e72322c4ea`.

References: [Google property types](https://support.google.com/webmasters/answer/34592), [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [site names](https://developers.google.com/search/docs/appearance/site-names), [recrawl requests](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).


## Published verification receipts

PR33 merged as `679a32c1e119912b8281ffbbad047dab06c5097b`. PR CI `34554275721` and exact-main CI `34554387667` passed. Pages deployment `0efeb36c` serves https://duckybot.app/. The nightly notary update was merged before release; no source records were rolled back. An initial CI failure exposed an unrelated date-format test coupled to the changing nightly ideas timestamp; the test now uses a fixed timestamp fixture.

Post-deployment HTTP audit passed 23 public URLs, including all 14 sitemap pages, default and localized app shells, robots, sitemap and installation manifests. Each HTML response byte-matches the validated build and has its intended language/canonical/noindex. One transient curl transport error during propagation succeeded on retry. The full receipt is `SEARCH-CONSOLE-SEO-2026-09-10-http.json`.

Chrome confirmed the live root homepage is English. Local browser checks also covered both languages in light/dark themes at 320/390×650, the application language toggle retaining its route, and a synthetic legacy reset link redirecting to the Chinese preview and stripping its fragment credential. No password was entered or changed; actual OAuth sign-in/account writes were not performed.

Google Search Console showed **Ownership auto verified**, using the **HTML tag**, for `https://duckybot.app/`. The submitted `/sitemap.xml` showed **Success** and **14 discovered pages**. URL Inspection for `/en/` showed **URL is on Google / Page is indexed** before this release's recrawl request. Site-wide performance/indexing summary is still processing. Individual recrawl receipts follow.


URL Inspection also confirmed the root `/` was already indexed. These are observations of the pre-existing Google index, not a claim that this release created those indexed entries. `/zh/` is newly discovered through the sitemap and currently not indexed. The `/en/` refresh request returned **Indexing requested** and confirmed addition to the priority crawl queue. The `/zh/` and root `/` refresh requests also returned **Indexing requested**, confirming addition to the priority crawl queue. A first root request lost its visible result when that tab navigated away; the root was submitted once more in a separate tab and the success modal was observed. No further repeat submission is needed.


## Requested fluffy duck favicon

The owner supplied the round green duck image and confirmed it should be the Google search icon. Visual comparison confirmed that the original `public/duck-head-cutout-v1.png` is the same requested artwork; no new rendering or resampling was needed. Live `/`, `/en/` and `/zh/` all declare that stable PNG as their favicon (`1254x1254`). The asset and every legacy favicon route (`/favicon.ico`, `/favicon.svg`, `/favicon.png`, after redirects) returned the identical 2,330,481-byte original, SHA-256 `37acdda70dc75920c3b64200097c2a752584a9c89dba3ea05efcf59b6c8c27b5`.

The verified root recrawl request covers discovery of the updated favicon. The site configuration and request are complete; Google's search-result artwork has not been observed refreshing yet. [Google's favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search) says updates may take several days to several weeks and the URL should remain stable. A favicon applies across a hostname, including both language subdirectories.
