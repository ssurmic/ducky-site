# Briefing and price-detail copy — 2026-09-08

Actual recording inspection found implementation details in the briefing's default
paragraph and an unformatted fractional-second ISO timestamp in the information
map's price detail. The bilingual briefing now retains only the two daily update
times and source-date disclosure. The price detail reuses the source dialog's UTC
minute formatting, extracted to the shared UI helper. Original timestamp values,
price-session validity, saved-quote labels and the refresh schedule are unchanged.

The existing saved-quote test covers the actual six-digit fractional timestamp and
keeps quote validity distinct from display formatting. Thirty-three focused checks,
all 442 frontend tests, bilingual build, copy lint and 1,352 internal links pass.
Production commit `1df5c7b2fdf0d31d4aadef6eca99059244a5f1d9` passed
CI `34284083777` and was published as Pages deployment `c89d07d0`.
At 22:11 UTC, the public HTML's exact main/UI/context module URLs and versioned
stylesheet matched the validated build byte for byte. A fresh authenticated
document showed the shortened update copy in Chinese and English at 393 px.
The real AMKR saved quote displayed its observed time as `2026-09-08 20:40 UTC`
in both languages, preserving the separate quote date and missing provider-time
disclosure. The Chinese desktop dialog was also visually checked at 1728 px.
The temporary viewport override was reset after verification.

Local acceptance artifacts are under
`/tmp/ducky-evidence-validation-20260907/`: `frontend-1df5c7b2-static-receipt.json`,
`briefing-{zh-desktop,zh-393,en-393}-1df5c7b2.png`, and
`price-context-{zh-desktop,zh-393,en-393}-1df5c7b2.png`.
No account settings, watchlist membership or backend source records were changed.
