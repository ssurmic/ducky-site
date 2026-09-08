# Intel creator-source tutorial

Adds a collapsed bilingual tutorial below the existing main product tour and its guide. The main v9 media, eight timestamp chapters and seven feature links are unchanged. Prepared from main c93612f; no old demo branch is merged.

The tutorial follows a real captured workflow: watchlist → Intel Information Map → TALK’s historical holding statement → original words → price-alert configuration → delivery settings → calendar. Chinese duration is 34.32 seconds; English is 31.48 seconds. It is edited from actual product screenshots, not a continuous recording or a latency measurement.

The original subtitle export puts “包括英特尔这边肯定是继续持有” at 4:09. The product’s 4:06 link keeps preceding context. The NVIDIA product-price screenshot in draft 1 has been removed. The new shot clearly labels the original caption quotation and shows the actual Ducky source excerpt below it. The original YouTube transcript UI remained loading and is not represented as a captured working panel.

The source was published August 24 and recorded September 6, 2026. This does not claim immediate historical capture, a current holding, a new purchase, subsequent returns or alert delivery. The price-alert shot teaches choosing a price and reviewing the condition, with one small “not enabled” label. The settings shot shows email ready and Telegram not linked; no preferences were changed and no messages were sent. The pending Intel overview is excluded.

## Playback and accessibility

Both voices retain their original speech speed. The final call to action stays visible for 3.2 seconds. Web files use separate native Chinese and English tracks with localized defaults, plus an expandable text transcript and original-source link.

A real 320px browser check caught clipped long English captions and overlap with controls. The web edition now uses 17 short phrase cues per voice, matched to the selected speech’s word boundaries. Native caption size is limited to 90%; only this tutorial uses the higher portrait position. Collapsing the tutorial pauses its audio without touching the main film. Media preload remains none and there is no autoplay.

## Validation

- Four rendered variants fully decode: native-caption web editions and private review editions, in both languages. H.264 1920×1080 at 25 fps; AAC 48 kHz. Selected audio hashes, spoken text including the 4:09 pronunciation override, provider word bounds, eight continuous scenes and CTA timing pass.
- Both web editions played to ended=true in the actual in-app browser, with no media error. Main v9 cold last-chapter seeks reach 33.68s Chinese / 30.36s English, paused with a decoded frame. The other player stays untouched.
- 424 JavaScript tests pass; Python export tests 3 pass; module-build tests 4 pass and 1 conditional test skips. Copy lint, internal links and diff checks pass.
- 320×600 and 390×650 browser viewport simulations in both languages and both native site themes show no horizontal overflow. Header height is 65px, leaving 535/585px. After expanding and a short scroll, the player is fully visible. These are viewport simulations, not touch emulation or physical-phone tests.
- No independent human native-listening certification is claimed. No algorithm, historical record, API, auth, billing, external delivery or app module changes.

Machine-readable source, audio, phrase, browser and asset receipts are in `scripts/demo/evidence/intc-v2/`. Raw authenticated screenshots and speech inputs remain local outside the repository; the published crops exclude account identity. The backend tracker remains local while its push freeze applies.

## Publication

Approved scope: publish this collapsible supplement after successful CI; preserve the v9 main tour and guide. Published entry: `https://duckybot.app/#intc-tutorial` and `https://duckybot.app/en/#intc-tutorial`. PR #1 passed CI and merged as `5ebff4521d26737b6b50f331e8836793fc1989ea`; main CI also passed (run 34269417974). Pages deployment `6729ae40` serves the verified build. Both live pages return 200, retain v9 / eight chapters / seven feature links, and all eight media assets match the recorded SHA-256 hashes. Both production videos play through to their exact durations with ended=true and no media errors. The original-view link reaches the normal product login gate in the unauthenticated browser; no sign-in was submitted. This acceptance record is a documentation follow-up; the deployed code remains 5ebff452.
