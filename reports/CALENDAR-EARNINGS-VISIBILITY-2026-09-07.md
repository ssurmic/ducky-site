# Calendar earnings visibility — 2026-09-07

The production 9/10 cell had three records: PPI, jobless claims and ORCL earnings.
The first two occupied the only preview slots; ORCL was represented by “另 1 项” and a star.
A fresh signed-in Chrome check confirmed the ORCL record and after-market-close note in the day
dialog. This was a presentation failure, not missing earnings acquisition. Prior layout acceptance
missed that the company's name was absent from the actual visible cell.

Oracle's [September 2 IR announcement](https://investor.oracle.com/investor-news/news-details/2026/Oracle-Sets-the-Date-for-its-First-Quarter-Fiscal-Year-2027-Earnings-Announcement/default.aspx)
confirms FY2027 Q1 results after market close on September 10. The 4 p.m. Central webcast time
is separate from the release time. No event record or price was changed by this fix.

## Change

Compact preview selection is separate from full-day order. Session changes, the source-linked
company and every watched earnings event stay visible. Ordinary days show up to three event
previews; mandatory events can grow beyond that count. Remaining events still open in the day
dialog. Earnings category and ticker share a compact line. Month previews use the same policy,
and phone month cells retain watched ticker labels when normal previews are hidden. Accessible
names include the same selected events; category filters still apply. No network or model work added.

## Acceptance

- 309 frontend tests pass. Added ORCL + two macro releases and four watched earnings overflow
  regressions; all event identities, dates, details, closure states and explicit filters preserved.
- Build: 20 pages. Copy lint: 2066 files. Link check: 1306 links. Asset tests: 4 passed / 1 existing skip.
- Local synthetic browser fixtures, 320/390 × 650, Chinese/English and light/dark. Actual main
  content height 520px; Chinese first day at y328.8 and six complete date cells visible. No horizontal
  overflow. Normal three-event day 117.4px high; date 18px and event ticker 12px. A four-company
  English earnings day grows to 163px and names ORCL/ADBE/NVDA/AVGO, with two macros in details.
- 390px phone day dialog is 366px wide at x12/y12, height626; close target44×44, no horizontal
  overflow, all three full events including the fixture's after-close note. Closing restores focus
  to the selected day and the visible cell shows ORCL, jobless claims and PPI.
- Phone month: all four watched symbols visible, 12px labels, no overflow; no reliance on a star
  or event count. Browser fixtures are not physical Safari/iOS checks or live market records.

Deployment and final desktop / production checks appended after publication.
