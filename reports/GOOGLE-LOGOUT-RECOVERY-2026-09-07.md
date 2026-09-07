# Google login recovery after logout

The owner reported that a Pro user lost the Google sign-in entry after logging out.
The old login and registration views initially hid Google, queried `/auth/providers`
once, and ignored every failure. A network failure, rejected request or invalid
response therefore left Google absent with no way to retry in that view.

This is a reproducible failure mode, not proof of the affected user's exact network
error. The normal production Chrome flow succeeded before this patch: signed-in Pro
→ logout → Google account chooser → existing account → signed-in Pro. Backend review
found that provider availability reads configuration only; logout revokes the session
without removing Google identity or membership. A command-line request was blocked by
Cloudflare, which is not evidence that this user's browser received the same response.

## Change

Both pages now share a provider-loading component. It displays loading, available or
retry states. Only a valid explicit `google:false` hides the entry. Discovery remains
anonymous and has a five-second deadline covering both headers and body parsing.
Retries use fresh abort controllers, rapid clicks do not duplicate requests, and
navigation/disposal ignores late results. No identity, permission or billing changes.

## Verification

- The pre-fix regression reproduced the disappearing entry after a simulated Google
  Pro login, logout and failed provider request. Seven new regressions cover that
  round trip, recovery, registration, malformed responses, explicit disabled state,
  403/503, stalled headers/body, cancellation and late results.
- Independent review caught a body-read timeout gap in the initial fix. A bounded
  whole-operation deadline and a stalled-body/late-response regression resolve it.
- Final complete frontend suite: 316 tests passed. Build: 20 bilingual pages.
  Copy lint and 1,306 links passed; build-graph checks: 5 run, 1 environment skip.
- Local Chrome used the built app with a fixture API alternating 503 and success.
  English login/registration and Chinese registration visibly recovered on retry.
  Chinese 390px dark layout was inspected; the temporary viewport was reset.
  No signup form, password or notification was submitted by the fixture.

## Published entry recovery

Release `77263ce` / Pages `036cbc08` is deployed. Production Chrome loaded module
graph `4149c80c1dac3302350d`; logout displayed the Google entry, its link opened the
real account chooser, and selecting the existing account returned to a Pro watchlist.
GitHub CI for `77263ce` succeeded. No customer account was impersonated and no
membership was changed by this test.

## Multiple open tabs

A further isolated memory test reproduced a related session bug: tab A's request
returns 401 after another tab has completed Google sign-in and saved token B. The
old 401 hook called explicit logout, re-read B from shared storage, revoked B and
deleted it. Production customer sessions were not used to reproduce this race.

Automatic 401 handling now receives the failed request's token/epoch, clears only
that tab's state, and removes shared storage only while it still contains that
token. It never posts logout. The bootstrap catch and binary-response path follow
the same rule. A deliberate logout still revokes the tab's own session. Six new
regressions cover separate-tab replacement, same-tab replacement, stale boot,
JSON/binary responses, ordinary expiry and explicit logout.

Combined final gate: **322 frontend tests passed**, 20-page build, copy lint and
1,306 links passed. Backend code is unchanged; its required documentation gate
also passed: 1,978 tests, five warnings, selftest ALL GREEN, arch lint 0/0.
