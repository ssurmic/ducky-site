# User journeys

| Intent | Entry and path | Primary action | Success state |
|---|---|---|---|
| I have no watchlist and do not know Ducky | Today → one dated research example → stock → view support and risk | Follow this stock | The same stock appears in Watchlist and influences Today. |
| I want to know what changed | Today / Watchlist → change filter → stock | Inspect the attributed change | Full context and an opposing view are reachable without starting another search. |
| I am exploring a theme | Explore → research question → related stocks | Open a stock | The reason for the connection is visible; attention is not described as sentiment. |
| I follow creators | Creators → ticker/scope filter → source → author profile | Follow author or save view | Local state updates; source identity and date stay visible. |
| I want a reference price | Watchlist overview / stock → reference range → basis → watch plan | Edit price, condition and expiry | A local draft is listed in My alerts, explicitly not monitored. |
| I am preparing for an event | Calendar → upcoming event → impact and related stock | Inspect stock or create a plan | Event context survives in the stock journey; uncertain times remain uncertain. |
| Data did not refresh | Any page → retained-content notice | Retry | Existing dated content remains readable during the failure demonstration. |

The owner asked for hands-off design work. The prototype therefore includes a scenario selector to make the new-user and returning-user paths reviewable without changing a real account. Signing up, financial advice, live alerts and backend recovery are outside this artifact.
