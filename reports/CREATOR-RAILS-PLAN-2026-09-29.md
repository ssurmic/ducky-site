# Creator reading and signed changes — design plan

Audience: a reader comparing what financial creators said, on a short phone screen or a large display. The first task is to scan several attributed views, then open a complete source; following an author is optional.

Palette: retain navy #0b0f14, surface #121821, text #e6edf3, metadata #9aa7b4, action orange #ff9000 and owner-requested ticker lime #b7ff3c. Existing theme-aware green/red distinguish positive/negative numerical changes and separately labelled source stances. Zero and missing remain neutral. A rising attention count never becomes bullish sentiment.

Type: existing self-hosted/system sans, 13–14px readable preview text, 11–12px dates; system monospace only for ticker identities. Controls remain 44px. No new font or image dependency.

Layout: each followed author owns a compact horizontal shelf. Each page shows four previews: four columns on desktop, two columns by two rows on phones. Author, date range and previous/next controls sit above the shelf. Preview cards contain symbol/stance, a clearly bounded excerpt, date, and a full-view action; conditions, horizon and repeated records are signposted before opening the full source. At most three overview pages precede the author's full archive. Discovery shows compact author previews from its existing one-view-per-author response, with no N+1 history requests.

```
Author · latest date                     ‹ 1 / 3 ›
[ ticker · stance ][ ticker · stance ]
[ preview + date  ][ preview + date  ]
[ ticker · stance ][ ticker · stance ]
[ preview + date  ][ preview + date  ]
```

Review against the brief: a one-card carousel would preserve the original low density. A four-column phone strip would make text too narrow. Four previews per page give comparison without reducing the reading text to tiny labels. Full conditions stay in the source modal, with explicit qualification cues in the preview. No autoplay, no independent source-count inflation, no reordering of opposed claims. Stable source IDs preserve position through refresh and route return.

Research: [Apple News guide](https://support.apple.com/en-euro/guide/iphone/iph0a16d1e29/ios) describes source/topic-based discovery; [Robinhood news](https://robinhood.com/us/en/newsroom/bringing-you-better-news/) describes stock/watchlist-relevant news; [NN/g mobile carousel research](https://www.nngroup.com/articles/mobile-carousels/) supports explicit controls, swipe affordance and a short sequence with alternate access. These inform this design; they are not claims that those apps use this exact layout.

Acceptance plan: 320×600/390×700, EN/ZH and light/dark, desktop 1440; count visible previews, check horizontal navigation, source condition/repeat preservation, focus, stable position on refreshed/withdrawn content, and signed changes including zero/missing. Tests use isolated synthetic accounts; live checks are read-only.
