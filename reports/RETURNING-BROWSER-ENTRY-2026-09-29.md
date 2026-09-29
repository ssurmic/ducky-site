# Returning-browser entry — 2026-09-29

Status: implemented candidate; production release and live-account acceptance pending. Backend baseline: 25c2f3a7cd71209f940e738c8e62b29599d9be14. No backend API, session owner or entitlement change.

## Problem and behavior

The homepage never consulted existing session state. Returning desktop and phone users saw the marketing introduction and had to open the app manually, even though the app could restore their session.

The early locale script now routes only an unanchored homepage (`/`, `/en/`, `/zh/`, including index aliases) with a saved browser-session hint to the same-language `/app/#/today`. The existing app bootstrap renews and validates the actual session. The landing makes no auth request, loads no private content, copies no token into a URL and never treats the hint as authorization. Locale selection and app account-language rules remain in their existing owners.

Successful browser hydration records `ducky_entry=1`, a non-secret 30-day SameSite=Lax, root-scoped navigation cookie (Secure on HTTPS), so cookie-only returning sessions have a navigation hint. The credential itself remains in the existing storage/HttpOnly flows. Logout or a definitive no-session result clears the hint without clearing a newer account's state. Existing stored-token users work on the first visit; cookie-only users without a hint from a prior successful app hydration still need to enter the app once. Blocked cookies and storage may prevent remembering a visit, never grant access.

Explicit marketing anchors such as `#pricing`/`#top` and `?intro=1` stay on the introduction. Public detail pages, app deep links, OAuth/reset callbacks and arbitrary query targets are not rewritten. Anonymous and explicitly logged-out visitors stay on the public site.

The app also distinguishes a temporary refresh/profile outage from being signed out: it keeps the credential and requested protected route, shows the existing retry panel, and retries only when selected. Confirmed unauthorized sessions still reach sign-in. Existing refresh locking, account epochs, server validation and Telegram behavior remain.

## Validation

- 894 Node tests; 14 Python tests; bilingual build, copy lint and 2,109 links.
- Eight browser viewport combinations: 320×600 / 390×700, Chinese / English, light / dark. Saved/expired-token and cookie-only entry reached Today with no document overflow; content heights 494px / 594px.
- Desktop 1440×900: unavailable-session retry view, preserved Today route, and explicit logout left the marketing homepage visible. Synthetic authentication only; no production account writes.
- Unit/integration acceptance covers revoked sessions, unavailable storage, logout during renewal, cross-tab adoption, transient profile failures and retry, locale priority, explicit anchors, reset/OAuth and deep-link preservation.
- Initial full gate found an old login-return fixture returning HTTP200 without a token for an anonymous refresh. It now returns the actual HTTP401 anonymous contract; malformed success is correctly retryable rather than interpreted as logged out. Final full gate passed.
- Viewport simulation only; no physical-device or touch-emulation claim. The earlier static app-module loading stall is not reproduced or claimed fixed by the session-outage correction.

## Release boundary

Release only the reviewed main commit through `scripts/deploy_pages.sh`; verify its live VERSION/CSP and a real signed-in homepage entry. Rollback baseline: frontend 8c6c1448a7658c9d40b9fd54266f5400bfdc26de / Pages 201d2879. Shared private Handoff holds exact merged/deployed receipts. Intraday Today changes are the next separate slice, not implemented here.
