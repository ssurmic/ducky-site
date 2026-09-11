# Saved YTD after a missing close update · 2026-09-10

Status: local implementation; release/browser acceptance pending.

YTD now renders the backend's explicitly retained same-session calculation with
Last saved calculation / 上次计算 and its original session. Expand metric details
for the original saved time and a concise explanation. Retained YTD remains sortable
along with zero and losses; unrelated stale/unknown metrics remain last. There is
no new request, inference, store or synthetic price. Research validity is unchanged.

Backend contract and read-only real-data audit:
https://github.com/ssurmic/ducky-bot/blob/codex/creator-history-scope-20260910/reports/YTD-EMPTY-CLOSE-2026-09-10.md

Local tests: 663 passed, including independent English/Chinese module renders,
original clocks and retained sorting. Exact merged checks, Pages release and browser
acceptance will be recorded after observation. This change does not establish
complete provider coverage or all-summary semantic quality.
