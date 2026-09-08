# Full-site coherence acceptance · 2026-09-08

The shared-evidence, research-page, follower-update and source-fidelity changes are published. The detailed source-to-website acceptance matrix, backend changes, migration recovery bundle and live data limitations are recorded in [the backend audit](https://github.com/ssurmic/ducky-bot/blob/web/reports/COHERENCE-2026-09-08.md).

## Frontend acceptance

- Opened all ten public templates in both languages: home, track-record, research-records, ideas, idea, trending, privacy, disclaimer, 404 and app shell. Checked all six FAQs per language, source expansions, loss-inclusive research records, navigation and account access boundaries.
- Traversed authenticated watchlist, calendar, chart, information map, stock research, daily/weekly briefing, radar and fixed report readers, opportunities, screens, market, macro, Vibe, creator latest/backtests/simulation/leaderboard, updates, alerts, profile and billing. Tested mutations in isolated fixtures; did not save live alerts/screens, change watches, send test messages or charge an account.
- Expanded the AVGO map's initially returned 16 nodes and subsequently checked the 18-node view. Confirmed a real update notice and explicit reload. The stock research page now shows five selected creator points, preserving author, publication and association times, original horizon wording and exact point/video links. This is selected evidence, not a promise that every video or analysis is complete.
- Verified the TALK 2026-09-03 AVGO point reaches video `3E-HXC2HUvg` at 16:13. Original transcription conflicts and retrospective collection remain qualified; this is source navigation, not mature performance evidence.
- Expanded historical report source text and confirmed private reminder references are removed at presentation. Market read validation removes the LULU relationship formerly inferred from promotional hashtags. Raw historical audit records are retained.
- Confirmed the example SMH idea has no calculated +135.8% return or latest quote in either language. The original text remains with an explicit unverified-format-illustration label. Real paper losses remain visible in regression tests.
- Corrected detail-page language switching to preserve the selected idea and anchor across desktop/mobile/header/footer controls. Static rewrite pages previously sent the user to an empty `/idea/`.
- Opened all 25 leaderboard disclosures and the ranking rules: insufficient samples remain unranked. Opinion backtests explicitly have no mature eligible views. The fictional simulation is labeled and retains the response rule's -$62 comparison against holding.
- Inspected the compiled app in isolated, clearly labeled synthetic fixtures at 320/390 CSS px, both languages and both themes for research, map and updates. All eight map and update combinations had no horizontal overflow; research 320px was measured in both languages and eight layouts visually inspected. This is browser layout acceptance, not physical-device/Safari certification.

## Verification and publication

The final integration run passed **387 frontend tests**. Copy lint passed over 2,564 files and the internal link check passed **1,342 links with zero planned-page warnings**. Backend integration passed **2,406 tests / 5 warnings**, selftest ALL GREEN. Counts include concurrent work by other tasks.

The existing Back-navigation test intermittently asserted before JSDOM completed traversal under parallel load. It now waits for the actual `popstate`, retaining the same route/panel assertions. The full suite passed after that change.

Code releases: `65d351d` (shared read/update preference), `2cab6f1` (reviewed creator records), `14949af` (format examples), `66eb1fc` (detail language navigation), `1881b1d` (stable Back acceptance). The final deployment details are recorded below and in the backend audit. Concurrent navigation, content-reader and evidence-hub work was integrated before release; original working directories and user changes were not reset.

Final Pages deployment: **`db2713b2`**, built from `1881b1d`, published to `duckybot.app` on 2026-09-08. The real site was then traversed Chinese → English → Chinese on `/ideas/example-smh-kindex-2026-08/#idea-thesis`; the same record and anchor survived. Header, mobile and footer language links point to the same selected record. Format-illustration qualifications and missing performance remain visible in both languages.

## Limits kept visible

The site uses bounded shared-read revalidation with an explicit reload notice; it does not atomically switch every page or stream real-time quotes. History/account/forms are excluded. Missing prices, source coverage, source revisions and model review failures remain separate states. One real silent AVGO model attempt failed semantic review and was not published. No actual email/Telegram/browser-push delivery or payment transaction was exercised in this audit.
