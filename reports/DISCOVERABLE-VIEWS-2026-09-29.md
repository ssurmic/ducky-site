# Discoverable research views and company activity · September 29, 2026

Status: implemented locally; not merged or deployed. Synthetic records validate layout and navigation, not current production content.

## Problem and resulting behavior

The owner could not easily find Watchlist’s four views or Company activity in Explore. A follow-up explicitly requested four prominent source categories instead of leading with All categories.

- Watchlist uses a full-width four-choice row on desktop and a two-by-two grid on phones. Every choice has a readable title and purpose. List remains the default, Overview second; search is a separate row. The capacity notice follows the controls. Full metrics limitations remain beside Metrics.
- Explore leads with Companies & capital, followed by Stock research and Creators. On phones the company entrance spans the width, with the other two below. Existing ranking, source records and creator discovery remain.
- Company activity exposes Insiders, Funds, Political and Company at the top: four desktop columns, two phone columns. A plain visit defaults to Insiders; explicit category and pre-existing scoped links retain their meaning. All activity stays a separate secondary control beside the time/archive choices.
- The inherited desktop rule that hid the entire category sidebar is overridden only for Company activity. Category help remains available below the records. Reports keep their previous navigation.

## Design decisions

Retain the existing Manrope/system CJK fonts, duck mark and palette: ink `#0b1017`, surface `#121a24`, raised surface `#1a2431`, text `#e6edf3`, orange `#ff9000`, light canvas `#f4f6f9`. Existing theme tokens provide light-theme text and accessible accent ink. Titles are 15–18px; descriptions 12–13px. Active controls use a line, surface and text change together. Keyboard focus remains explicit.

The visual emphasis belongs to choosing a research task. Reuse the existing data tables rather than introducing decorative dashboard cards or fabricated summary counts. Purpose text names actual functions; it does not call activity a capital-flow measure or treat attention as sentiment.

Desktop: title → four view/source choices → search/filter → dated records.
Phone: title → two-by-two choices → search/filter → dated records.

## Validation and iteration

Existing full suite: 975 Node tests passed; Python 19 cases, one expected skip; bilingual build, copy lint and 2,145 internal links passed. Focused navigation/read tests passed (34). The updated tests cover plain-entry source selection, separate All activity, keyboard focus, explicit old scopes and current authenticated records.

Browser acceptance: `tests/browser/discoverable-views.mjs`, served by the loopback-only `serve-product-focus.py`. It uses synthetic in-memory fixtures and no production account/API. Matrix: 320×600, 390×700, 820×900 and 1440×900; Chinese/English and light/dark; all three changed routes. Phone contexts enable touch emulation. The checks cover full visibility of entries, 44px targets, 15px minimum entry titles, first-screen readable content, overflow, all watch modes without extra reads, filters, focus and category routes.

The first matrix exposed the inherited hidden desktop sidebar and insufficient English first-screen content at 320px; both were repaired. The first test script also matched a help disclosure as well as its category button; selectors were narrowed to buttons. An initial copy-lint run raced the build’s output replacement; checks were rerun after the build finished. The committed full run also caught one capacity-copy assertion still expecting the previous wording; the assertion was updated to the same explicit 50-stock limit. These were not passing acceptance runs.

Final matrix: **48/48 passed**, no page overflow or browser errors. At 320×600, the first useful row starts at 476–480px on Watchlist (67px remaining above bottom navigation), 390–408px on Explore (139px minimum), and 466–484px on Company activity (63px minimum). At 390×700 the respective minimum available reading heights are 167px, 248px and 181px. All primary entries are visible and retain at least 44px targets. Four view changes reuse the already-read data and retain the stock filter.

Local screenshots and machine-readable measurements: `/tmp/ducky-discoverable-views-final/`. The preview is served at `http://127.0.0.1:8953/qa-frame?lang=zh&theme=dark&route=boards&case=ux-review`. No physical-device, screen-reader or production deployment claim is made.

## Release and rollback

Base: frontend `2ab0892a` on `origin/main`. No API, source ownership, authentication, trading rule, notification or inference changes. Candidate is for review only. Rollback is a source revert and normal frontend publication; no data migration is needed. Shared architecture/status/continuation records live in the private backend repository.
