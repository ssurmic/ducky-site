# Homepage and bilingual demo v10

Release status: local media and homepage verified. Publication is held for the owner’s new prerequisite: Telegram login → verified email onboarding → real Telegram and email signal delivery. Extend the relevant scene only after that workflow passes end-to-end acceptance.

## Product result

- The original local checkpoint used two opposing glass duck quote lanes and a NOK replay hero. After the homepage owner published the new research-oriented hero, this branch retains that hero and reduces the additional quote strip to one lane below it. Its stylesheet no longer changes `.home-hero`. Either motion button pauses both the hero and quote strip; reduced-motion preference disables both. The same canonical duck asset remains in use. Mobile keeps a horizontal, keyboard-accessible recorded-case carousel.
- AMKR, SGI and HUBS are explicitly selected positive recorded examples. The displayed figures are subsequent stock-price changes, not account returns or aggregate performance. Original observation times, assigned price sessions, every available close and pullbacks remain accessible. The complete ledger remains linked.
- Public prices are dated cached snapshots from the existing shared API. A six-symbol refresh never invokes a producer, uses one bounded request per symbol per minute only while visible, and keeps the dated fallback if unavailable. No live-quote promise. Pausing, keyboard focus, reduced motion, hidden tabs and offscreen state stop movement as applicable.
- Removed automatic glossary annotations from the new hero, numerical case cards and video area; in particular, a “5%” substring must not become a question-mark button inside +8.5%.
- The short tour follows a watchlist through Pelosi filings, insider purchases, Nokia/Corning terms, a complete price path, macro context, a creator quote, actual Reddit observations and a clearly labeled historical inbox illustration. X remains not connected.

## Media

Chinese 38.44 s; English 36.68 s (MP4 container duration includes approximately 21 ms AAC padding). Nine scenes; 88 changing shots plus 18 base captures, all 1440×810 source frames normalized to 1920×1080 at 25 fps. Original audio speed and pitch retained. Final CTA has 2.8 s and complete speech plus silence; no clipped ending.

English uses Ava; Chinese uses Xiaoxiao. These production details are kept in this report and source manifests, not homepage marketing copy. Both scripts use short independently authored phrases. Native subtitles are provider-word-timed, with semantic line breaks and a maximum of two English lines. Two-line mobile captions moved to 72% of the portrait player so paused native controls remain clear; desktop remains 84%.

Independent Whisper ASR supplied no script prompt. All nine English utterances match their intended text. Chinese review notes are traditional/simplified spelling (博主觀點/免費開始) or identical-sounding characters (设/射, 进/禁 and 件/箭); punctuation and intended meaning were checked against the generated words and authored script. ASR and waveform checks do not certify subjective voice naturalness; no human listening review is claimed.

## Evidence and limits

- Existing historical case validator: 540 dated path observations passed.
- Reddit validator: 127 checks, all ten MU observations retained, including declining counts. Latest selected observation: September 7 06:01 UTC, 30 rolling 24-hour mentions, provider prior count 23, attention 45.5/100 (normal). It is not validated as a price prediction or alert-delivery record.
- Media validator: 1,641 checks, zero failures; all 18 WAV/ASR segments, eight public media assets, exact authored captions, scene durations and frame hashes checked. Four Chinese ASR spelling review notes are documented above.
- Historical NOK rule and other public cases remain explicitly replays, not retrospectively invented receipts. The real BE September 4 source event, September 7 first observation and September 21 premarket effective date remain separate. Production radar → two-week calendar with BE first among 42 events was independently checked; the real watchlist-event inbox remains empty after historical import.
- Selected AMKR/SGI/HUBS 5- and available 20-session outcomes match both saved returns and independently recomputed current daily closes. Missing original computation inputs are not recreated. SGI’s separate 1-session discrepancy is not displayed as verified. Public per-horizon reconciliation flags are being integrated by the history owner; original values remain preserved.

## Validation

- Homepage: Chinese/English, 320/390/1440 widths, light/dark visual checks; no horizontal document overflow. Opposing lanes run, pause stops both lanes and decorative ducks; duplicate decorative links are not focusable. Three quote-module tests cover invalid/cross-ticker/older data, failed refresh, request deduplication and BFCache cleanup.
- Eighteen final scene DOM boundary checks passed. Both nine-frame contact sheets visually inspected. No private account or complete personal watchlist was exported: opening uses four selected public snapshots through the real overview renderer.
- English nine chapter seeks passed against the actual local Range server and left playback paused, with the English native track selected. Final Chinese and post-deploy checks will be recorded below.
- Full frontend baseline after final feature integration: 235 tests passed; final merged gate pending.

Artifacts: `scripts/demo/voiceover-2026-09-07-v10.json`, `scripts/demo/evidence/voice-v10/`, and immutable `public/media/ducky-walkthrough-2026-09-07-vibe-v10.*`. Source WAVs and 106 captures remain in the task-owned `/tmp/ducky-demo-v10` production directory; synthesis and capture hashes are versioned.

The final narrative is now drafted in `reports/DEMO-V11-NARRATIVE-2026-09-07.md`: information overload around a few watched stocks, attributed examples, then relevant updates and selected delivery channels. Existing v10 audio remains immutable and is not the final publication.
