# UI walkthrough — 2026-09-07

Owner request: improve the whole application using Balder as a visual reference; fix the oversized market topics, calendar scroll jump, stretched password button, and verbose creator pages. Creator posts must be ordered by publication time.

Implemented in this branch:

- A persistent desktop sidebar and direct mobile calendar entry. Keyboard navigation follows the visual order and includes a working skip link.
- Shared compact buttons and inputs, bottom-aligned form actions, two-column desktop profile fields, clearer surfaces, and restrained borders. The password action measures 40px high on desktop; touch controls retain a 44px minimum.
- Five compact market-topic entries open the original full summary and source evidence in a dialog. Stale/unavailable/partial states remain visible. Radar secondary filters and question shortcuts are disclosed on demand, active deep-link filters remain expanded, and unavailable coverage no longer renders a bare browser-default “Details”.
- Calendar day selections preserve the grid, open a scrollable dialog, and show every selected event. Escape, backdrop and close actions restore focus and scroll. Monthly and two-week modes use the same detail renderer; list mode retains all events. Holidays and unknown times keep explicit text.
- Creator posts sort by publication time descending, with undated posts last; retrieval timestamps never substitute for publication time. One sentence previews the summary. Complete attributed text, calls, source corrections and source details remain available. Creator directories, overviews, and stock-specific search are progressively disclosed; selected creators keep a searchable feed and history pagination.

No research algorithm, API entitlement, source fact or historical outcome was changed. UI fixtures run outside the repository, block writes and external requests, and never impersonate real evidence.

Validation in progress: 216 frontend tests passed, including new modal focus/scroll, compact topic disclosure and chronological search checks. Four build-asset tests passed; one old deployment fixture is unavailable and skipped. Copy and link checks passed. Backend selftest ALL GREEN; architecture lint 0 failures / 0 warnings. Browser checks include the real pre-change Pro app and local 320px, 390px and desktop UI, Chinese and English, dark and light. Production acceptance will be appended after release.
