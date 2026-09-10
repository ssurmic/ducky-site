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
reports/MARKET-DATA-REPAIR-2026-09-09.md. Production acceptance is recorded after release.
