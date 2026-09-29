# Compact attributed video views — candidate acceptance

Status: implemented and locally tested; not merged, deployed or accepted against live content. This is an additive frontend candidate based on `cd218fa5e518bf25628fea3105364ea77df2f74d`. The associated backend delivery candidate is `d654c56fd71ad3a212c586f10df0712158c5a498` (based on `a8f9c68b1ac18536077fe0564c89824a563cadc5`); its live availability and rollout remain a separate gate.

## Behavior and meaning

Today adds the latest qualified macro views without requiring author follows. Explore retains stock search and ranked company comparisons first, then adds latest creator views. A stock Overview adds only server-filtered company-subject views whose verified navigation ticker matches that stock. The same `creator-opinions/1` revision supplies all three surfaces; no page performs source acquisition or inference.

Each row retains the full bilingual claim, conditions, horizon, speaker identity, stance text and original publication date. Bullish/bearish color supplements text. An original-video action uses the canonical source URL and an explicitly approximate minute/second navigation point; missing timing opens the video without inventing a timestamp. Source details separate publication, observation, review and product availability clocks. Exact repeated views retain every dated original record and explicitly do not imply independent corroboration. Opposed views and changed conditions remain separate.

The existing transcript and metadata feed remains readable on Today. Native aggregate posts in that separately replicated feed are not rendered again: otherwise a withdrawn opinion could reappear through an older aggregate cache. Native views use the new revision boundary; full creator/source pages remain unchanged. This also preserves useful transcript content if the additive endpoint is unavailable.

## Read lifecycle

Every mount revalidates through one authenticated shared GET, with topic or ticker filters before pagination. Visible online views poll every 30 seconds; hidden, offline, disposed and previous-account callbacks cannot paint. Refresh preserves still-valid source disclosures, keyboard focus and scrolling. New revisions replace withdrawn content; a successful empty response clears the prior rows. Denied/gone reads clear protected rows. Ordinary transient failure retains the previously read version with an explicit warning and retry, while an initial failure does not claim an empty archive.

The browser rejects a late older revision already superseded by a newer shared read. Pagination is explicit and bound to the server revision; a changed cursor restarts the current first page. This is not a claim of atomic replication across the separate legacy feed and page caches, nor a 30-second end-to-end publication SLO.

## Validation

- The earlier full build and **860 Node tests passed before the final legacy-section heading change**; the post-repair complete run is recorded below. Focused coverage includes access withdrawal, account/dispose races, stale revision rejection, pagination, visibility/offline polling, zero versus missing navigation timing, complete semantics, legacy transcript retention and native withdrawal without aggregate resurrection.
- **14 Python tests passed** across close exports and homepage source/proof contracts. Asset-isolation tests: **4 passed, 1 expected local skip**.
- Copy lint: **4,251 files**, zero violations. Link check: **2,109 links**, zero planned-page warnings. `git diff --check` passed.
- Independent Chromium visual matrix: Today, Explore and NVDA Overview at 320, 390 and 1440px in both languages and themes: **36 combinations passed**, plus compact initial-unavailable and successful-empty states. No document overflow, runtime errors or outbound requests; native frequent controls measured at least 44px. Claims use 13px on phones and 14px on desktop. Expanded source dates and refresh continuity passed. These are synthetic fixtures, not real source-fidelity, account-write or production delivery evidence.

Reproduce after `npm ci` and `python3 build.py`:

```sh
python3 tests/browser/serve-product-focus.py --port 8947
# In another terminal:
QA_BASE=http://127.0.0.1:8947 node tests/browser/creator-opinions.mjs
```

Open `/qa-frame?lang=zh&theme=dark&case=native-opinions#/today`, `#/explore` or `#/stock/NVDA`. Add `opinions=unavailable` or `opinions=empty` for the bounded failure/empty fixtures. The server is loopback-only and has no API proxy. Screenshots and measurements default to `/tmp/ducky-native-opinions-browser` and are not shipped. The existing fixture's stale close-data import was corrected to its tracked synthetic file.

## Hosted CI failure and bounded repair

Draft PR114 candidate `e8d0702089861424882dea9e42874a72ae6b5689` failed [hosted run 36541554412](https://github.com/ssurmic/ducky-site/actions/runs/36541554412): `tests/today-macro.test.js` still expected “Creators on the macro backdrop” after the legacy remainder was renamed “More creator updates”. The earlier 860-test local pass preceded that last copy change and did not certify the submitted candidate. The repair updates only that obsolete heading assertion; publication ordering, source links, stance, ticker badges, pending analysis and empty-state checks remain intact. No product code or visual design changes are part of this repair.

The associated corrected backend candidate is `d654c56fd71ad3a212c586f10df0712158c5a498`. This identifies the reviewed integration candidate, not deployment or live-content acceptance.

Post-repair validation on `e8d0702089861424882dea9e42874a72ae6b5689` plus the two-file test/report repair passed the full build and **860/860 Node tests** (22.73 seconds), **14 Python tests**, and asset isolation (**4 passed, 1 expected local skip**). Copy lint checked **4,132 files** with no violations; **2,109 links** passed with no planned-page warnings. The generated calendar export was restored, and `git diff --check` passed. Product source and locale content were unchanged, so this repair did not repeat or extend the earlier synthetic visual acceptance. No repair commit, new hosted pass or production deployment is claimed here.

## Remaining release boundary

No production API or account action was used in this acceptance. Backend publication, exact replica readback, access and withdrawals must be available before deployment and then inspected with actual content. This candidate does not promote video paraphrases into transcript quotations, supporting evidence, performance records or independent votes. Editorial ordering, complete historical coverage and delivery latency are backend receipts, not inferred from a successful frontend render.
