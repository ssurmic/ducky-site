# Regression baseline · G01 · 2026-09-09

Frozen source revisions/dirty original directories: `baseline-revisions.json`.
Frontend production build before new code: `/tmp/ducky-brief-baseline-20260909` (local artifact).

- Existing `npm test`: **549 passed / 0 failed / 0 skipped**, exit 0, 16.1 s test time.
  Build uses the installed Jinja2 Python venv and existing jsdom node_modules symlink;
  no dependencies changed or installed. Full output: `baseline-site-tests.log`.
- Backend `bin/selftest.py`: exit 0; full results in `baseline-backend-tests.log`.
  Scratch DB tests, no `.env`, no launcher, no worker/network flags, no notifications.
- Browser baseline uses the existing `reports/mobile-ui-20260908/serve.py` and fixtures,
  bound to 127.0.0.1:8911; all business fetches stubbed. Synthetic local account only.
  `baseline-watchlist-en390.png`: existing 390×650 English watchlist, 61px header,
  520px available main area, no horizontal overflow, no console errors; one GET `/watchlist`.
  The wrapper's inherited-theme caption is unreliable in this browser; actual rendered
  baseline is dark. New theme checks will use explicit `data-theme` and record actual colors.

Existing test coverage includes login/logout/return target/session recovery, watchlist,
creator source/offset/conditions/corrections/history, evidence graph, chart/history,
alerts, calendar, radar, briefings, open access and isolation. These are controlled tests,
not proof of production logins, physical mobile devices or real notification delivery.
The affected preview will receive its own browser interaction matrix and route smoke.

No core baseline failure was found. One existing Python asset test may report an optional
old release-fixture skip; its actual result will be preserved in final verification.
