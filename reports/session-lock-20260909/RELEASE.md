# Bounded session restoration — 2026-09-09

Reported during the open-access walkthrough: a newly opened creators page remained blank for over two minutes. Its loaded auth module waited for `ducky-session-refresh` without a lock acquisition deadline. The router did not render until auth finished. The stuck production tab belongs to the creator QA task; its exact lock holder was not inspected, so this is a confirmed reproducible failure mode, not a claim to have identified that particular holder.

Changes:

- Cancel a queued Web Lock request after five seconds. Do not steal locks or start concurrent cookie rotation. Once acquired, retain the lock until the API request finishes under its existing request timeout.
- Prefer a completed same-account renewal; retain all account/epoch guards. Otherwise use an existing access token if the API still accepts it.
- When restoration cannot complete because of lock contention, preserve credentials and the original destination. Show a localized retry action. Cookie-only restoration receives the same recovery UI.
- Render a shared loading component in both static app shells and during auth bootstrap, so initialization is visible. A terminal boot error has an actionable error component rather than an empty view.
- Keep the green bold coffee navigation style, open access, both community links, creator UI, and all other current main changes intact. No backend, billing, data or browser credential mutation is part of this patch.

Validation:

- Original auth code fails the new held-lock regression; corrected code passes.
- Eight new regressions cover timeout/cancel, retry success, same-account token adoption, logout while queued, usable-token fallback, expired-token preservation, cookie-only recovery, lock ownership during a slow request, and actual entry-point retry rendering (some tests cover multiple cases).
- Full suite: 526 passed. Build-asset tests: four passed and one environment-dependent skip. Export tests: three passed. Copy lint and 1,290 internal links passed.
- Local Chrome fixture holds a real Web Lock in a separate page. Actual app code receives only local mock auth responses; no production session is cleared. Narrow-screen checks are iframe viewport simulations, not physical phone or touch-device checks.

The five-second limit applies to active-page lock acquisition, not to all page loading or a suspended browser's wall clock. A still-suspended lock holder can require a later retry; the fix does not claim to release another tab's lock.

API semantics: [LockManager.request and AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request).

## Published and verified, 07:22 UTC

- Runtime commit: `88e0d28d6c5aeb9745052cb16fc05329224f2b30` (main and `codex/session-lock-recovery-20260909`). Built after committing, retaining all current main assets.
- Exact-commit GitHub check: [34323295623](https://github.com/ssurmic/ducky-site/actions/runs/34323295623), successful.
- Pages receipt: [9ee5d03f](https://9ee5d03f.ducky-site.pages.dev). Production serves version `88e0d28d`, module graph `88df48669e5aa32fccbf`, with the static loading component.
- Real Chrome local fixture: EN 320×670 light/dark and ZH 390×670 dark show a complete retry card above the navigation, without clipped text. Desktop user retry after releasing the local lock reaches the expected sign-in screen (fixture returns 401). The unit entry-point test separately verifies successful authenticated restoration and destination preservation.
- Two independent new production tabs rendered EN creators and ZH watchlist, with the same existing `ssurmic zen` profile and real page content. The creator QA task independently reports the originally stuck tab recovered profile/avatar/logout and the creators heading after a full refresh. No credentials were cleared, accounts switched, or old tabs closed. These latest live checks use the browser's current account, not the earlier Free test account.
- Production coffee navigation retains the visible left navigation's font family and 14px size, with weight 700 and dark green text `rgb(181, 237, 121)`.

The authoring worktree's later documentation commit is not a new web release. Future frontend work should start from the current main runtime; no backend deployment belongs to this change.
