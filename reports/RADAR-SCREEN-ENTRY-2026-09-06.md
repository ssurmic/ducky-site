# Radar screening entry · 2026-09-06

Explicit `screen` / `screening` links used to open the filter below the market overview. As the overview loaded, its height pushed the requested destination farther down the page. The preset was populated but users first saw an unrelated section.

For these links only, the open screening panel now precedes the market overview. Its native disclosure title receives focus and an immediate scroll after attachment. Later data never triggers another focus/scroll. Normal radar navigation retains the market-first order and a collapsed screening panel. Presets, conditions, preview/save behavior, and data algorithms are unchanged.

Published frontend `3611ac7`, Cloudflare Pages `ab748de4`. All 184 frontend tests passed, along with the build, copy checks and 718 links. Tests cover both named presets, generic `screening=1`, default layout, late market responses, and navigating away while data is pending.

Production native-browser acceptance: at 390×844, the insider preset opens at the top of the scrollable area with its title focused, oversold/insider checked and 30 days retained. Document width and scroll width are both 390px. Tab advances to the first preset button. Ordinary Radar navigation returns to scroll position zero with market-first order and the screening disclosure closed. At the default desktop viewport, the institution preset is focused and retains oversold, stake, 13F and OR. No browser errors were recorded. No screening preview, save, alert subscription or notification was submitted during acceptance; temporary viewport override was reset.
