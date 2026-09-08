# Seamless bilingual demo — September 8, 2026

The main film now opens the Information Map within two seconds and follows one route: a watched stock → the creator's original words → Pelosi's disclosed transaction and original filing → a completed AI stock brief → oversold checks and alert conditions → Robinhood and Nokia historical cases. The chart is a one-second aside. Eight timed chapter links follow the new cut; the independent Intel tutorial is preserved.

## Film and speech

- Asset version `2026-09-08-seamless-story-v2`.
- Chinese 40.5667 seconds; English 42.6000 seconds. 1920×1080, 30 fps, H.264/AAC with fast-start metadata; approximately 4.8/4.9 MB.
- Independently written, native-language female narration (Xiaoxiao/Ava, native synthesis +9%). No post-generation speed changes. Provider end silence is shortened while retaining the last word and measured waveform tail. The final frame remains after speech.
- Short crossfades connect actual browser captures. Camera motion, the guiding pointer and the stock chips are editorial animation, not a claim about application latency. Both historical charts animate every saved daily close, including losses.
- Four caption tracks use the native provider's word timings. Narrow-screen phrases have explicit line breaks. The Robinhood translated cue joins the final phrases to keep Chinese and English word order meaningful.
- Final loudness: ZH −16.05 LUFS/−1.96 dBTP; EN −16.26 LUFS/−1.93 dBTP. Full decode, audio/video duration alignment, nonzero waveforms, fast-start metadata, caption completeness/non-overlap and the final reading pause passed. These are technical and authored-script checks; no independent ASR or human listening certification is claimed.

## Actual product and dated sources

- Chinese original view: 投资 TALK 君, AVGO, September 3, `3E-HXC2HUvg`, point `claim:75b2c484c5bc6622e1a45ec5`, [16:13](https://www.youtube.com/watch?v=3E-HXC2HUvg&t=973s). English: Parkev Tatevosian, CFA, NVDA, September 7, `qleHy1oNdjU`, point `claim:7ce209bd72de40349998fe26`, [9:45](https://www.youtube.com/watch?v=qleHy1oNdjU&t=585s). Original source captures and the prior verified points are retained; unrelated recommendations and account UI are cropped out.
- Pelosi: the actual Radar archive search opened Intel record `house:20035143:6`. The [August 21 filing](https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035143.pdf) identifies her spouse's July 24 purchase of 10,000 INTC shares, in the $500,001–$1,000,000 range. The film preserves spouse/trade/filing distinctions and the official PDF.
- Daily AI: the actual completed COIN stock brief, evidence checked September 8 at 13:28 UTC, price session September 4. Its top-line view, counterevidence control and Past briefs entry are visible. This does not promise that every stock has a completed fresh report. The owner confirmed existing scheduled covered-stock checks; new broad-market scanning is still being developed and is not advertised as complete.
- Alerts: only the existing condition editor and typed draft are recorded; no new alert was saved or sent. Price/event combinations have an independent saved-filter workflow. The empty related-video inbox was not represented as a populated timeline.
- Robinhood: [SEC Form 4](https://www.sec.gov/Archives/edgar/data/1783879/000178387925000189/xslF345X03/wk-form4_1750195641.xml), director Christopher Payne, June 13, 2025, 26,500 shares, weighted $74.1885. Filing June 17. Filing-day close $74.95 → July 17 close $105.45 over twenty sessions: +40.7%, maximum close drawdown 6.8%. Subsequent appreciation is not claimed to have been caused by the purchase disclosure.
- Nokia: [October 28 announcement](https://www.nokia.com/newsroom/inside-information-nvidia-to-make-usd-1-billion-equity-investment-in-nokia-in-addition-to-new-strategic-partnership-nokias-board-resolved-on-directed-share-issuance-to-nvidia/) of NVIDIA's $1 billion equity investment and AI-RAN partnership. The selected close-at-or-below-$6 historical condition first matched November 20 at $5.87 → September 4, 2026 close $10.03, +70.9%; maximum close drawdown 50.1%. The first twenty sessions after the news returned −22.0%, also displayed. $6.01 is the subscription price, not a market execution price.
- Historical charts use the unchanged full paths in `public/media/ducky-demo-cases-2026-09-07.json`: USD unadjusted daily closes retrieved September 7. Dividends and costs are excluded. The film and accessible source notes say historical replay, not past delivered alerts. The full source data remains linked, including loss cases.
- X/Reddit remain an in-progress ending preview.

## Validation and isolation

- All 448 JavaScript tests passed; Python 8 run/1 expected skip; copy lint and 1,350 links passed.
- Chinese local browser playback completed at 40.5667 seconds with `ended=true` and ready state 4.
- Local WebKit mobile views checked at 390×650 (Chinese) and 320×600 (English). The two-line English Nokia caption fits above persistent player controls. The cold English Nokia chapter loaded and showed the expected frame and ready message. The in-app browser subsequently stalled its media inspection after seeking backward; Chrome independently completed all 42.6 seconds with `ended=true`, ready state 4 and no media error; its forward and backward chapter jumps also reached the requested offsets.
- `scripts/demo/evidence/seamless-story-v2/` contains capture hashes/crops, audio timing, final media hashes and verification receipts. Raw captures and speech artifacts stay in the private task artifact directory.
- All work is in an isolated frontend worktree based on `9a2a081`. No backend, model, DGX, research state, notifications, account preferences or algorithm changes. No shared dirty checkout edits. No production voice metadata appears in homepage copy.

## Release

Production receipts are appended after exact-commit CI and Pages verification.
