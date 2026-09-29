# Current-session Today overview — 2026-09-29

Status: implemented and locally verified; exact production release and live data acceptance pending. Previous frontend release: 9693cdb5 / Pages 8c3d5948. Shared backend current design and English Handoff remain authoritative.

## Behavior

Today puts the saved current-session market overview first: four index ETFs with their actual trade times and changes versus the previous close, followed by a short factual summary. Sector/asset quotes and provider details expand in place. Closing notes remain dated, expandable archives, including same-day editions. No private account writes, model requests or source acquisition occur on page reads.

The overview and macro cards use the same typed snapshot's canonical metrics and Fear & Greed source. Missing fields never fall back to conflicting old values. Historical comparison charts retain their actual ending date and are explicitly labelled historical. Current snapshot expiry is evaluated even if a refresh fails; earlier replica sequences and legacy responses cannot replace an already accepted current snapshot. Revoked access clears both DOM and the retained document.

## QA

909 Node tests passed. Python discovery: 18 passed, 1 skipped. Bilingual build, copy lint and 2,109 links passed. Independent review identified and helped close permission-revocation reappearance and legacy-response downgrade regressions; focused tests cover both alongside expiry/503, null/zero, dated close retention and quote clocks.

Eight synthetic phone-frame combinations cover 320×600 and 390×700, Chinese/English, light/dark. Available content heights: 494/594px. All four main indexes and the short summary fit before bottom navigation; summary bottom at 403–457px in 320px layouts and approximately384px in 390px layouts. No document overflow. Desktop1440×900 inspected visually. Quote disclosure retained its expanded state after manual refresh; no paid/provider/production connection. These are viewport simulations, not physical-device tests.

The existing whole-cache replication cycle is about120s after each pass; the visible page revalidates at least every60s. A minute producer is not a one-minute website SLA. Preserve actual source/publication clocks and measure live replication separately. Native creator worker remains paused; this change neither retries its failed videos nor certifies native source-to-web success.

## Event preview visibility follow-up (candidate)

The current overview previously put the entire closing note, including its upcoming-event preview, inside a closed archive. The bounded follow-up moves the existing preview outside that archive only when the note belongs to the current New York calendar date and the existing preview validator accepts its source-session binding. It does not clone events or disclosure keys, fetch another calendar, or attach a current schedule to an older note. Original closing paragraphs and unique tomorrow prose remain archived unchanged. Older previews keep their original context; if no valid same-day preview is available, Today offers a Calendar link with the current New York date rather than claiming there are no events.

Quote expiry and event meaning remain separate. An expired quote snapshot does not invalidate a same-day saved event schedule or change its source clock. After the New York date changes, that preview returns to its original archive. The post-session overview also shows a short visible note: trade snapshots are not final daily bars, and historical charts use separate daily records. This explains legitimate differences without forcing their numerical values to agree.

The synthetic current-session fixture now reproduces the complete deterministic summary shape: covered-sector comparison, yield, VIX and funding score, with each metric's original date. Its funding score remains dated September 25 while its quote readings use the fixture's actual New York date. The earlier eight-layout measurements above used a shorter synthetic summary; they do not establish the phone height of this fuller paragraph. Updated phone/desktop visual acceptance remains a separate integration check.

Candidate validation: 50 focused Today tests and the complete 917-test Node suite passed, including current/old/invalid previews, unchanged prose, exactly one event list with unique keys, quote expiry versus date rollover, Calendar destinations, refresh disclosure/focus restoration, full synthetic prose and post-only explanatory copy. The bilingual build, copy lint (4,288 files) and link check (2,109 links) passed. These checks ran against the local follow-up based on `fcd151f7cabe000591800084e74f4da6b4d772d7`; the existing generated calendar was restored. No new backend request, account write, model call, commit or deployment is part of this local follow-up.

Final phone verification after the complete-summary fixture, true 15:59 ET session-trade rows and narrow-grid adjustment: eight exact 320×600 / 390×700 frames, both languages and themes, showed all four indexes and the complete summary above the fixed navigation, with no horizontal overflow. At 320px the summary ended at y=490 (ZH) / 520 (EN), navigation started at y=547. At 390px the summary ended at y=471, navigation at y=647. These are synthetic browser frames, not physical device tests.
