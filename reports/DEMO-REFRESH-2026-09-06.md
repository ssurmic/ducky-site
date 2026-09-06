# Short product demo refresh · 2026-09-06

## Released and verified

Final v5 is published at https://duckybot.app/#product-demo and https://duckybot.app/en/#product-demo. Frontend `db70290f0b943dc0cd2a548ad16f2f0e6a0af355`; Pages deployment https://356dd8c8.ducky-site.pages.dev. Duration: **Chinese 33.421 seconds, English 38.981 seconds**, compared with the old 74.221-second Chinese film. Both use the selected Serena female voice. No speed or pitch stretching. All ten source WAVs, independent ASR results, hashes and render metadata are frozen in `scripts/demo/evidence/voice-v5/`.

- Product dependencies accepted and integrated through `ba24ec7`: screening entry, compact chart, full-width creator card, holiday calendar, long-video review and dated topic inbox. Original dirty development worktrees were not reset or deployed.
- Twenty selected shots are drawn from real September 6 production captures or explicitly labeled local compositions. All 29 retained source/alternate captures have provenance and hashes in `scripts/demo/frames-v5/capture-provenance.json`.
- The film connects a stock to company evidence, creator sources and later prices, calendar/daily context, and notifications. The independent bilingual guide has seven entries and six exact chapter buttons; fictional simulation remains guide-only.
- Historical COE filing is explicitly separate from the combined screening preset. AVGO September 3→4 is a historical price study, not creator trading returns. The historical topic inbox is a semiconductor match, not a direct INTC mention. No native OS banner or automatic fresh-event delivery is claimed.
- Source audio selection is final. The unused `v5-dates` alternate service was stopped without changing the selected WAVs or narration. ASR is technical/content evidence, not subjective voice-quality certification.
- Full final H.264/AAC decode passed. Final AAC loudness: ZH -16.31 LUFS / -1.56 dBTP; EN -16.36 LUFS / -1.94 dBTP. Media verification: **935 checks, zero failures, 4 documented ASR review notes, 10/10 clips checked**.
- Real browser QA found a cold-load seeking race. The responsible task fixed it: user click enables media preloading, waits for the target seekable range and a real frame, and retries on progress. Default remains no preload/autoplay. Added three regression cases; the combined suite passed 195 tests before the final upstream icon merge.
- IAB browser at 390×844: both languages have no horizontal overflow; all six chapter buttons locate the correct frame while paused, including cold metadata. Native captions are visible above controls at 70%; creator captions use 5% to preserve the chart values. English opener now keeps “so you can keep up” together. The guide remains independently readable and direct links work without playing the movie.
- Full browser playback completed without error in both languages: Chinese 33.421 seconds and English 38.981 seconds. After the final upstream icon merge, 195/195 frontend tests, 20-page build and copy lint passed. The formal site serves all eight assets byte-for-byte identical to the final files, both MP4s support HTTP Range 206, and both homepage languages reference build db70290f with 7 guide entries and 6 chapters. Production IAB played both movies to their exact ends without error. Independent production Chrome verification passed cold seeks at 26.6/32.08 seconds while paused and opened the real inbox through its guide link. No notification was sent during this acceptance.
- Cleanup: removed only the disposable `ducky-tts/models/whisper-small-v4` directory after verifying all six files have independent consumer hardlinks. The consumer `ducky-asr/models/whisper-small/model.bin` remains 483,546,902 bytes; Qwen TTS model/runtime retained. All three task-owned preview servers (8778/8780/8781) are stopped. Heartbeat `demo` is PAUSED after final production playback. Original development worktrees and obsolete audition drafts remain untouched.

Owner task: 01a07862-6dac-7190-909b-40cfa2f21caa (优化官网 Demo 视频). Branch `codex/demo-female-voice`; owned worktree `/Users/zizhaozhang/dev/ducky-site-voice-2026-09-06`.

Earlier notes below are a chronological audit trail; this release state supersedes their pending/temporary statuses.

## Owner brief and editorial choice

Replace the 74.221-second Chinese homepage walkthrough with a shorter, professional but
conversational female voice. Wait for related agents to finish, rerun the actual demo,
and route discovered issues to their owners before publishing. Preserve the existing
Serena audition accepted in the preceding task. English should also be concise.

The inherited v4 quicklook is seven very short feature labels, roughly 25 seconds.
It is retained as an audition, not published. The v5 draft is five connected scenes,
152 Chinese characters / 87 English words, targeting 30–40 seconds with a 45-second
render cap. It explains continuous stock research, source checking and user-configured
delivery. The portfolio simulator remains in the independent guide, not the headline film.
Do not stretch audio, accelerate it artificially or claim instant ingestion/delivery.

Prospero comparison checked against https://www.prospero.ai/app on 2026-09-06:
learn concise screening and research guidance. Ducky's proposed emphasis is a stock's
source-linked events, attributed creator views, dated price follow-up and configurable
alerts. No claim that Ducky outperforms or has exclusive data. The prior comparison is
in ducky-bot/reports/prospero-2026-09-05/report-source.md.

## Dependencies (all local host)

- 01a07860-147b-7a02-b267-e3ded8e23ac5 — 优化市场日历展示: holiday visibility and plain-language historical context.
- 01a07531-84a6-7150-a8a2-7557bbfd9e48 — 优化雷达板块与筛选: now shared creator prefill and channel chart UI; prior radar work released.
- 01a074c0-296b-7440-a7a3-08d88cccc7ea — 升级博主与信号界面: shared transcript/cache/dedup, inbox/browser notification path.
- 01a0780c-014a-7081-988c-28781834e40c — 研究交易产品与UI改进: creator views/price chart/source workflow.

All were contacted to provide ready paths, commit/deployment status and supported examples.
Demo and guide ownership transferred from the creator task to this task; do not edit its
new creator-delivery worktree. This task owns the existing dirty worktree
/Users/zizhaozhang/dev/ducky-site-voice-2026-09-06, branch codex/demo-female-voice.
Original dev/ducky-bot and dev/ducky-site dirty worktrees remain untouched except an
append-only task tracking note. Reconcile current origin/main before final release.

## Capture / release gate

1. Confirm related tasks' deployable code and integration state, not just idle status.
2. Run production stock → source → creator timestamp/chart → holiday/calendar → alert/inbox paths.
   Show only supported states, with synthetic tests labeled as tests; source date != recorded date.
3. Re-capture after final commits. Use actual UI and inspect each screenshot/video segment.
   No fake winning creator records, quote freshness, silently empty data or notification receipt.
4. ASR-check all speech without feeding the intended transcript; inspect mismatches and timings.
   Source WAVs, hashes, captions and rendered media stay versioned; loudness and full decode checked.
5. The independent guide explains each dashboard and deep links. Seek offsets come from the
   rendered final timeline. Keep captions and synthetic-voice disclosure, no autoplay.
6. Run frontend test/build/copy/link gates; backend gate if integrating runtime changes.
   Verify both languages, captions, seek, narrow viewport, production range playback.
7. Update reports and product tracker, stop transient services, remove only task-owned
   disposable ASR weights, retain existing production TTS model/runtime. Then report live result.

## Running jobs / artifacts

- v4 repairs: DGX render-v4-repair (01-intro, 06-calendar), synthesis completed; independent ASR started
  as ducky-demo-v4-repair-asr-20260906.service. Old quicklook in /tmp/ducky-tts-v4/short-media is obsolete.
- v5 narration: scripts/demo/voiceover-2026-09-06-v5.json, copied to DGX
  ~/.local/share/ducky-tts/voiceover-v5.json; render-v5 via
  ducky-demo-v5-speech-20260906.service, log render-v5.log.
  CPU-only, 4 cores, 12GiB memory cap, no swap, 40-minute cap, low priority.
- Existing ASR model: ~/.local/share/ducky-tts/models/whisper-small-v4, 486MB, retained until final audio QA.
- Inherited guide behavior tests: /tmp/ducky-demo-guide-review/guide.test.mjs (10 tests),
  must convert temporary absolute imports/HTML files to checked-in portable fixtures.

No final capture, publication, real notification delivery or subjective listening approval
is claimed by this progress note.

Automatic continuation is active on the current task: automation ID `demo`, every15minutes, quiet on unchanged state. It must be paused after final delivery. Latest compact wait cursors: research a290b244-38e0-4cdb-8e1d-bbef585a9696:1; calendar 161f6dda-f742-4a1a-a89b-565f43a61435:2; radar4410aa75-24b2-49f4-a498-252895c9b27c:1; creator02763402-fffa-4064-a38f-42cef6a0141e:12.

Pre-record issue: production CBRS watch card showed price/indicators but no snapshot timestamp. Sent to research/UI task for investigation; unknown timestamp must stay unknown until sourced. Production Pro alert example filled its draft correctly; no alert enabled and no real notification sent. Private user watchlists must not appear in public capture.

The inherited v4 repair WAVs and ASR were copied to /tmp/ducky-tts-v4/repair-reviewed and merged without touching originals into /tmp/ducky-demo-final-2026-09-06/v4-audio. ASR01matches meaning;06recognizes 时间日历 vs 事件日历, so do not claim subjective pronunciation approval. The newv5 script replaces that wording anyway.

Production reminder draft acceptance: “英伟达 RSI 超跌的时候提醒我” resolved NVIDIA/NVDA, daily RSI14<30, disclosed the two defaults, and stated15-minute RTH checks/latest available snapshot. “确认并开启提醒” remained unclicked; account still0alerts. This is draft parsing/confirmation acceptance, not end-to-end delivery.

Preparation verification: inherited guide JS behavior10tests passed using the temporary fixture (not final chapter/timeline acceptance). Assembly/verification scripts compile; git diff --check passes. New --frames-dir assembler option permits dated v5captures without overwriting reviewedv3frames. No final footage exists yet.

## ASR ownership coordination update

Do NOT clean up DGX `~/.local/share/ducky-tts/models/whisper-small-v4` until task01a0780c-014a-7081-988c-28781834e40c explicitly confirms its independent ASR copy/hardlink and no dependency remains. The long-video task will reuse it for public audio without captions. Shared486MBweights/runtime were offered; both parties must confirm before deleting anything. This overrides the earlier cleanup suggestion. Model remains needed forv5voice QA as well.

V5 generation progress: all5ChineseWAVs completed (4.96,6.16,5.52,5.84,5.92seconds =28.40seconds narration; expected edited video ~31.4seconds without acceleration). English still running. Chinese WAVs snapshotted to DGXreview-v5-zh, independent ASR serviceducky-demo-v5-zh-asr-20260906 started with2CPU/2GiB/10minute caps. The final shared full speech-check.json must merge zhreview with laterENASR, not overwrite partial metadata while synthesis is active.

ASR consumer confirms proposed independent path `~/.local/share/ducky-asr/models/whisper-small` and faster-whisper1.2.1venv; hash/independent run confirmation still pending.

Independent ASR ofv5Chinese produced repeated potentially ambiguous terms even with the whole29.4scontext: 买入→满入, 摘要→占要, 休市→修饰, 设好→社号. This may partly be ASR quality but is not accepted as final pronunciation evidence. Prepared voiceover-2026-09-06-v5-clarity.json to audition the four affected Chinese scenes at a moderate pace with complete articulation. Do not launch a second12GiBTTS whilev5English is still running. Originalv5WAVs remain immutable; compare the new generation and independent ASR before selecting. Final runtime can be35–40s; clarity takes precedence over31s.

V5 full synthesis completed successfully: original10WAVs and generation log copied to /tmp/ducky-demo-final-2026-09-06/v5-original-audio. English narration35.92seconds, expected video38.92seconds. Current jobs: ducky-demo-v5-clarity-20260906 (fourChinese scenes, moderate pace, outputrender-v5-clarity;12GiB/4CPU/no swap/20minute cap) and ducky-demo-v5-en-asr-20260906 (outputreview-v5-en,2GiB/2CPU/10minute cap). Copy finalENspeech-check only after completion. Original/alternative audio must stay distinguishable. An earlier joinedASR attempt raced an scp copy and processed an incomplete local WAV; discardv5-joined result. Correct full-context check wasv5-joined-complete,29.4seconds; no business/product state affected.

Calendar owner reports localUI/tests ready,46cached bilingual interpretations and original320observations unchanged; publication/narrow-screen verification remains pending. Recording scene will use9/7LaborDayclosure and its expanded explanation. Latest calendar wait cursor161f6dda-f742-4a1a-a89b-565f43a61435:5.

English independent ASR passed all5segments: after stripping punctuation/spacing, every word matches the intended script. Localreviewpath /tmp/ducky-demo-final-2026-09-06/v5-en-review. Subjective female voice quality still not certified by ASR.

Integrated latest origin/main57ea497 into the owned demo worktree. It includes creator-page9f12dbc and calendar57ea497. The own draft was temporarily stashed; JSON end-of-file conflicts resolved key-by-key:36ownChinese keys/28English keys, zero overlapping semantic conflicts. New calendar/creator keys preserved; git diff --check passes. The named demo-only stash remains as backup until final release. Current template stillreferencesv4assets and placeholder offsets; must switch to finalv5assets/timeline before publish.

Calendar dependency is fully accepted: DGX1018passed/1skipped, selftest ALLGREEN; frontend131passed,5build-asset checks,718links. ProductionPro verified holiday/PPI source history with losses/missing prices,46explanations and unchanged320price rows. Latest calendar code57ea497 remains in newercreatorarchive commits544ebc8/1a437ec reported by its owner; fetch/integrate latest origin before final release, never deploy the older screenshot revision. Calendar owner is no longer a recording blocker.

ASR ownership confirmed by long-video task: independent `~/.local/share/ducky-asr/models/whisper-small` hardlink directory and isolatedvenv(faster-whisper1.2.1,yt-dlp2026.8.19) ready, modelSHA256prefix3e305921/suffix70d671 matched manifest. A34:35public audio file independently transcribed851segments through2073.26sof2075s at4CPUserial. It no longer depends on cleanup ofducky-tts; original temporary ASR can be cleaned only after our own final speech QA. This confirmation supersedes the pending external retention hold, not our local QA dependency.

Notification dependency update: frontendde80b40 introduces `#/updates` withINTC/semiconductor subscriptions, inbox, explicit browser opt-in and precise evidence links; backendpush migration/dedup implemented but worker/real-transcript wiring/deployment/acceptance still pending. Do not record as available yet. Owner's hiddenIABtab5 shares existingProsession and is NOT isolatedQA; do not touch or publish private content. Final independentguide should include updates/inbox and delivery distinction.

Creator page dependency accepted: frontend544ebc8 / Pagesd813b1d2 includescalendar57ea497. RealProChrome path `https://duckybot.app/app/#/creators?scope=discover&creator=touzi-talk`: concise reviewed summary, original timestamp links, fullhistorycollapsed with independent pagination; talk/Shanghaoautocomplete verified. Owner task01a07531finished thisUI/pagination work. CurrentNKEstance isneutral and cannot produce a portfolio-return curve. Do not fake directional performance; mainvideo can show source evidence and independent dated price research only if actual dates/data support it. Shanghao35minuteASR still awaitinglong-video verification/publication. Remaining demo blockers: long-video/source/price integration and inbox/notification acceptance.

Notification source candidate: 投资TALK君 videoB-gdlq-32Ec manualcaptions at173.195s explicitly say “周五半导体出现了反弹”. Two current videos do NOT mentionIntel/INTC; never edit them as a directINTCmention. Proposed exact workflow: separately configureINTC+semiconductor interest, then review realsemiconductortopicinbox item labeled相关板块, link to originaltimestamp. Full source review is stillnotready; notification task will provide an explicitlyhistoricaldemo item/precise deeplink after acceptance.

Notification demo method under implementation: explicitbrowseropt-in then per-inbox“测试本机提醒”, titleclearlyDemo, originalsourceclockunchanged, clickexactitem. It is a manualhistoricalchanneltest, notfreshautomaticdelivery or proof ofRSItrigger. Preserve that distinction in film/narration/guide. BackendAPIdeployed and1oldpushsubscriptionmigrated; frontendaccounts-switchguard/build/deploy andfullsourcereviewstillpending. SharedChrome/IABowneraccounts are notisolatedtestaccounts; onlycaptureinbox/publicsource, no privatewatchlist/profile.

Notification frontend396498d deployed(Pagesfde9ae74),170tests; publicroute `/app/#/updates?ticker=INTC`. Preserve notificationUI/rootSW when integratingorigin/main. Backendreader/previewf76fdbd beingdeployed,1299tests; fullsource/demo-inboxstillpending. Creator task ownsChrometab457904862; do not manipulate thattab. Frontendavailability alone isnotfullsource/deliveryacceptance.

V5clarity4segments completed; independentASR nowrecognizes买入/筛选/重要correctly, but摘要remainsambiguous. 休市→修饰 isexactMandarinhomophony, not evidenceofwrongpronunciation byitself. Preparedv5-phrases2segment audition with “查看博主解读，点开时间点听原话。再看价格图表，回看后来的涨跌。” and “开启提醒，条件满足时通知你。先免费加一只股票，开始体验。” Simpler wording addresses the ASRambiguities without speeding up. OriginalEnglish narrations remainsemanticallyappropriate and5/5verified. Finalmastertext/captions mustmatch selectedWAVs. Originalclarityaudio/ASR downloaded to /tmp/ducky-demo-final-2026-09-06/v5-clarity-audio.

Integratedorigin/main396498d, preservingallnotification/SW/sessionguards. Autostash967abb7 holdsdraftbackup; key-wiseresolutionagainzero semanticconflicts; allchangesnowunstaged anddiff--checkpasses. No publication.

Currentactiveaudiojob: ducky-demo-v5-phrases-20260906.service, outputDGXrender-v5-phrases, logrender-v5-phrases.log;2Chinesephrases only,4CPU/12GiB/no swap/15mincap. Oncecomplete, runindependentASR onthatdirectory thencompare. No otherTTSjobstillactive.

NotificationownerQA update: frontendbfad838 fixesunstabletopiccontrolorder/accessiblenames/duplicatetickerlabels; Pagespublication inprogress. Previous170tests plus19targetedtests/build/copy/718links green. OwnerexplicitlyconfiguredINTC+semiconductors topics withbrowser=true andbrowserauthorization; existingwatchlist/login/billing unchanged. OwnChrome457904862 remainsprivateQA,1549pxnooverflow; do notcontrolit. Source review/demo-inbox/nativepushstillpending. Publiccapturemustexcludeleftsidebarownerwatchlist. Ourvoiceworktree iscurrently396498d; integratebfad838orlatestbeforefinalrecord/release.

Finalspeechselection prepared: /tmp/ducky-demo-final-2026-09-06/v5-final-audio contains10WAVs plus mergedgeneration/speech-check metadata. ZH01frominitial;02/04fromclarity;03/05fromplainphrases, whoseASRfullymatchedapartfrom只/支. ENallinitial5fullymatched. Plannedpadding durationsZH33.4s / EN38.92s. Source manifests frozenunderevidence/voice-v5/source-manifests; selection/hashes/ASR/generationversionedthere. Masterv5Chinese text nowmatchesselectedWAVs. NoTTSjobsstillrunning andno moregenerationneededunlessfinalUIclaimchanges.

Independentguide revisedintosevenfunctionentries withrealappdeeplinks;topicinboxincludedandProboundaryexplicit. Simulatorisguide-only, no longerpretendsitappearsinshortfilm. Finalv5assetnamesselected, allchapteroffsetstemporarilynoneuntilreviewedrendertimeline. Bilingualbuildpassed20pages; generatorchangedpublic/calendar.jsononlybycurrentbuild, restoredthatunrelatedgeneratedfiletoHEADafterwards. Videoassetsnotyetpresent sofullmedia/linkgateawaitsrecording; do NOTpublishthisintermediatebuild.

Notificationlatestproduction635acb4 / Pages54beb6f7includesSWclickrefresh/claimexistingpages andlong-video4188287; preservebylatestoriginintegrationbeforefinalrelease. Fullsourceiscurrently1/3reviewed, remainsblocker.

Timingcorrection: exact25fpsquantizationinselection.json givesEN38.96seconds (the prior38.92figurewasanapproximationbeforeframe-rounding). Usefinalrenderreportforallcaption/seekmetadata. Inboxownerisfoldingtheprivatewatchlistpickerbelow savedtopics/browserstatus; waitforitsfinalhashbeforecapture.

Pre-capture production QA found a chart hierarchy defect: `/app/#/chart/ORCL`, native1549×902viewport, companybusinesscardspansy322–619 andKlinebeginsaty718, leavingonly184pxvisible. Priceas-oflineisbelowfold. Reported to research/UI task01a0780c for bounded layout fix: compactidentity/price/date, chartcontrols/chartfirst, businessdetailcollapsed/below; no algorithm or quote-fetch changes. No chartfiles edited bythis task. First screenshot was inspection only, not a retained finalframe.

Pre-record radar issue: explicit `#/boards?screen=insider-oversold` loads five long market-context blocks ahead of the requested combined-filter panel. Reported a bounded deeplink scroll/focus fix to task01a07531; keep default radar, algorithms and data unchanged. This is an actual user-navigation issue for the new guide entry, not merely a cinematic preference. ChartUI owner01a0780c accepted the ORCL hierarchy and CBRS timestamp checks after the final source segment.


Integrated latest frontend origin/main961c2f8, including screening focus3611ac7 and Social Media Tracking4f9b8cd. Own draft backup0206148c9fb74324b4beec9a9da4a768d91e4c41; localization restored key-by-key (39ZH/31EN, no semantic conflicts). No other changes lost. All selected10WAVs now retained under scripts/demo/evidence/voice-v5 with verified hashes. Portable guide media lifecycle tests added under tests/product-demo-guide.test.js:8passed after fixing a missingclass in the new fixture. Final rendered HTML/timestamps still require integration acceptance. Removed obsolete unused8-scene transcript keys and updated movie note to match planned historical examples, not fictionalportfolio footage.

Captured production at native1549x902: bilingual screening preset02-evidence.png, bilingual privacy-safe calendar04-context.png, and optional Chinese expandedholiday04-calendar-expanded.png. Provenance/hashes/crops in frames-v5/capture-provenance.json; only5partialframes, no finalfilm. Screening preview confirmed0combinedoversold+insider30daymatches,706missing/722covered; uncheckingoversold and selecting90days correctly yielded2insiderrecords. No filter or alert saved. COE archive opened for further evidence review; do not portray these as matches to the combinedpreset.

Browser recording temporarily paused to preserve notification owner's native Chrome focus for test. Our own recordingtabs457904870and457904876 are distinct; browser.tabs.get returns the reliable extension handle (reselecting via cua.getTab temporarily made Playwright textlocators stale after navigation). captureTab is457904870; radarCapture457904876. fsCapture imports node:fs/promises for screenshotartifactIO. Latest screenshot saved5files; Radar ENCOE archive first6/30record expanded, content not yet inspected. Sourceowner388db00 entering productionimport; wait for notification owner's ready item and testresult, then resume browsercapture.


Production readiness update: backend388db00 source TALK post166/revision240 recorded2026-09-06T21:52:23Z, realinboxitem1 available at https://duckybot.app/app/#/updates?item=1 ; owner-only historicalseed insertedonce,repeatfalse,automaticexternaldelivery0. Nativebrowser testprovider accepted andSWreceived, actualOSbanneracceptancependingbecausemacOSChrome notificationswereOff. Notificationowner temporarilyenabledandwillrestore; leaveitsnativeChrome focusuntilitfinishes. Scene3TALK pendingnexttradingsessionmustnotillustratecompletedlaterperformance; boundedvoice-datesrevisionlaunchedforhonestchartdatewording.

Integratedfrontendfff74a1 chartpriorityfix via exactdraftstash23afcaf73b9c4831b860c736737df95602f90c48, JSONkeymergezerooverlap,32edited/9obsoletekeysremovedperlanguage. SourceUIlatest e244107 / Pages96b9d7a1, lastsmallASRtimeformatfixpending; fetchlatestbeforefinalrelease. Guide tests8passed. CurrentfrontendHEADfff74a1. No publicationbythis taskyet.


Existing historicalexample eliminates the speechchange need: TALKpost127/revision227, AVGO, source https://www.youtube.com/watch?v=3E-HXC2HUvg&t=634 , published2026-09-03T03:29:14Z (NY9/2evening), whole source reviewed. App https://duckybot.app/app/#/creators?tab=research&scope=discover&ticker=AVGO&creator=touzi-talk ; select+1tradingday. Sourceowner verifiedavailable2026-09-03close→2026-09-04close,+0.2072%pricechange; this isprice research, notstrategyreturns. NewNKE remainspending9/8andwillonlyappearininbox/topicexample. Alternatev5-datesTTSstopped before selection; no ASR neededforunusedcandidate. Originalaudio/master/33.40s/38.96s remainfinal. SourceUIlatest8fc4a18 deploymentpending.
