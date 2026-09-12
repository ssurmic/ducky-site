# Ducky website — shared engineering entry

Read the private backend's [current technical design](https://github.com/ssurmic/ducky-bot/blob/codex/design-current-status-20260912/design-current-status.md)
and [continuation / review protocol](https://github.com/ssurmic/ducky-bot/blob/codex/design-current-status-20260912/continuation.md), then follow [CLAUDE.md](CLAUDE.md)
for frontend-specific implementation and acceptance rules.

These links initially use the documentation publication branch; after its documentation-only PR
merges, the same paths on backend `web` are the normal shared entry. Backend `SYSTEMDESIGN.md`
§0 and §3.1 retain invariant/ownership authority. Record both repository revisions for API/UI changes.
Do not maintain another current architecture or copy private system details into this public repo.

For each technical change, update the affected shared status/continuation sections and this repo's
change log and acceptance report. Separate proposed, implemented, deployed and end-to-end accepted.
If private repository access is unavailable, state that limitation rather than inventing its current
state. A review request does not resume paused processing or authorize paid model calls.
