# Two-week calendar readability · 2026-09-06

Owner supplied an iPhone screenshot where the two-week calendar was compressed into seven
columns, with 11–12px dates/counts and a 9px closure label. The mobile rule hid event names;
weekend opacity further reduced contrast. Simplification must preserve readable content.

At widths up to 560px, the two weeks now sit side by side, each with seven day cards and its
own date-range heading. Dates are 22px; weekdays, event previews and closure labels are 14px.
Each card previews two events and reports additional events; selecting it preserves the full
existing detail. Navigation targets are at least 44px. Weekend content retains full opacity;
closure, today, selection and watched earnings retain their distinct treatments. On desktop,
two horizontal weeks remain, with 20px dates. Mobile detail notes are also increased to 14px.

Validation: 184 frontend tests passed, including preservation of all eight events behind a
two-preview day, two seven-day groups, forward/backward 14-day navigation, and closure labels
surviving filters without triggering private research. Browser QA used actual built components
and a public production calendar snapshot, with synthetic Pro/watchlist state for local layout
checks: 390px Chinese dark, 320px English light, 1280px desktop. Narrowest cards measured 124px
wide and approximately 99px tall, dates 22px and event text 14px, with no horizontal overflow
or horizontally clipped date/weekday/holiday text. Holiday selection opens its full impact
section. No strategy, data producer, model call or API entitlement was changed.

Local QA fixtures were removed from the build before release checks. Production acceptance
and the deployment receipt are appended below after deployment.
