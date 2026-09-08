# Stock map navigation and creator studies — 2026-09-08

The watchlist now offers a separate map link for every row, including the 50th stock;
opening stock details also exposes an 80px map entry even while a quote is unavailable.
The information map keeps the selected stock visible and opens an all-stock dialog with
50 links, rather than depending on a clipped horizontal strip or typing a ticker.

Browser acceptance used explicit synthetic 50-stock fixtures, without changing an account:
320/393×650 Chinese dark/light watchlists show three complete stock rows and direct map
links. The 50th stock opens its own map; the dialog switches directly to NKE and closes.
393×650 English light map has no horizontal overflow, a 44px switch button, and two
readable first-screen cards. At 320px the title wraps, the switch remains 44px, the
50-stock dialog scrolls in a 234px grid, and the input remains 16px. Desktop 1440×900
shows all 50 direct links and a 460×82px detail entry with no horizontal overflow;
map shortcuts are limited to seven plus an explicit all-50 control.

Creator studies accept canonical point records independently of legacy revision ordering.
The selected creator is passed to the API; exact legacy duplicates collapse in the default
view, historical versions remain selectable. Stock links navigate to the matching source
point on its map. The extra 60-session selector does not remove immature views.

Validation before release: build plus 421 tests; copy lint and 1,344 internal links pass.
Backend integration and production receipts are recorded in ducky-bot's
reports/CREATOR-STUDY-DELIVERY-2026-09-08.md. Production release remains pending here.

Production receipt: 76367dc / Pages dec321d4 published on 2026-09-08. In a separate
Chrome QA tab, the authenticated 18-stock account exposed 18 direct map links; SBET
opened directly, then the full-stock selector showed all 18 and selected NKE. At
measured 393x852 CSS pixels the modal and page had no horizontal overflow. Window
size was restored; no account or watchlist mutations were made.
