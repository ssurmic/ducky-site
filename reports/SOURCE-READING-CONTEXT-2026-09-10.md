# Read a map source without losing the stock · 2026-09-10

Status: deployed; exact-main CI, public assets and bilingual production reading checks passed.

The live UBER stock map opened a single creator card by navigating to the full
creator workspace. The destination preserved its point ID but omitted the stock
filter. This broke the action plan's in-place source-reading path and introduced
another page read just to check a saved point.

In the focused product UI, all map cards now open the existing source dialog.
The current stock route, expanded map, scroll and keyboard focus remain intact.
The original-source action comes first, beside the source identity, and uses an
existing validated YouTube passage time when available. The optional creator
context link carries the validated ticker, creator, post and exact point; author
history remains separately available on the map heading. Legacy-layout routing
is preserved behind its existing product switch.

An exactly identical title/reason is displayed once. Distinct reasons, source
conditions, horizons, event/publication/collection dates and every source remain.
Sharing moves after the evidence. No source text, classification, API, backend
queue, model call or generation policy changes. Opening the dialog reads the
already-rendered source; source withdrawal still uses the existing dialog sync.

## Verification

Targeted source/map/share tests: 36 passed; final full suite: 668 passed.
Copy lint and 1,878 links passed. Regression covers unchanged route,
zero fetch on source opening, original segment, complete qualifications, stock-
scoped creator deep links, sign-in preservation, parameter allowlisting and Escape
focus restoration. Existing source/withdrawal/share tests remain in the full suite.

The local preview is explicitly synthetic, with 320/393px phone and 1100px desktop
frames, 650px high. Both languages and themes are checked; this is not a physical
phone test. Source buttons retain 44px targets. Long English titles require an
internal scroll for full metadata, but the original-source action is placed before
that metadata. The fixture stays on `#/stock/NVDA` and records only the initial
bars and stock-research GETs after opening/closing the dialog.
Final 320×650 English measurement: dialog width 296px, readable body height
412.0px, original-source action y=399.0–443.0px. Chinese 393×650: body 487.6px,
original-source action y=272.4–316.4px. The full claim heading is the first readable
content; longer metadata remains inside the scrollable dialog.

## Separate content blockers observed, not changed here

A 02:56 UTC read-only audit of runtime a6553595 found QCOM waiting after a draft-
stage local model timeout; UBER was failed with six retained attempts. UBER's last
review object rejects the Chinese Form 4 wording; its broader meaning still needs
review, not an automatic approval override. The live creator page also shows a
verbatim `if if` condition and a figurative UBER paraphrase; the source context must
be reviewed before changing either. No retries, budgets, cooldowns or source
approvals were reset. This UI fix does not certify those summaries as recovered.

## Release and production acceptance

PR [35](https://github.com/ssurmic/ducky-site/pull/35), implementation `2babac54`,
merged main `0a754d8fb6ea8a34d71d86867682a8480eeb86f4`.
PR CI `34557203335` and exact-main CI `34557326944` passed.
Pages `ef8e64f3`, graph `c9905f1e1dec77d9441f`: the public release manifest,
evidence module and creator-route module byte-match the built release.
[Asset receipt](source-reading-context-20260910/pages-verification.json).
Rollback target: previous Pages `2811c752` / main `0cd9fa23`.

Actual EN and ZH UBER checks after publication stayed on `#/stock/UBER` when the
Meet Kevin card was opened. Original source links use video `xRKScH37m9A` at
445 seconds; the dialog preserves publication/collection/retrieval dates and the
7:25–7:34 passage. The secondary creator link retains UBER, creator, post and exact
point. Escape closes both language dialogs and restores the clicked card's focus.
The stock page displayed the 2026-09-10 close and 17 records, while explicitly
showing the unavailable analysis. No follow/unfollow or source content was changed.

The already-open English tab initially still ran the prior loaded JavaScript;
changing only its hash did not load the new release. Reloading the document loaded
the verified release and the new behavior. This check does not claim that existing
tabs hot-swap their running code without a reload.

## Operational boundary

At 20:14 PDT, a read-only DGX check confirmed independent systemd scheduling.
The market quote and watchlist price jobs had successfully exited; video ASR/model
queue units were starting, while backup had completed at 19:34. These observations
are job status, not proof that every source or summary is delivered. Production
scheduling does not require a continuously running development agent. The local
synthetic preview is stopped at closeout; production timers are left unchanged.
