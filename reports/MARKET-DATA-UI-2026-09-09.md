# Watchlist data state and optional provider quotes

YTD unavailable inputs are distinguished from small social samples: missing year-start
anchor, incomplete close, or adjusted prices awaiting update. The backend maintains
complete source vintages; the frontend never invents a missing return.

When the optional backend provider is enabled, a separate saved quote can replace the
list's close display only when its actual trade timestamp is no more than 180 seconds old.
Its provider and feed are retained; visible text says Latest quote with New York time.
Missing prior close is not borrowed from another feed. Old/failed quotes fall back to the
existing dated close. Heatmaps retain their completed-session basis. Existing read refresh
updates the list without replacing research, filters, focus or open disclosures.

Backend adapters are default-off pending provider-account display authorization. This UI
does not claim the deployment supplies a real-time consolidated market feed.

Validation: full frontend suite 589 passed; final focused suite 19 passed after accessibility
and clock-label refinements. Copy lint and 1,296 links passed. Browser fixture checks at
1440px desktop, 390x650 Chinese dark and 320x650 English light retain 16px metric values,
readable reason text and the quote clock. Fixtures clearly state that prices are synthetic.
These are viewport simulations, not physical-device or production quote observations.
Backend findings and actual Yahoo/Finnhub measurements are in the backend repository's
reports/MARKET-DATA-REPAIR-2026-09-09.md.

Released `0c88e18e602d1eddcae958247583ee377178de21` after successful check run
34435428072, as Pages `7595bac6`. The GitHub deployment workflow encountered the
known absent production secret; the existing local Wrangler login published the build.
No credentials were copied or newly granted. Production Chinese and English App return
200 and graph `4dbbceb2d09d69422a81`; both changed modules match the build byte-for-byte.

After backend `67043925` deployed, the shared 59-stock set has 59 current accepted
closes and 57 YTD returns; CBRS/HONA lack the previous year-end anchor. The user's
existing authenticated Chrome page shows 43 watches, the six screenshot stocks now
have YTD, including negative values, and CBRS explicitly says 缺少年初基准价. AVGO's
genuine Degen sample shortage remains visible. The user tab was refreshed to the new
frontend. Optional quotes remain disabled pending provider display authorization;
this release does not claim live full-market quotes or a measured end-to-end latency SLA.
