# Ducky website — shared engineering entry

Read the private backend's [current technical design](https://github.com/ssurmic/ducky-bot/blob/web/design-current-status.md)
and [continuation / review protocol](https://github.com/ssurmic/ducky-bot/blob/web/continuation.md), then follow [CLAUDE.md](CLAUDE.md)
for frontend-specific implementation and acceptance rules.

Backend `web` is the shared current engineering entry. Backend `SYSTEMDESIGN.md`
§0 and §3.1 retain invariant/ownership authority. Record both repository revisions for API/UI changes.
Do not maintain another current architecture or copy private system details into this public repo.

For each technical change, update the affected shared status/continuation sections and this repo's
change log and acceptance report. Separate proposed, implemented, deployed and end-to-end accepted.
If private repository access is unavailable, state that limitation rather than inventing its current
state. A review request does not resume paused processing or authorize paid model calls.

## UX redesign continuation (2026-09-28)

Before continuing this redesign, read [the change and integration register](docs/ux/change-register.md)
and its latest acceptance record. Record new changes there and keep prototype, API compatibility,
production wiring and deployment status distinct. The preview lives under `prototypes/ux-lab/`; production integration is recorded in
[the production acceptance report](reports/UX-PRODUCTION-2026-09-28.md) and the
[workflow follow-up release record](reports/UX-WORKFLOW-REVIEW-2026-09-28.md#production-release-receipt). Keep synthetic preview
features distinct from the production routes and actual release receipt.
