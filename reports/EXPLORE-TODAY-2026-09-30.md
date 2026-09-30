# Explore and Today review · 2026-09-30

Status: implementation and local acceptance complete; merge, production upload and live acceptance pending.

Base: frontend `e3ff2d0406ef450e1060c211a26f285715b751db`. Paired backend K producer candidate `533d8ccaaa1fa32f495b82f7fe6277de97b2c4ae`.

## Findings and changes

The production Explore page rendered Stock research while a static CSS class highlighted Company activity. Research linked to the already-current route. The creator link navigated during a real browser check; no pointer-blocking overlay was demonstrated. Corrected the actual mismatch rather than claiming a click blocker: plain Explore now renders source categories and company records, research has an explicit query, and all three views retain the shared destination navigation. Exactly one `aria-current` controls selection. Browser history and existing scoped filing links remain native.

Moved labelled Company activity/Insider trades/Fund holdings links above stock tabs; renamed Overview & plan to Research overview. First-use research links explicitly enter research. Orange structured ticker leaves distinguish company identity from white/dark reading text and semantic gains/losses. One font remains across all elements.

Today shows liquidity, Treasury yield, VIX, CNN Fear & Greed, K and VIX/VIX3M. K uses the source-owned saved ratio; the frontend validates its component bindings and never calculates a substitute. Formula and component clocks remain in source details. Dates remain beside readings; full basis labels and times remain accessible in details and date labels. Missing and different-session data remain explicit. Exactly-one term ratios say equal. Two columns of compact update cards use desktop space; expanded records retain complete text.

## Verification

- UI/UX Pro Max navigation active-state and sticky/focus guidance applied to the existing design system.
- 998 Node tests passed, including K source binding, zero/missing/date mismatch, snapshot refresh and exact-one term-ratio cases.
- 16 pointer-driven Explore → research → stock → funds → creators → research/activity loops across 320/390/820/1440 widths, ZH/EN and light/dark: passed. Includes zero-watch/no-follow discovery and K visibility. At 320×600 the K value is visible before scrolling; complete details and some dates require scrolling. At 390×700 the compact readings fit above bottom navigation.
- 444 first-use/stock/map/chart/calendar/creator/profile checks across 12 combinations: passed. Synthetic membership writes stay in memory.
- 20 professional UI combinations, 320–1920px: sticky category/watchlist switching, focus clearance, paired semantic contrast, common font and numeric comparison checks passed.
- 384 route/layout combinations: initial sweep was interrupted for 41 cases by a concurrent local rebuild removing dist files. A stable 192-case 820/1440px rerun passed all affected cases; 192 phone cases passed the initial sweep. No persistent route error or page overflow.
- Build, copy lint and 2,196 local links passed before commit. Publisher reruns the complete frontend gate.

All phone checks are browser viewport/touch emulation, not physical-device tests. Local fixtures are visibly synthetic and never production data. No third-party scripts, font changes, new paid calls or user membership changes on production.

## Release and rollback

Pending PR/main and canonical Pages receipt. Revert this frontend commit to restore the earlier presentation. Older backend snapshots safely show K unavailable. Backend release retains its normal signed gate; no manual restart, migration, paid work or producer activation belongs to this slice.
