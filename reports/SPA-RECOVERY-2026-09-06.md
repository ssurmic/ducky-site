# SPA release recovery · 2026-09-06

The user screenshot references `/app-assets/77db404861dc58974d8a/views/profile.js`.
A production GET returned HTTP 404, while `/app/` and the mutable legacy profile path returned 200.
The missing content hash exactly reproduces from frontend commit `36d0147abcfe5a9df7a501b0bfb0bb337430fa20`.

## Cause and fix

Every clean Pages deployment replaced `dist`, removing the previous content-hashed module graph.
An already-open tab retained the previous router, then failed on its first visit to a lazy route.
The previous retry repeated the same failed module import and displayed a raw internal URL.

The build now reconstructs the complete graphs of up to 32 latest app-source commits from git,
plus the current graph. Every preserved URL has the original bytes, including its original shared
store and authentication dependencies. A fresh clean build restores the screenshot URL. CI checks
out full history. This works without retaining an old local `dist` or contacting production during build.
Source-only packages without git can still build but cannot restore historical graphs.

A no-store `/app-release.json` identifies the current and retained graphs. On route import failure,
the UI offers a localized refresh action and checks this manifest with a five-second timeout.
It refreshes only when the user clicks, preserving the exact URL/hash/query and existing stored
session. It never automatically interrupts an in-progress form or clears browser storage.
Unsaved in-memory forms are not promised to survive an explicit browser refresh; normal releases
avoid that refresh by retaining their original modules. A failed release lookup still leaves the
refresh action available. Navigation aborts obsolete recovery work.

## Verification

- Five Python module-graph tests pass, including a completely clean two-release deployment,
  exact old profile/store bytes, duplicate-graph deduplication and actual screenshot hash recovery.
- 88 frontend tests pass, including four new recovery cases: user-controlled refresh, unchanged
  route/session data, same-version/network-failure behavior, and aborted route races.
- Bilingual build, copy lint and internal link check pass.
- The built recovery release contains 33 complete graphs, bounded by 32 historical source revisions.
- No production deployment, real account changes, payments or notifications were performed by this subtask.

## Integration

Parent should cherry-pick this isolated commit and update backend SYSTEMDESIGN §5 / §14.8 with the
bounded complete-graph retention contract. Deploy from a full-history git checkout. Check the exact
screenshot URL returns 200, not just the new app entry; confirm `/app-release.json` is not cached.
Do not redirect old graph paths to current modules: that would reintroduce mixed auth/store instances.
The parent owns full product browser QA and production release; those are not claimed here.
