# Demo v7 · Corning condition alerts

Owner requested a faster, more attractive demo built around NVIDIA–Corning, a chosen price level, an oversold condition and the subsequent price path. This cut is 22.861 seconds in Chinese and 21.461 seconds in English. It replaces the v6 homepage selection; all v6 assets remain available for rollback.

## Story and factual limits

The six scenes show the May 6 company event, a user-defined $180 price condition, why a price dip is not necessarily oversold, the July 28 RSI condition, the following twenty trading days, and the real unsaved alert form followed by the free CTA. Price history unfolds through nine daily-close points, and the outcome through all 21 daily-close observations. The price-level example and RSI example are separate rules and dates.

- [Corning’s May 6 announcement](https://investor.corning.com/news-and-events/news/news-details/2026/NVIDIA-and-Corning-Announce-Long-Term-Partnership-To-Strengthen-U-S--Manufacturing-for-AI-Infrastructure/default.aspx) establishes the long-term partnership. Its [SEC 8-K](https://www.sec.gov/Archives/edgar/data/24741/000120677426000273/glw4631061-8k.htm) records NVIDIA’s $500 million aggregate warrant purchase. The $180 traditional warrant exercise price is not NVIDIA’s stock acquisition cost or a valuation floor. The movie labels $180 as a user-defined alert example.
- May 18 close: $178.55, daily Wilder RSI(14) 51.6. This satisfies the example price rule but not daily RSI below 35. Weekly/monthly RSI also do not qualify the existing default oversold predicate on this date. This is the first qualifying daily close after the event, **not** the first intraday crossing: May 6’s intraday low was already below $180. The price-level example’s own next-20-session price change was approximately −0.63%; the +16.8% headline is not attached to this earlier example.
- July 28: first daily RSI below 35 after the announcement in the retrieved series, RSI 30.7, close $126.01. Existing `bin/technicals.py` is applied to each historical prefix (474 daily bars through the trigger). No future bars determine qualification. This recomputes RSI today; it is not a stored contemporaneous indicator snapshot.
- July 28 → August 25, twenty trading sessions: GLW $126.01 → $147.16, +16.7844%; SPY +3.3812% over identical dates. July 29 first dipped −1.5554%; later drawdowns remain in the full path. The trigger does not select that later low. Unadjusted price changes exclude dividends, fees and taxes. This is a selected historical illustration, not a strategy return, fill, creator return or forecast.
- A read-only query of public GLW signals in the production ledger returned zero rows. The film and expandable guide therefore identify a historical condition replay and never claim that a GLW notification was actually sent then. No alert, watchlist, outbox row or notification was created for this recording.

Frozen inputs and methods: `scripts/demo/evidence/voice-v7/case.json`, `input-glw.json`, `input-spy.json`. Both public price series end September 4; their processing time remains distinct from the historical price dates. Existing predicate validation/evaluation confirms the two explicit rules. No research algorithm, score, stock universe or return baseline changed.

## Narration and edit

Chinese uses stock Serena (Qwen 1.7B); English uses stock af_heart (Kokoro), at native synthesis speed 1.12. No voice cloning. English has a separate native model rather than passing English through the Chinese voice. Four Chinese sentences were rewritten and regenerated after the first independent transcript had ambiguous words. The selected transcript recovers the company names, dates/period, RSI threshold and closing CTA. Remaining textual differences are numeral formatting, simplified/traditional Chinese and the English homophone “Bax” for “backs”.

Six English clips had excess trailing silence. `audio-edit.json` records the exact cut: retain at least 180 ms after the last 10 ms window above −48 dBFS and 150 ms after the ASR final word. Original WAVs are preserved under `audio-original/`; all twelve selected clips were independently transcribed again after the trim. The assembler adds 80 ms before/after each clip and 60 ms video fades; speech is not time-stretched. The shorter July 28 scene receives a two-second minimum so the new date and condition can be read. The CTA phrase is complete, with no old “开启体验” wording.

This agent cannot directly hear audio in this session. ASR, waveform checks and playback verification are technical/content evidence, **not a subjective listening certification**. No claim of human-reviewed voice naturalness is made.

## Verification

- 203 frontend tests pass; final 20-page build, copy lint and 730-link validation pass. Read-only/backend TEST_MODE selftest on clean upstream `c77aebf`: 1,460 tests pass, ALL GREEN. No backend runtime changes are part of this demo.
- Final media gate: 1,051 checks, zero failures, all 12 WAV/ASR pairs and four complete bilingual caption tracks. Six ASR formatting/homophone review notes are retained above. Earlier draft verification artifacts are retained and are not final acceptance: the first failed because its gate still assumed the old fixed 600 ms padding; both assembler and checker now read bounded manifest timing, with old defaults preserved.
- Both complete MP4 files decode without errors. 24 extracted encoded frames pass content checks, including moving-chart and final-card frames. All 76 browser captures have checked dimensions, main content and duck-brand pixels, avoiding previous incomplete-paint captures. Product screenshots contain only unsaved example conditions.
- H.264 1080p/25 fps, AAC/48 kHz, fast-start MP4. Chinese file 888,425 bytes; English 929,352 bytes. Captions remain native and selectable, in the reserved area. Default is paused, preload none; chapter navigation seeks and stays paused.
- Six video chapters are separate from the existing seven feature links. Free/Pro boundaries remain explicit. Voice gender, model names and production details appear only in this internal report, never in the customer UI.

Browser and production verification are recorded in `browser-qa.json` and `production-http.json` after final publication.

## Publication accepted

Source `546ba8f` pushed to frontend main; Cloudflare Pages **d9e0aa56** serves the new cut.
Both canonical homepages select alerts-v7. All eight production media assets are byte-identical
to the reviewed files; both MP4s return HTTP 206 for range requests. Production mobile Chinese
and English cold-seek correctly, remain paused until Play, and both complete to `ended=true`
without media errors. Native captions and 390px layouts were visually checked; local 1440px
English and 390px Chinese checks cover all six offsets. The free-alert CTA is live in both
languages. See the final `production-http.json` and appended `browser-qa.json` evidence.

Backend clean-upstream selftest: 1,460 passed; architecture lint: zero failures/warnings.
Task-owned synthesis/ASR units have exited successfully. No production process or model was
restarted. Local preview servers are stopped and the temporary browser viewport is reset.
