# Retain the stock when returning from a linked source

Status: deployed; exact-main CI, public assets and bilingual live reading checks passed.

Opening the UBER map through a specific source link opened the correct source,
but its creator link omitted `ticker=UBER`. The reader consequently lost the
stock filter when returning to that creator. Ordinary card clicks already retained
this context. The direct-link branch now passes the validated map ticker to the
same source dialog. Creator, post and point identities remain intact.

This is a navigation correction. It does not change source facts, shared caches,
acquisition, model admission or background scheduling.

## Acceptance

- Reproduced the missing ticker before the fix with an integration test.
- Both map layouts and five source identifiers (node, evidence ID, point ID,
  retained claim ID and source-record ID) retain the stock, creator, post and
  current point. The login return sanitizer preserves the allowed link fields.
- 40 related tests passed, then all 669 frontend tests passed (670 after integrating
  the independently released search-positioning changes). Copy lint and
  1,878 internal links passed.
- Local synthetic browser checks covered English and Chinese, light and dark,
  at 320×650, 393×650 and 1100×650. All 12 layouts opened the source dialog,
  retained `ticker=NVDA` and the source post, and had no horizontal document
  overflow or fixture errors. Each made one evidence GET and no write requests.
  Source dates, conditions and video passage remained visible. Escape closed
  the phone dialog. These are browser viewport checks, not physical-device tests.
- Production trigger: `#/evidence/UBER?source=claim%3Ab8ab754ebd0da20525222f40`.
  The live round trip was verified separately after publication.

## Publication

[PR 37](https://github.com/ssurmic/ducky-site/pull/37) is merged as
`35a5713cbdc5daf6c1e4b7102f96a3d2afca4cf7`. The integrated 670-test suite passed,
as did [exact-main CI](https://github.com/ssurmic/ducky-site/actions/runs/34561712251).
Pages `23cf155b` serves graph `94129f285ad7e4ec9430`. At 04:21 UTC on September 11
(September 10 locally), the public release manifest, map module and creator-route
module matched the verified local build byte for byte. An initial public request
during deployment propagation returned 404; the subsequent complete check passed.
[Asset receipt](map-source-return-20260910/pages-verification.json).

The signed-in English and Chinese UBER source dialogs retained `ticker=UBER`,
`creator=meet-kevin`, post `xRKScH37m9A` and point
`claim:b8ab754ebd0da20525222f40`. Following the link opened that exact post and
point under the UBER filter. September 8 publication dates and the 7:20–7:49 source
passage remained unchanged. No subscriptions, source records or model tasks were
changed by this acceptance check. Rollback: pre-fix main `6880672` / Pages `63125cd9`.

## Operational boundary

The owner asked why the coding task kept running. The active product-improvement
goal is separate from DGX's systemd schedules and event queues. A read-only check
at approximately 21:09 PDT confirmed independent quote, creator discovery,
transcription and projection timers. Routine queue draining is not a reason to
keep an interactive development task polling or replaying model jobs. Finish a
bounded fix, record the acceptance result and let the normal workers continue.

Readers should receive shared accepted content immediately when available and
retain its original date during refresh. A new subscription does not imply that
the same stock analysis should be generated again for each user.
