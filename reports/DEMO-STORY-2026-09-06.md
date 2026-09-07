# DEMO-03 · A creator view, its price history, and a reason to follow

Owner request: remove the dragging Chinese close, improve both narration languages, replace the flat example with a compelling real case, and keep a coherent product story. Production details stay out of customer copy.

## Delivered edit

- Chinese 28.301 seconds; English 26.581 seconds. Five scenes: idea → original context → all twenty following trading days → stock page and follow-up actions → free start.
- Chinese closing is one regenerated sentence: “先加一只股票，免费试试吧。” No mid-sentence splice or speed/pitch stretch. Its only detected pause over 150 ms is 197 ms at the comma; final words are not separated by a long silence.
- English uses a language-specific American female voice. Both tracks have independent bilingual native captions; spoken language does not force caption language.
- The price path reveals all 21 daily closing observations, including the decline from May 11 to May 19. The complete curve remains visible at the end of the scene.
- The stock-page image is a crop of the real production AMD page, with its September 4 daily-bar date retained. Other scenes are editorial compositions of the sourced case, not a claimed continuous screen recording or a new interactive UI.
- Homepage retains seven independent feature links, with five separately labeled video chapters. The original case video opens at 22:49. Free/Pro access remains explicit. Removed one remaining raw content hash from creator-research details; original quotes, dates, revision notices and losses remain available.

## Source and price evidence

Selected example: Shanghao Jin, post 203, [original video](https://www.youtube.com/watch?v=PweaTXhs-aU&t=1369). AMD company reference is at 1369.76 seconds; hold/no-change action follows at 1372.36. This is a neutral, self-reported holding, not a buy instruction, execution, or creator profit claim.

The original title contains April 21, but the supplied source publication timestamp is **2026-05-05 01:39:51 UTC**. The study uses that publication timestamp, not the title date. It was observed and processed in September; the film explicitly presents a historical review, not a contemporaneous alert.

Using the existing next-session rule and public daily price exports: May 5 close 355.2600098 to June 3 close 542.5200195 gives AMD +52.7107%; SPY +4.2099%. Both series use identical sessions; all path points were recomputed against the public AMD/SPY exports within 0.0001 percentage point. These are unadjusted price changes, excluding dividends, trading costs, and tax. No research algorithm or stock universe changed. This selected example does not establish aggregate product or creator performance.

Accepted production revision **317**, recorded **2026-09-07 02:26:12 UTC**, content hash `215f544a871479590407c113e0e74f280a1cce162db6a917a97605c891089e45`, was independently re-read through a read-only SQLite connection. The final AMD hold/action and all 21 price points exactly match the film. The correction is operator-reviewed; complete automatic extraction is not claimed. Incorrect generic-word ticker assignments found while selecting examples were sent to the existing creator-research agent; they are not used in the film.

## Verification

- Frontend after merging the creator-correction release and latest record export: **203 tests passed** after the final notification-UI merge. Twenty pages build; copy and internal-link checks pass.
- Media gate: **915 checks, zero failures**, all ten WAV/ASR segments and all four complete, nonoverlapping caption tracks checked. Full H.264/AAC decode passes; MP4 fast-start metadata precedes media data. Assets are under 1 MB per video.
- All **52 final editorial captures** checked for real content and exact 1440×810 dimensions. Three initially incomplete browser captures were replaced; their actual encoded frames were re-extracted and checked in `repaired-frame-check.json`.
- Audio review notes are explicit: EN “twenty” transcribed as “20”; Chinese follow-up uses traditional variants; the close has ASR homophones 夹/加 and 支/只. This is an independent transcription and timing check, **not a human listening certification**. The available session could not provide subjective audio listening.
- Local tests cover 1440-pixel and 390-pixel layouts, captions, no horizontal overflow, five chapter offsets, cold seek while paused and full playback. Final preview uses a Range-enabled no-cache server; Python’s basic static server and previously cached draft bytes were not treated as production seek evidence.

## Reproduction and rollback

Manifest: `scripts/demo/voiceover-2026-09-06-v6.json`; source WAVs, ASR, hashes, price path and generation manifests: `scripts/demo/evidence/voice-v6/`; captures: `scripts/demo/frames-v6/`; local editorial stage: `scripts/demo/recording/story-stage.html`.

Chinese: pinned Qwen3-TTS 1.7B CustomVoice, Serena. English: [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M), `af_heart`, speed 1.0, pinned revision `f3ff3571791e39611d31c381e3a41a3af07b4987`. [Voice documentation](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md). Models are isolated from product request handling. The existing production-owned Whisper-small ASR runtime was reused read-only and retained.

```sh
python3 scripts/demo/assemble.py scripts/demo/voiceover-2026-09-06-v6.json scripts/demo/evidence/voice-v6 /tmp/ducky-story-new-output --frames-dir scripts/demo/frames-v6
python3 scripts/demo/verify_media.py scripts/demo/voiceover-2026-09-06-v6.json scripts/demo/evidence/voice-v6 /tmp/ducky-story-new-output --frames-dir scripts/demo/frames-v6
```

Preserve v5 published media and evidence. Rollback uses its original asset stem and chapter mapping; do not overwrite media under a published filename. The demo heartbeat stays paused. No notification, watchlist, alert or trading state was written for this recording.

## Publication

Source `6d8f2c0` (includes latest upstream `7556630`) pushed to main; Cloudflare Pages **364de88b** published the demo. Both production homepages select story-v6; all eight media files are byte-identical to the reviewed artifacts. Both MP4 range requests return HTTP 206. See `production-http.json` and `browser-qa.json`. Customer-facing copy contains no narration gender, model or production explanation.

Release validation: 203 frontend tests, 20 built pages, authored-copy lint, 730 internal links, 915 media checks and full decoding passed. Production source revision 317 and the complete AMD/SPY path were independently verified before publication. Existing creator correction and notification correction UI were preserved.
