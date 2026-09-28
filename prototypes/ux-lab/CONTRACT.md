# UX lab module contract
Location: `prototypes/ux-lab/` in the frontend repository.
This isolated browser prototype is not copied into production dist. No production API requests, auth, account data, or backend edits. All fixtures are clearly illustrative as of 2026-09-25. Do not fabricate real creator quotes. Use fictional demo authors or precisely preserve supplied examples with explicit source limitations.

Shared imports from ../ui.js in views:
- h(tag, attrs, ...children): DOM builder; attrs class, textContent, onClick/onInput/onChange etc. children flattened, null ignored.
- t(key, params={}): key looks up 'ux.'+key in i18n root zh/en.json. Use full module prefix e.g. 'watch.title'.
- button(label, onClick, className='btn')
- link(label, href, className='text-link')
- badge(text, tone='neutral') // positive, negative, accent, neutral
- icon(name, size=18): search, plus, arrow, chevron, bell, map, chart, close, check, star, calendar, users, home, compass, list, grid, filter, sun, moon, settings, bookmark, external, info, clock
- money(number), percent(number), stockLink(ticker), sectionHead(title, rightElement)
- showDialog({title, content:DOMNode, wide:false}): return {close()}; native dialog focus trap/Esc/restore managed centrally
- toast(message)

View exports: mountWatchlist(root,ctx,params); mountStock(root,ctx,params); mountExplore(root,ctx,params); mountCreators(root,ctx,params); mountToday(root,ctx,params); mountCalendar(root,ctx,params). params = {ticker, query:URLSearchParams, sub}. Optional cleanup function.
ctx = {
 state:{watchlist:[],authors:[],alerts:[],saved:[],lang:'zh',theme:'dark',scenario:'new'},
 stocks: array and stock(ticker) lookup,
 save(), rerender(), navigate('stock/NVDA'), toggleWatch(ticker),
 openSearch(), openAlert(ticker, referencePrice), loadDemo(),
}
state is mutable but call ctx.save after mutation. ctx.toggleWatch saves and rerenders all, shows toast. ctx.loadDemo explicitly sets sample watchlist ['NVDA','MU','AMD','ORCL','META','MSFT'].
ctx.openAlert opens local demo-only editable plan form. Do not imply actual notifications.
Stocks shape: {ticker,name,sector:'data.sector.ai',price:224.93,change:0.22,reference:[210,218],resistance:230,summary:'data.nvda.summary',bull:'data.nvda.bull',bear:'data.nvda.bear',event:'data.nvda.event',eventDate:'10/02',updated:'2026-09-25',color:'#76b900'}; some null reference/price cases.
All user text uses `t` and the canonical root `i18n/zh.json` and `i18n/en.json` under `ux.*`. Keep their key sets identical. Fictional fixture prose is localized there too. Module UI state lives in `state.watchUI`, `stockUI`, `exploreUI` and `creatorsUI` so navigation and redraw retain reading context. The scenario reset explicitly clears those keys.

CSS: each module writes own views/<module>.css, root links them. Shared variables --bg --panel --panel-2 --text --muted --line --accent --accent-soft --green --red --radius. Shared classes .btn .btn-primary .btn-quiet .text-link .icon-btn .eyebrow .muted .small .mono .positive .negative .badge .section-head .page-heading .row .stack .panel .empty-state .segmented .chip .chip.active .divider .two-col .three-col .sr-only. .page-heading has h1 then .muted. .row flex wrap, .stack grid gap 16, .panel padding24 border 1 radius12, responsive. Typography h1 30, h2 19, h3 16. Sidebar outside modules fixed desktop 216px, page padding32, content width max1360. Mobile below760 main padding16 and bottom nav; compact UI preserve first insight.
Avoid giant heroes and boxed paragraphs everywhere. Charcoal/slate background, subtle surfaces, restrained warm amber accent. Use rows/hairline dividers, stronger typographic hierarchy. Rich but concise decision-making context. Desktop grids/tables become phone readable cards or bounded scroll with fixed stock column. Tap targets44, input16, full dark/light variables. All buttons must work and routes must connect.
