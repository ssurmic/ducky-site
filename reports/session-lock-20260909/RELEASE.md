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
