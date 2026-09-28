# User journeys and content map

Status: local prototype, 2026-09-28. This is a design and acceptance specification, not evidence of production adoption or measured usability gains. The three perspectives below describe tasks; they do not create three product modes or a mandatory onboarding questionnaire.

## One research destination, several reasons to enter

Explore helps people find and compare companies. Watchlist helps people revisit companies they have chosen to follow. Both open the same stock workspace and the same metric definitions. Following changes personal monitoring scope; it is not a prerequisite for reading research.

The stock workspace answers four questions: **What is the case? What do price and options readings show? What supports or challenges the case? What was recorded when?** Creator views, company disclosures and scheduled events remain separate source types, linked by ticker and stable record identity.

## Three perspectives

| Perspective | Situation and starting question | Intended path | Successful outcome |
|---|---|---|---|
| Researcher | No watchlist yet; wants to investigate a company or theme and verify a claim. | Explore → search or optional research question → summary / metric comparison → stock map → exact view and source → dated evidence → optionally follow. An activity record can enter the same path. | Can compare unwatched stocks, distinguish facts from views, find counterevidence, and return to the original filtered results. |
| Stock beginner | Does not know what a ticker, option wall or IV/HV means; wants one understandable starting point. | Today → dated NVDA example → company description → main debate and opposing view → source → decide whether to follow → Watchlist → related event. Metric explanations are available when the question arises. | Can name the company, explain why it merits attention and what remains uncertain, and find the next event without interpreting a score as a buy instruction. |
| Experienced user | Has 20–50 watched stocks and wants to triage changes, inspect levels and record a condition. | Today → Watchlist List and change/price/event filters → Overview for reasons or Metrics for comparison → stock metric detail → direction-specific watch condition → saved local plan → return to prior scope. | Can reach known tools quickly, sort with missing values last, inspect exact expiry/date and maintain the distinction between a price reference and a personal action condition. |

## Where each kind of information belongs

| Content or task | Primary home | From Explore | From Watchlist | Detail and next action |
|---|---|---|---|---|
| Market backdrop / USD liquidity | Today | Activity's macro link | Today in primary navigation | Three separately normalized series, raw readings and dates; preserve selected series/date. |
| Company identity and research summary | Stock Overview | Search result → Overview | Ticker or overview card | Company description, question, support and risk before specialist metrics. |
| Long-term and trend perspectives | Shared Metrics; Watchlist context | Metrics comparison without following | List / Overview context and Metrics comparison | Separate investment case and price trend; neither is a bull/bear vote. |
| Option walls, closing-low support, moving averages | Stock Metrics & levels | Comparison value / named metric link | Comparison value / named metric link | Keep each basis and option expiry distinct; choose an above/below condition explicitly. |
| IV/HV20 | Shared Metrics | Sort and inspect candidates | Sort and inspect watched stocks | Display IV, HV20, ratio and expiry. A low ratio is not proof of cheap options or an undervalued stock. |
| Degen discussion attention | Shared Metrics; Explore attention section | Compare attention or inspect a company | Metrics | Counts and attention are not directional sentiment or valuation. A separate undervaluation score is not connected. |
| Creator views | Creators | Stock-scoped creator link or a view preview | Stock-scoped creator link | Stable author and view identity, full conditions, source and date; follow creator or save view. |
| Insider / fund / political / company disclosures | Explore → Company and capital activity | Type/search/ticker filters | Ticker-scoped row or card link | Original record, typed amount, transaction/report/publication dates and limitations. |
| Support and counterevidence | Stock Research map | Direct map entry on each stock result | Direct map entry on each watch row | Open complete source; a shared creator view keeps the same saved identity. |
| Historical record | Stock Evidence timeline; creator archive | Stock → timeline | Stock → timeline | Dated additions retain source identity. Do not invent an earlier price or call this verified performance. |
| Scheduled event and impact | Calendar | Stock's related events | Event column or stock's related events | Two-week default, explicit timing state, relevant stock and source; history is optional. |
| Reference range | Stock Overview | Open stock | Watchlist price/reference area | Handmade sample bounds are labeled; production needs a reviewed calculation and provenance. |
| Personal condition | My watch plans | Stock reference / metric action | Reference / metric action | Editable price, above/below condition and expiry; local draft, notifications inactive. |
| Saved material | Creators saved-view tab; stock map markers | Open a source | Open a source | Creator views are retrievable across surfaces. Other map markers explicitly stay on that map. No hidden theme-bookmark inbox. |

## Presentation rules

- Keep the five primary destinations. Do not make an expert feature accessible only after a follow action.
- Search results take priority over promotional or educational cards. Research questions expand when wanted, with one explicit action to show related stocks.
- Use a short explanation on Overview, comparison on Metrics, and full evidence on source expansion. Preserve opposing views rather than compressing them into a score.
- Return links retain the entry page and filters. A stock opened from Explore should not imply that it already belongs to Watchlist. Generic stock links open Overview; explicit deep links open the requested section.
- Ticker-scoped links override unrelated stale filters. Going from NVDA to its disclosures must not inherit an old ORCL search and look empty.
- Keep plans, source bookmarks and follows distinct. “Saved” must identify where the item can be retrieved. Notification status must describe actual delivery capability.
- Missing, partial and delayed records stay explicit. Existing dated evidence remains readable while another source or summary is missing.

## Review scenarios

1. Empty-watchlist researcher searches NVDA, compares IV/HV and option levels, reads the map and returns to the same Explore scope without an implicit follow.
2. Search results remain visible on a 320 px phone; optional theme cards do not occupy several screens before the first result.
3. A researcher opens NVDA from activity, reaches its metrics, then returns to that activity scope. A global metric entry opens Explore comparison, never an empty personal table.
4. A beginner opens the Today example, reads company context and a risk before a metric wall, then follows explicitly.
5. A creator view saved from a stock is visible in Creators → Saved views with the same author, date and excerpt.
6. A practiced user sorts metrics, opens a named metric, and chooses a level above the quote. The resulting condition is “at or above”; a lower reference uses “at or below”. Editing an existing plan retains its chosen direction.
7. A price-missing stock retains research and missing readings. The plan form does not invent a price. No calculation treats missing values as zero.
8. Today's liquidity comparison keeps its expansion, selected series and date on return and language changes.
9. Both languages and themes preserve a usable stock section navigation, source dialog and return path. Table scrolling stays inside the table.

The scenario selector is a review tool that changes only the prototype's browser-local state. Account authentication, live monitoring and backend recovery are outside this artifact. See the [English change register](change-register.md) for the connection boundary.
