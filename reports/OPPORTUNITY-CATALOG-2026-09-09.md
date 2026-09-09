# Opportunity catalog UI · 2026-09-09

Source-labelled candidates remain visible when certified daily discovery is warming or stale. The API keeps snapshot near-expiry IV/HV20 separate from certified IV30/HV20; the card and strict filter now name that distinction. Price has its own accepted daily-close date. Snapshot cards show the available readings and concise reasons first; financial/peer gaps and candidate history are expandable. History requests are authenticated, lazy, single-flight and bound to the initiating account; a late response cannot populate a new session.

No candidate ticker is hardcoded. Local QA copied only shared source/price rows into an isolated database and produced54 candidate observations from102 snapshots, including CRDO/ALAB/NFLX/GFS/ON. The sample contains ETF/small-cap instruments and is not full-market coverage or current investment advice. Full brief/cause-of-decline evidence remains distinct from the short screening explanation.

Validation before integration:499 frontend tests passed; build, copy lint2873files and1266links passed. Actual in-app-browser component checks:1280px Chinese dark,390px Chinese light,320px English dark, all without horizontal overflow; source sample and disclosure layout inspected. The QA harness does not count as production authentication/API verification. Backend schema and release boundaries are documented in the paired backend report `reports/OPPORTUNITY-PIPELINE-DESIGN-2026-09-09.md`.

Final integration/deployment evidence is appended after release. No generated calendar data, local QA data or credentials are part of this change.
