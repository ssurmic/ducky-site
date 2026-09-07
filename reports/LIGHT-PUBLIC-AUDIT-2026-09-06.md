# Public page light-theme audit — 2026-09-06

Independent audit requested by the owner after the stock lookup contrast report. Baseline: frontend `d0824785b2b34c920e06dd312310bb7c809ac7bc`. Audit checkout: `/tmp/ducky-public-theme-audit-20260906`; local HTTP server: `127.0.0.1:8926`. No deployment, account change, or outbound message was performed.

## Confirmed defects and verified corrections

| Rendered surface | Baseline foreground / effective background | Before | Corrected foreground | After |
|---|---|---:|---|---:|
| Homepage `.review-step` numbers 01–03 | `#ff9000` / `#ffffff` | 2.27:1 | `#b54700` | 5.43:1 |
| Desktop `.nav-links a.nav-strong` | `#ff9000` / `#fbfaf7` | 2.18:1 | `#b54700` | 5.20:1 |
| Research comparison `.research-records .records-table td.pos` outside the white position panel | `#1f883d` / `#fbfaf7` | 4.33:1 | `#187b35` | 5.13:1 |
| Ideas `.status-pill.status-opened` | `#1f883d` / `#f5f3ec` | 4.07:1 | `#187b35` | 4.82:1 |

All four use normal-sized text, requiring 4.5:1 in the contrast check. The green failures show why inspecting only white cards misses tinted and page backgrounds. Homepage glossary question markers also used the bright orange; the parent owns and independently verifies that shared correction and the glossary modal.

The parent supplied the corrected `public/css/site.css` from `/Users/zizhaozhang/dev/ducky-site-stock-light-2026-09-06`. It was copied into this checkout's generated `dist/css/site.css` for independent retesting. This agent did not edit or commit the source stylesheet. The light tokens and foreground selectors changed; dark tokens remained unchanged.

## Executed scenario matrix

Actual Chrome browser navigation and DOM inspection through CUA, followed by rendered style measurements:

| Pages | Languages | Viewports | Themes | Baseline and corrected runs |
|---|---|---|---|---|
| `/`, `/track-record/`, `/research-records/`, `/ideas/` | Chinese and `/en/` | 390 × 844, 320 × 844 CSS px | Explicit `data-theme=light` and `data-theme=dark` | 32 combinations each |
| Same four routes | English | 1440 × 900 CSS px | Light | Four corrected desktop samples |
| Homepage | Chinese | 390 × 844 CSS px | Automatic light; **no `data-theme`** on the tested document | Baseline and corrected samples |

Automatic light used a local iframe inheriting `color-scheme: light`. The child was explicitly inspected: `hasAttribute('data-theme') === false`, `matchMedia('(prefers-color-scheme: light)').matches === true`, body background `rgb(251, 250, 247)`, and corrected step foreground `rgb(181, 71, 0)`. The host's native media preference was dark, so explicit theme checks alone would not have proved automatic light behavior.

Corrected result: no failing visible DOM text colors in the 32 mobile combinations or four desktop samples, and `document.documentElement.scrollWidth === innerWidth` in all of them. This is a scoped contrast/layout check, not a claim of a complete accessibility certification. Pseudo-elements and canvas graphics require separate inspection; opacity, gradients, and unusual compositing can need visual judgment beyond the automated calculation.

## Interaction and visual checks

- Expanded the Chinese homepage plan comparison and first FAQ, and the English equivalents after correction. Text and disclosure state remained readable; the contrast scan passed the expanded English state.
- Used keyboard Tab navigation from the homepage sign-in link to the primary registration CTA. The corrected CTA displayed a visible `#b54700` 2 px focus outline with a 2 px offset.
- On English research records at 320 px, selected INTC and Completed. The UI reported `Showing 10 of 98 positions`; ten rows remained visible. Select foreground/background were `#141a21` / `#fbfaf7`.
- Scrolled the research comparison table horizontally at 320 px and inspected positive and negative returns. The table scrolls inside its container without widening the page. Positive/negative signs remain available in addition to colors.
- Inspected the homepage research chart at 320 px. Axis labels used `#4d5966` at 12 px; dates, legend values, and the three distinct line styles remained visible. Pressing ArrowLeft on `#os-date` changed 921 to 920, the date to 2026-09-03, and the displayed readings to the corresponding session. The slider had a visible theme-colored focus outline.
- Track-record initial filters, table, return colors, and explanatory text rendered clearly in both themes. Ideas loaded the committed static fallback and displayed its static-copy label; the opened-state pill reproduced the identified light failure before correction.

CUA screenshots were captured and visually inspected in this agent's tool observations: mobile Chinese homepage before/after, expanded Chinese FAQ, mobile ideas, narrow research comparison table after horizontal scrolling, the narrow chart and keyboard inspector, desktop English homepage, automatic-light child, and corrected English primary CTA focus. They are inline tool observations; this report does not claim saved screenshot files.

## Boundaries

This agent audited the four named public routes. Authenticated app routes, subscriptions, account actions, actual notification delivery, every possible API/error state, and individual idea-detail pages were not tested here. Other agents own stock-result and app-specific scenarios. These are Chrome responsive viewports, not physical iPhone/Safari verification. No actual financial or research values were changed for theme testing.

Source inspection found additional bright-orange rules such as `.cr-orig` and a fixed `.warn` color, but they were absent from the audited rendered public states. They are not reported as confirmed defects on these four pages.
