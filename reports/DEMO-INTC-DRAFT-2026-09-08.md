# INTC demo: playable bilingual review draft

The independent INTC draft is complete: **32.52 seconds in Mandarin and 31.32 seconds in English**. Both use new female narration, actual production UI captures, visible primary-language captions and a fully rendered closing card held for 3.2 seconds. This is a private review cut; the published v9 homepage videos remain unchanged.

## Play and reproduce

- Local review: `http://127.0.0.1:8808/` — language selector, native playback and eight chapter buttons.
- Mandarin: `/Users/zizhaozhang/dev/ducky-demo-artifacts-20260908/intc-draft-1/render/ducky-intc-draft.zh.mp4`
- English: `/Users/zizhaozhang/dev/ducky-demo-artifacts-20260908/intc-draft-1/render/ducky-intc-draft.en.mp4`
- The same `render/` directory retains four WebVTT tracks, contact sheets, extracted caption/closing frames, `render-report.json` and `verification.json`.
- Selected audio and provider word boundaries are in sibling `audio/` and `audio-revision/` directories. The two revised Mandarin takes avoid awkward English-name switches; English keeps the native company/service names.

The [narration manifest](../scripts/demo/voiceover-2026-09-08-intc-draft.json), [local renderer](../scripts/demo/render_intc_draft.py) and [review server](../scripts/demo/serve_intc_review.py) reproduce the cut from retained local inputs. The server binds only to localhost and exposes the selected two videos/four subtitle files; it does not expose source screenshots, directories, profile fields or account APIs.

```sh
python3 scripts/demo/serve_intc_review.py /Users/zizhaozhang/dev/ducky-demo-artifacts-20260908/intc-draft-1 --port 8808
```

The renderer uses the bundled Python/Pillow runtime, local CPU ffmpeg and existing duck artwork. It does not run inside builds or product requests. A pinned `edge-tts==7.2.8` client was installed from the existing local pip cache into `/tmp/ducky-demo-intc-20260908-venv`; Microsoft online speech generated Xiaoxiao/Ava takes. No paid subscription, neural-model download, DGX memory allocation, GPU use or product-model call was needed. The two output files include H.264 1920×1080 at 25 fps and AAC at 48 kHz. Final normalization targets -16 LUFS / -2 dBTP without stretching speech speed or pitch.

## Real source workflow

The video starts with the existing general watchlist, then explicitly explores Intel's Information Map. INTC was not added to this account's watchlist. The actual signed-in path was checked in both languages:

1. `/app/#/evidence/INTC` → the August 24 TALK card, “继续持有英特尔 / continue holding Intel”.
2. Exact creator/video/point page: `creator=touzi-talk&post=CEGiQA6CNd4&point=claim%3A231a64321ade3830e177cc93`.
3. Original excerpt and [4:06 source link](https://www.youtube.com/watch?v=CEGiQA6CNd4&t=246s). YouTube actually opened the matching episode; the first paused control showed 4:06, and the later decoded paused capture showed 4:08. The black loading capture was rejected. The original frame contains NVIDIA product-price context; its percentage is not used as a stock-return claim.
4. Actual alert form, with an unsaved Intel-below-$100 example in each language. Neither the interpretation button nor enable/save was clicked. The Mandarin screenshot was replaced after confirming the filled text had painted. The final condition was cleared and the temporary tab closed.
5. Actual profile delivery controls: email ready; Telegram not linked and disabled. Identity fields are excluded from the final crop. No preferences were changed and no test button was clicked.
6. Existing September 6–19 investment calendar, showing earnings, macro releases and session arrangements. No analysis or schedule computation was requested for the recording.

The creator's statement is self-reported holding **at the time**, with the original neutral label retained. It is not a present holding assertion or a return forecast. Publication is displayed as August 24, 04:34 UTC; first recording September 6, 22:36 UTC; update September 7, 02:26 UTC. These are minute-level UI labels. The historical statement is not described as a real-time capture or historical push. INTC's overview was pending and is not presented as ready. The three ORCL/AVGO/MU points undergoing separate review are not used.

The [workflow receipt](demo-case-review-20260908/intc-draft-workflow-20260908.json) records the routes, source identity, clocks, checked UI states and limits. A brief backend deployment was being coordinated separately; all selected captures show loaded content, with no loading frame substituted as a complete result. Source/UI/INTC changes were not part of that deployment.

## Validation and remaining acceptance

Both complete files decode without errors. The check verifies codecs, **813 Mandarin / 783 English frames**, duration within 30–40 seconds, contiguous eight-scene timelines, selected audio hashes, caption text coverage, no more than two subtitle lines, and cue bounds derived from the generated first/last word timings. Primary subtitles are burned into the video so the standalone MP4 is reviewable; separate language tracks are also retained. English was authored as English rather than a word-for-word Chinese rendering.

Both versions also played uninterrupted to `ended=true` in the actual in-app browser, at 32.52 / 31.32 seconds, with no media error. The [browser playback receipt](demo-case-review-20260908/intc-draft-browser-playback-20260908.json) is retained. The generated caption frame and both ends of the closing card were visually inspected. The complete CTA is present at the first closing frame and remains unchanged at the end. These checks cover the earlier delayed-ending defect in this draft. They do not certify native pronunciation, human-like delivery or final mobile readability of every small UI label. Native listening and final editorial/product acceptance remain required before publication.

The cut uses dated screenshots with editorial camera movement and titles, **not continuous real-time screen recording**. It shows actual settings; it does not claim email/Telegram delivery occurred. Separate designated-receiver receipts remain necessary to close the original external-delivery acceptance. The earlier broader COIN/AVGO storyboard and unpublished v10 remain intact for later integration.
