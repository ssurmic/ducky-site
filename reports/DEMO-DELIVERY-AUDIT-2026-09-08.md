# Demo delivery audit after the usage interruption

Initial check on September 8, 2026, around 18:14 UTC. Fresh live-browser checks confirm the homepage still uses **v9**. At this initial audit no DGX inference, speech generation, notification sends or live resource changes occurred. The private static storyboard server was restarted locally after the interrupted session. A subsequent owner-authorized independent INTC cut is now complete; see the [new draft delivery](DEMO-INTC-DRAFT-2026-09-08.md). This audit preserves the earlier public-media and old-asset inventory.

## What is actually published

| Page | Observed media | Measured duration | Chapters |
|---|---|---:|---:|
| [Chinese homepage](https://duckybot.app/#product-demo) | [Chinese v9](https://duckybot.app/media/ducky-walkthrough-2026-09-07-watchlist-v9.zh.mp4) | 36.101333 s | 8 |
| [English homepage](https://duckybot.app/en/#product-demo) | [English v9](https://duckybot.app/media/ducky-walkthrough-2026-09-07-watchlist-v9.en.mp4) | 33.421333 s | 8 |

Both players expose Chinese and English WebVTT tracks. A cold chapter seek to the final CTA reached 33.68 s in Chinese and 30.36 s in English, with `paused=true`, `readyState=4` and no media error. The Chinese user tab was restored to its first chapter, paused, with the guide closed; the temporary English audit tab was closed. This verifies loading and chapter seeking, not an audiovisual playthrough or every animation's smoothness.

The published scene sequence is watchlist → investor disclosures → Nokia/Corning terms → price alert/history → macro context → creator view → inbox/daily summary → start. The guide links to watchlist, insider screening, creator discovery, calendar, briefing, updates and the fictional portfolio scenario. Its historical-replay wording does not claim contemporaneous alert delivery.

The local v9 manifest identifies Xiaoxiao (Mandarin) and Jenny (US English) female voices. That proves the selected synthesis configuration, not that native pronunciation, professional delivery or subjective listening quality has been accepted. The new Information Map → specific TALK point → original timestamp → later prices → selected-channel delivery workflow is **not in the published video**.

## Existing unpublished assets

The earlier v10 files remain in `/Users/zizhaozhang/dev/ducky-site-demo-v10-20260907/public/media/`. Chinese is 38.461333 s and English 36.701333 s including container padding. Neither is referenced by the freshly loaded homepage. Preserve them; do not publish the older v10 merely because it has a newer filename.

The selected v10 audio source is `/tmp/ducky-demo-v10/audio-v2/`, not `audio-v1`. All **54** MP3/WAV/word-boundary files match the checked-in generation manifest; all **18** WAV hashes match the final render report. Voices are Xiaoxiao and Ava. The [machine-readable inventory](demo-case-review-20260908/demo-delivery-audit-20260908.json) records every absolute path, hash, scene, spoken text, voice and media probe result. These temporary files exist now and need preservation before any `/tmp` cleanup.

Reference manifests and processing receipts are in the v10 worktree:

- `scripts/demo/voiceover-2026-09-07-v9.json`
- `scripts/demo/voiceover-2026-09-07-v10.json`
- `scripts/demo/evidence/voice-v10/generation-both.json`
- `scripts/demo/evidence/voice-v10/render-report.json`
- `scripts/demo/evidence/voice-v10/speech-check.json`
- `scripts/demo/evidence/voice-v10/media-verification.json`

The current draft has **zero exact whole-scene spoken-text matches** against these 18 selected takes. Reuse voice samples for audition and reuse the timing/render tooling. Generate the accepted new narration and align its subtitles to its own word timings. Do not attach new subtitles to old speech. Previous ASR/encoding checks are technical evidence, not native-listening acceptance.

## Prepared new recording path

The [bilingual draft](../scripts/demo/voiceover-2026-09-08-information-map-draft.json) and [case evidence](DEMO-INFORMATION-MAP-STORY-2026-09-08.md) describe nine scenes with a **38.6-second editing budget**, not measured final audio. The [private silent storyboard](../scripts/demo/recording/information-map/README.md) is available locally at `http://127.0.0.1:8807/`; it is neither a public route nor final media.

The existing accepted COIN path starts at `/app/#/evidence/COIN`. Open the specific TALK point `claim:376ccef604efec29b1330bab`, video `0tTj4dtJDyM`, and its [24:22 original source](https://www.youtube.com/watch?v=0tTj4dtJDyM&t=1462s). Continue through its COIN chart link. Use the immutable August 7–September 4 window with all 21 closes, including declines. The first close precedes publication; +20.2% is a selected share-price change, not a tradable entry return, product performance or proof that the view caused the increase. September observation cannot establish first capture in August.

AVGO remains a separate watched stock for filings, overview and the bounded Reddit count example. Current source review is still changing; the creator owner reported an AVGO field-review prompt ambiguity during this audit. Do not freeze or record those affected points until the owner supplies stable acceptance. The prior dated QA receipts remain historical evidence. The limited Reddit record supports mention counts only, with insufficient sample and no sentiment score. X remains unconnected.

The full closing CTA already exists at the start of its 3.2-second storyboard scene. Final recording must still verify the completed end card with final audio, phone subtitles and native-language captures. Some preview source screenshots are Chinese even in English rehearsal; recapture the English application rather than treating this as final English footage.

## Remaining work and the delivery scene

1. Receive the creator owner's stable source/version handoff; review the current overview and natural English through the shared producer. No demo-specific DGX job or TTS while the three source points are under serial review. Existing complete source records can be prepared as alternatives.
2. Capture the accepted current application in each language. Preserve original citation bindings and dated previous-analysis labels during normal refresh. Do not deploy this older preparation worktree over current product code.
3. Audition and listen through both final voices, check company-name pronunciation and sentence endings, align word-timed captions, verify phone readability, transitions and end-card playback, then coordinate homepage publication.
4. No external Telegram/email receivers are designated for this turn, so no sends are authorized to arbitrary accounts. The creator owner's latest handoff allows the demo to show the existing product inbox and notification settings with their actual status while external delivery is unverified. The current draft's external-arrival sentence and placeholder must be rewritten before such a cut; showing settings does not prove a message arrived. The full product acceptance still needs designated accounts, identity/email verification, preferences, idempotent test sends and separate real receipts.

No new final publication has happened. The subsequent independent INTC review draft does not replace v9 online. Existing demo heartbeat remains paused.
