# Demo v8 · English narration and readable captions

The owner rejected the previous English pronunciation and subtitles. The English movie now uses newly generated US English narration at normal synthesis rate, with a rewritten script and captions aligned to measured word boundaries. English duration is 26.301 seconds; Chinese remains 22.861 seconds. Both cuts retain the six-scene NVIDIA–Corning alert story and all historical observations from v7.

## What was wrong and what changed

The old English captions estimated phrase timing from character counts. On a 390px screen, the default subtitle font was too small and “seventeen / percent” broke across lines. Several spoken sentences were unnecessarily fragmented. `browser/before-390.png` records the actual production defect.

The new copy uses complete conversational sentences: “Set a price alert. Get notified when it hits your level.” Numbers appear as “35” and “17%”, with authored phrase breaks. Every English word is matched in order against retained source WordBoundary metadata. All 12 English cues preserve their authored line breaks; captions have at most two lines, 38 characters per line and a reading speed below 25 characters per second. CSS sets a 14px minimum for mobile and 28px maximum for desktop. Four regression tests reject missing words, bad boundaries and drift back to character-ratio timing.

The English translation selectable in the Chinese movie is also rewritten. Its 11 cues follow reviewed Mandarin ASR phrase ranges, covering all source words once. The existing Chinese voice WAV files are byte-identical to v7; its native captions now use the same measured phrase boundaries. No new Chinese synthesis was performed in this revision.

Visual inspection also caught a mismatch: while the subtitle said almost 17%, the animated chart still displayed an intermediate date’s 26.3%. Both videos now reach the final date before the result phrase starts, then hold the complete path. All 21 observations, including pullbacks, remain. A media check enforces this ordering. The selected historical result is GLW +16.7844%, rounded to +16.8% on the chart, and SPY +3.3812%, rounded to +3.4%. The historical condition replay, user-defined $180 threshold and absence of actual GLW notification-delivery evidence remain explicit; this edit changes no market facts or research algorithm. See `DEMO-ALERT-STORY-2026-09-06.md` for sources and limits.

## Speech provenance and acceptance limits

The selected English stock voice is Microsoft `en-US-JennyNeural`, generated with `edge-tts` 7.2.8 at +0% rate and +0Hz pitch. The service provides no immutable model revision. Source MP3, word metadata, original and selected WAVs, exact client dependencies and hashes are retained under `scripts/demo/evidence/voice-v8/`. Generation is an offline editorial operation; no TTS package or cloud call is added to build, application or request paths. No reference voice or voice cloning is used.

The all-caps NVIDIA input was ambiguously transcribed as “and video”. Three bounded alternatives were checked without transcript prompts. The selected clip keeps the same Jenny voice but supplies `Nvidia` as a word; its independent transcript correctly reads NVIDIA. The displayed brand spelling remains NVIDIA. RSI is supplied as the separate letters “R S I”. All six final English clips independently transcribe to the complete script, including company names, numbers and the closing CTA. Silence trimming preserves at least 180ms after the final active waveform window and 150ms after the final provider word; no speed or pitch transformation is applied.

This agent cannot directly hear audio in this session. Independent ASR, waveform analysis and visual playback checks do not certify native pronunciation or subjective voice quality. The earlier technical checks were insufficient grounds for calling the previous voice natural. This revision changes the voice and wording and records the actual evidence, without claiming a human listening review. The unchanged Chinese clips retain three ASR review notes for numeral/script formatting and the Ducky homophone; they are not new English failures.

Provider references: [Microsoft voice inventory](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support), [edge-tts source and usage](https://github.com/rany2/edge-tts).

## Verification

- 203 frontend tests pass. Four word-caption regression tests pass. Final 20-page build, copy lint and 730-link check pass.
- Final English media gate: 606 checks, zero failures or review notes. Final Chinese media gate: 638 checks, zero failures, three retained ASR review notes. All four caption tracks cover their exact complete scripts.
- Backend read-only/TEST_MODE selftest: 1,460 passed, ALL GREEN; architecture lint: zero failures or warnings. The launcher requires the production directory, so the local gate invoked `bin/selftest.py` directly with the existing Python environment.
- Both full H.264/AAC MP4s decode without errors. English is 26.301 seconds; Chinese is 22.861 seconds. Audio normalization, fast-start MP4 and native selectable captions are retained.
- Mobile 390px and desktop 1440px screenshots verify line breaks, readable numbers and no page overflow. Six English chapters seek and remain paused; a complete English playback reaches `ended=true` with no media error. Chinese playback also covers the new selectable English translation. Additional live verification is recorded below after release.
- All v7 assets remain available for rollback. No production alert, notification, watchlist or backend process was changed. Voice and production details stay in this internal report, outside the customer UI.

Final evidence is `media-verification-release-en.json`, `media-verification-release-zh-final.json`, the two render reports, `browser-qa.json` and `production-http.json`. Earlier draft artifacts are retained for traceability and are not final acceptance.
