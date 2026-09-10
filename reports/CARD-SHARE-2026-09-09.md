# Information-map card sharing

The owner requested a small summary card they could send to a friend who has no account.
Every graph card now has a separate Share action. It opens a PNG preview; supported browsers
offer native file sharing, and all clients with canvas support can save the image. The recipient
reads an image without opening a Ducky login page. No public web-link service is added.

The export preserves the selected title/reason, creator attribution, conditions and horizon,
historical/stale labels, source publication dates, observation timestamp, and dated fact windows.
It does not shorten away qualifications. A source QR points to the original public source,
including an existing video timestamp. Only selected presentation fields enter the image;
account IDs, tokens, watchlists, full maps and internal hashes are excluded. Existing API
authorization is unchanged. No model/market request, write or automatic delivery occurs.

The graph uses an article with two sibling buttons, retaining separate keyboard navigation
and share actions. Native cancellation stays quiet and restores the button. File-sharing feature
detection failures retain download. Closing the preview restores focus to the triggering control.

Validation:

- 587 frontend tests passed, including five new export/privacy/qualification/navigation checks.
- Build: 20 bilingual pages; copy lint: 3065 files; internal links: 1296, all passed.
- Backend clean origin/web gate: 4643 passed, 6 optional skipped; selftest ALL GREEN;
  architecture lint: zero failures/warnings. No backend code change.
- Isolated Chrome viewport checks: EN/light 390×650, ZH/dark 320×650, EN/dark 320×650,
  ZH/light 390×650, EN/light desktop 1360×900. No horizontal overflow; dialogs stay in the
  viewport, downloads produce the actual PNG (122703 bytes in the English historical fixture),
  and Escape restores focus. Native file payload/cancellation was tested with a stub; no
  real contact was messaged. Physical-device share-sheet verification remains unclaimed.
- Browser measurements and historical teaching-example exports are in `card-share-20260909/`.
  These are existing public NOK examples, not a current recommendation or a private report.

Release status: local verification complete; production verification will be appended after release.
