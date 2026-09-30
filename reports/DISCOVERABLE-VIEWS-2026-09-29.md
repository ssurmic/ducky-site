# Discoverable research views and company activity · September 29, 2026

Status: implemented locally; not merged or deployed. Synthetic records validate layout and navigation, not current production content.

## Problem and resulting behavior

The owner could not easily find Watchlist’s four views or Company activity in Explore. A follow-up explicitly requested four prominent source categories instead of leading with All categories.

- Watchlist uses a full-width four-choice row on both desktop and phones. Desktop choices include purpose text; compact phone choices use their titles only. List remains the default, Overview second; search is a separate row. The capacity notice follows the controls. Full metrics limitations remain beside Metrics.
- Explore leads with Companies & capital, followed by Stock research and Creators. On phones all three entrances share one compact row. Existing ranking, source records and creator discovery remain.
- Company activity exposes Insiders, Funds, Political and Company at the top: four columns on both desktop and phone. A plain visit defaults to Insiders; explicit category and pre-existing scoped links retain their meaning. All activity stays a separate secondary control beside the time/archive choices.
- The inherited desktop rule that hid the entire category sidebar is overridden only for Company activity. Category help remains available below the records. Reports keep their previous navigation.

## Design decisions

Retain the existing Manrope/system CJK fonts, duck mark and palette: ink `#0b1017`, surface `#121a24`, raised surface `#1a2431`, text `#e6edf3`, orange `#ff9000`, light canvas `#f4f6f9`. Existing theme tokens provide light-theme text and accessible accent ink. Desktop entry titles are 15–18px, with 12–13px descriptions. Phone entry titles are 12px, page headings 18px and record text 12–13px; editable inputs stay 16px. Active controls use a line, surface and text change together. Keyboard focus remains explicit.

The visual emphasis belongs to choosing a research task. Reuse the existing data tables rather than introducing decorative dashboard cards or fabricated summary counts. Purpose text names actual functions; it does not call activity a capital-flow measure or treat attention as sentiment.

Desktop: title → four view/source choices → search/filter → dated records.
Phone: compact title → one row of choices → search/filter → dated records. All choices remain visible without horizontal scrolling.

The owner rejected the first two-by-two phone iteration because oversized entries reduced information density. The final phone treatment removes repeated purpose copy, uses short category labels with full accessible names, tightens gaps and keeps the whole record linked to its complete source. Company names and distinct transaction/publication dates remain visible; record preview text can occupy up to two lines. The explicit disclosure-value basis remains.

## Validation and iteration

Existing full suite: 975 Node tests passed; Python 19 cases, one expected skip; bilingual build, copy lint and 2,145 internal links passed. Focused navigation/read tests passed (34). The updated tests cover plain-entry source selection, separate All activity, keyboard focus, explicit old scopes and current authenticated records.

Browser acceptance: `tests/browser/discoverable-views.mjs`, served by the loopback-only `serve-product-focus.py`. It uses synthetic in-memory fixtures and no production account/API. Matrix: 320×600, 390×700, 820×900 and 1440×900; Chinese/English and light/dark; all three changed routes. Phone contexts enable touch emulation. The checks cover full visibility of entries, 44px targets, 12px phone / 15px desktop entry titles, one-row phone navigation, minimum phone reading space, overflow, all watch modes without extra reads, filters, focus and category routes.

The first matrix exposed the inherited hidden desktop sidebar and insufficient English first-screen content at 320px; both were repaired. The first test script also matched a help disclosure as well as its category button; selectors were narrowed to buttons. An initial copy-lint run raced the build’s output replacement; checks were rerun after the build finished. The committed full run also caught one capacity-copy assertion still expecting the previous wording; the assertion was updated to the same explicit 50-stock limit. These were not passing acceptance runs.

Final compact matrix: **48/48 passed**, no page overflow or browser errors. At 320×600, the first useful row starts at 396–400px on Watchlist (147px minimum reading space above bottom navigation), 274–279px on Explore (268px), and 332–350px on Company activity (197px). At 390×700 the respective minimum reading heights are 247px, 373px and 315px. Company activity therefore gains 134px of reading space versus the rejected 181px phone iteration, about 74%. The synthetic eight-record fixture shows one full activity record and most of a second at 390px. A 320×600 screen shows one record; this is not a claim that two complete records fit every phone. All primary entries share one phone row and retain at least 44px targets. Four Watchlist view changes reuse the already-read data and retain the stock filter.

Local screenshots and machine-readable measurements: `/tmp/ducky-discoverable-compact-final/`. The preview is served at `http://127.0.0.1:8953/qa-frame?lang=zh&theme=dark&route=boards&case=ux-review&density=1`. No physical-device, screen-reader or production deployment claim is made.

## Release and rollback

Base: frontend `2ab0892a` on `origin/main`. No API, source ownership, authentication, trading rule, notification or inference changes. Candidate is for review only. Rollback is a source revert and normal frontend publication; no data migration is needed. Shared architecture/status/continuation records live in the private backend repository.
