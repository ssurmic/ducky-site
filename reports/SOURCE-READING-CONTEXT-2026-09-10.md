# Read a map source without losing the stock · 2026-09-10

Status: implemented; final CI and production acceptance pending.

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

Release and actual bilingual production checks will be appended after observation.
