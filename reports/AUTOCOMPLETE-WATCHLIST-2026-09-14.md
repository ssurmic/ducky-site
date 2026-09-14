# Direct watchlist search actions · 2026-09-14

Status: implemented in a fresh worktree, not merged or deployed. Frontend base
`36b68db3898f46ce458a1ffbe9241dbccf824a8e`; paired backend candidate
`246742567249a6221ca49797d6c6073cb66821b8`.

## Interaction

The main watchlist search and separate add form expose one Add button per eligible suggestion;
the basic watchlist manager uses the same component. Selecting a result remains separate from
writing a membership. Stock/ETF/ETN/fund and special-issue labels, explicit leverage/inverse tags
and numerical multipliers come from saved API metadata, alongside company and business context.
Blocked leveraged rows retain readable labels and a reason with no add button. Unknown server
classification is never replaced with a guessed stock type; older responses missing eligibility
cannot activate the new add controls.

Adds reuse the existing API and account/capacity protections. Duplicate clicks do not create
parallel writes. Success clears the query and shows the entire updated list; filter actions focus
the new row and add-form actions return to the cleared input. Failure retains the search and
reports the server result. Existing memberships show Added, and a full watchlist shows its limit.
The selected-result offer and raw form use the same known eligibility. The server independently
revalidates new memberships, including when the saved classification changed after search.

An action-enabled combobox uses a grid with separate selection and add controls. Arrow keys
choose rows; Tab enters the action; Left/Right move across controls; Escape closes and returns
focus. IME composition, stale responses, detached controls and disposal remain guarded.
Chart, Explore and other selection-only pickers retain their selection behavior with type labels.

## Verification

Automated gate: 766 JavaScript tests passed; 22 Python tests ran (21 passed, one existing skip).
Bilingual build, copy lint and 2,127 internal links passed. The first full JavaScript run had
764 passes and one existing time-dependent Today fixture failure: before 01:00, its one-hour-old
publication belongs to yesterday. The ordering-only test now fixes Date to local noon; production
Today filtering is unchanged. The final complete run passes all 766 tests, including the new
popup-height regression.

Browser cases use
synthetic stocks and in-memory writes, not real accounts or live watchlists. Viewport/touch
emulation and Chromium/WebKit engines are separate from physical-phone testing.

During browser testing, a two-line status overlapped the inherited popup position. The popup
is now anchored to the input. A second failure occurred after a scrolled search: focus-driven
row scrolling moved the button between pointerdown and click. Focus highlighting now preserves
pointer geometry and new results reset popup scroll position. These failed attempts were retained
alongside the successful reruns. Long company names and metadata remain readable; add targets
stay at least 44px. Late desktop typography/button overrides and a short basic-manager
popup overlapping the footer/navigation were also found and corrected: sizing overrides are
scoped to the picker, open popups receive a local stacking context, and popup height follows
the visible app pane and visual viewport. Relevant regressions and browser reruns cover both.

Final browser build: app module graph `572505aa739d63679bcf`. All 12 Chromium combinations
passed at 320×650, 393×650 and 1440×900, in English/Chinese and light/dark. WebKit 393×650
English/dark also passed. Four keyboard/form/navigation cases and three basic-manager cases
passed. All tested picker inputs are 16px and Add buttons at least 44px high; no document
horizontal overflow, browser errors or external fixture traffic were observed.

At 393px, the three META-related suggestions (stock, ordinary ETF and blocked 2x ETF) fit in
about 295px; the app leaves 522px after header/navigation. The short 320px basic-manager
popup ends at y=575, within the app pane ending at y=583. Initial watchlists show three
synthetic rows. Nine route shells were checked in the keyboard/navigation sweep, including
Watchlist, Today, Chart, Calendar, Explore, Alerts, Creators, Profile and the Billing redirect.
Search selection and direct Add were tested separately; Chart/Explore still select without
posting a watch. Form success restores input focus; filter success restores the new row.
No physical phone or production account is claimed by these checks.

## Release

Deploy the paired backend first so symbol responses carry authoritative eligibility. Frontend
rollback reference is the base revision above. No schema migration or historical deletion is
required. Production release and real-account verification remain pending owner authorization.
