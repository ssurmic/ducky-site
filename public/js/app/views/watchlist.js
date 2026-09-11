import {freeGuide,quotaNote} from '../experience.js';
// views/watchlist.js — add ticker · list of 全景 mini-cards from /snapshot · remove.
// gamma + expected rows are blurred behind a lock for free/paid (Pro only).
import { overviewView, layoutOverview } from "../watchlist-overview.js";
import { companyContext } from "../company-context.js";
import {reading,researchRow,replaceReading,syncSourceDialog} from '../stock-reading.js';
import { icon } from "../icons.js";
import { symbolPicker } from "../symbol-picker.js";
import { s } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import * as tg from "../tg.js";
import { unpackSnapshot, reusableSnapshot } from "../snapshot-model.js";
import { el, clear, toast, spinner, empty, errorBox, lock, num, px, pct, int, signClass } from "../ui.js";

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export function normalizeList(resp) {
  const arr = Array.isArray(resp) ? resp : (resp && (resp.items || resp.watchlist || resp.tickers)) || [];
  return arr.map((x) => (typeof x === "string" ? x : x && (x.ticker || x.symbol))).filter(Boolean).map((t) => String(t).toUpperCase());
}

export async function mount(root,{signal}={}) {
  const mountedEpoch=store.epoch();
  const unsubs = [];
  root.classList.add("watchlist-view");
  let overview = api.peek('/watchlist')?.overview||null, selected = null, disposed = false, loading = true;
  const focused=window.DUCKY?.PRODUCT_FOCUS_ENABLED===true;
  let research=new Map((api.peek('/me/stock-research')?.items||[]).map(item=>[item.ticker,item])),researchFailed=false,researchLoading=true,loadSeq=0,membershipAvailable=false;
  const missingResearch=()=>({status:researchLoading?'read_pending':researchFailed?'read_failed':'pending'});
  let lastPaint='';
  function reportPaint(){
    const items=list.querySelectorAll('[data-reading-anchor]').length;
    const readable=list.querySelectorAll('.stock-one-sentence').length;
    const key=[view,items,readable,researchLoading,researchFailed].join('|');
    if(key!==lastPaint){lastPaint=key;api.readDiagnostic('render',{resource:'watchlist',items,readable});}
  }
  let view = "list", query = "", sort = "market_cap", sortDirection = "desc", area = 'equal', candidate = null, adding = false;
  const checked=new Set();
  let removing=false;
  const currentSession=()=>!disposed&&!signal?.aborted&&store.epoch()===mountedEpoch;
  const watchCap=()=>Number.isFinite(store.get('me')?.watch_cap)?store.get('me').watch_cap:null;
  const isFull=()=>watchCap()!==null&&(store.get('watchlist')||[]).length>=watchCap();
  // Each entry starts on List, consistently on desktop and phone.
  // List combines prices, the shared overview and a direct information-map action.
  try { area = localStorage.getItem('ducky-watch-area') === 'cap' ? 'cap' : 'equal'; } catch {}
  const inflight = new Map();   // finding watchlist.js:118 — ticker -> in-flight fetch promise (dedup)
  const head = el("div.view-head", el("h1", s("watch.title")), el("span.count.mono", { id: "watch-count" }));
  const input = el("input.input.mono", { type: "text", placeholder: s("watch.placeholder"), autocomplete: "off", autocapitalize: "characters", spellcheck: "false", maxlength: "80", "aria-label": s("watch.placeholder") });
  const addBtn = el("button.btn.btn-primary", { type: "submit" }, s("watch.add"));
  const picker = symbolPicker(input, () => store.get("watchlist") || []);
  unsubs.push(picker.dispose);
  const form = el("form.add-row", { onsubmit: onAdd }, picker.wrap, addBtn);
  const addOptions = el('details.watch-add-options', {open:!(store.get('watchlist')||[]).length},
    el('summary',s('watch.add')),el('p.view-intro.muted',s('watch.workflow')),form);
  const usage=el("div");
  const capacity=el('p.watch-capacity',{hidden:true,role:'status'});
  const selectionCount=el('summary',{'aria-live':'polite'});
  const selectionNames=el('p.watch-selection-names');
  const selectionReview=el('details.watch-selection-review',selectionCount,selectionNames);
  const selectionHint=el('span.watch-selection-count',s('watch.selection_hint'));
  const removeBtn=el('button.btn.btn-ghost.danger.watch-remove-selected',{type:'button',disabled:true,onclick:()=>removeTickers([...checked])});
  const clearSelection=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{checked.clear();render();}},s('watch.clear_selection'));
  const manageBtn=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{view='list';render();list.querySelector('[data-watch-select]')?.focus({preventScroll:true});}},s('watch.manage'));
  const bulk=el('div.watch-bulk',{hidden:!focused},selectionHint,selectionReview,el('div.watch-bulk-actions',manageBtn,clearSelection,removeBtn));
  const removeResult=el('p.watch-remove-result',{hidden:true,role:'status'});
  const readNotice=el('div',{'aria-live':'polite'});
  const list = el("div.watch-overview", { id: "watch-cards" });
  const resize=()=>layoutOverview(list);
  if(document.fonts)document.fonts.ready.then(()=>{if(!disposed)layoutOverview(list,true);});
  if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(resize);observer.observe(list);unsubs.push(()=>observer.disconnect());}
  else{window.addEventListener('resize',resize);unsubs.push(()=>window.removeEventListener('resize',resize));}
  const detail = el('section.watch-detail', {hidden:true, 'aria-label':s('watch.details')});
  const layout = el('div.watch-layout', list, detail);
  const modes = el('div.watch-modes', {'role':'group','aria-label':s('watch.display')});
  for (const mode of (focused?['list','reading','heatmap']:['list','heatmap'])) modes.append(el('button.btn.btn-ghost.btn-sm', {type:'button',
    'data-mode':mode, 'aria-pressed':String(view===mode), onclick:()=>{
      view=mode;render();
    }},s('watch.view_'+mode)));
  const offer = el('div.watch-search-offer',{hidden:true,'aria-live':'polite'});
  const filter = el('input.input.watch-filter',{type:'search',placeholder:s('watch.filter'), 'aria-label':s('watch.filter'),autocomplete:'off',spellcheck:'false',
    oninput:()=>{query=filter.value;candidate=null;render();}});
  const filterPicker = symbolPicker(filter,()=>store.get('watchlist')||[],{
    allowWatched:true,
    onSelect:row=>{candidate=row;query=filter.value;render();},
    onResults:rows=>{candidate=rows.find(row=>row.ticker===filter.value.trim().toUpperCase().replace(/^\$/,''))||null;renderOffer();}
  });
  filterPicker.wrap.classList.add('watch-search');unsubs.push(filterPicker.dispose);
  const sorting = el('select.input',{'aria-label':s('watch.sort'),onchange:()=>{sort=sorting.value;render();}},
    ...['market_cap','change_pct','ytd','drawdown','relative','iv_hv','attention','degen','ticker'].map(key=>el('option',{value:key},s('watch.sort_'+key))));
  const controls = el('div.watch-controls',modes,filterPicker.wrap,...(focused?[]:[sorting]),el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:load},s('watch.refresh')));
  function renderOffer() {
    clear(offer);
    offer.hidden=!candidate||(store.get('watchlist')||[]).includes(candidate.ticker);
    if(offer.hidden)return;
    const row=candidate;
    offer.append(el('div',el('strong',row.ticker),el('span.muted',row.name||row.company||''),el('p',s('watch.not_followed'))),
      el('button.btn.btn-primary.btn-sm',{type:'button',disabled:adding||removing||isFull(),onclick:()=>addTicker(row.ticker,false)},s(isFull()?'watch.full_button':adding?'watch.adding':'watch.add_to_watchlist')));
  }
  function selectTicker(t) {
    selected=t;render();renderDetail();loadSnapshot(t,false);
    detail.querySelector('button')?.focus();
    detail.scrollIntoView?.({block:'nearest',behavior:'smooth'});
  }
  function closeDetail() {
    const previous=selected;selected=null;render();renderDetail();
    list.querySelector(`[data-open="${previous}"]`)?.focus();
  }
  function renderDetail() {
    clear(detail);detail.hidden=!selected;layout.classList.toggle('has-detail',!!selected);
    if (!selected) return;
    detail.append(el('button.btn.btn-ghost.btn-sm.watch-close',{type:'button',onclick:closeDetail},s('watch.close_details')),
      card(selected,(store.get('snapshots') || {})[selected]));
  }
  head.append(addOptions);
  root.append(head, freeGuide() || "", usage, capacity, controls, offer, bulk, removeResult, readNotice, layout,
    el('div.chips',el('a.chip',{href:'#/updates'},s('updates.entry_title'))));

  async function onAdd(e) {
    e.preventDefault();
    const t = input.value.trim().toUpperCase().replace(/^\$/, "");
    if (!TICKER_RE.test(t)) { toast(s("watch.select_result")); input.focus(); return; }
    await addTicker(t,true);
  }
  async function addTicker(t,fromForm) {
    if(adding||removing||!currentSession())return;
    if ((store.get("watchlist") || []).includes(t)) { toast(s("watch.following")); return; }
    if(isFull()){toast(s('watch.full_note',{cap:watchCap()}));return;}
    const epoch=store.epoch();adding=true;render();
    try {
      const result = await api.watchlist.add(t,{signal,silent402:true});
      if(disposed||store.epoch()!==epoch)return;
      if(fromForm){input.value = ""; picker.reset();}
      filterPicker.reset();
      store.set('watchlist',[...new Set([...(store.get('watchlist')||[]),result?.ticker||t])]);
      toast(result?.added === false ? s("watch.following") : s("watch.added", { t:result?.ticker || t }), "ok");
      tg.haptic("success");
      await load();

    } catch (err) {
      if(disposed||store.epoch()!==epoch)return;
      if(err.body?.error==='watch_limit'){
        if(Number.isFinite(err.body.cap))store.patch('me',{watch_cap:err.body.cap});
        toast(s('watch.full_note',{cap:err.body.cap??watchCap()??'—'}));await load();
      }else if(err.status===402)toast(s('watch.add_unavailable'),'err');
      else toast(s("common.error", { msg: err.message }), "err");
    } finally { adding=false;if(currentSession())render(); }
  }

  async function onRemove(t) {
    return removeTickers([t]);
  }

  async function removeTickers(tickers){
    if(removing||adding||!currentSession())return;
    const targets=[...new Set(tickers)].filter(t=>(store.get('watchlist')||[]).includes(t));
    if(!targets.length)return;
    removing=true;removeResult.hidden=true;render();
    let removed=0;
    try{
      // Existing idempotent endpoint; bounded sequential writes, never one reload per stock.
      for(const ticker of targets){
        if(!currentSession())return;
        const result=await api.watchlist.remove(ticker,{signal});
        if(!currentSession())return;
        if(result?.ticker!==ticker||typeof result?.removed!=='boolean')throw new Error('invalid_remove_response');
        checked.delete(ticker);research.delete(ticker);syncSourceDialog(ticker,[]);
        store.set('watchlist',(store.get('watchlist')||[]).filter(t=>t!==ticker));
        removed++;
      }
      if(currentSession()){removeResult.textContent=s('watch.removed_count',{count:removed});removeResult.hidden=false;tg.haptic('light');}
    }catch(error){
      if(!currentSession())return;
      // Stop on failure. Keep every unconfirmed stock selected for a deliberate retry.
      targets.slice(removed).filter(t=>(store.get('watchlist')||[]).includes(t)).forEach(t=>checked.add(t));
      removeResult.textContent=s('watch.remove_incomplete',{removed,remaining:targets.length-removed});removeResult.hidden=false;
    }finally{
      removing=false;
      if(currentSession())render();
    }
  }

  function render() {
    renderOffer();list.classList.toggle('is-filtered',!!query.trim());
    const items = store.get("watchlist") || [];
    const me = store.get("me") || {};
    // finding watchlist.js:54 — GET /me serves the cap top-level as watch_cap (app.py), never me.caps.watches.
    const cap = me.watch_cap;
    for(const ticker of checked)if(!items.includes(ticker))checked.delete(ticker);
    const full=isFull();
    capacity.hidden=!full;capacity.textContent=full?s('watch.full_note',{cap}):'';
    addBtn.disabled=adding||removing||full;
    addBtn.textContent=s(full?'watch.full_button':adding?'watch.adding':'watch.add');
    bulk.hidden=!focused||!items.length;
    selectionHint.hidden=!!checked.size;selectionReview.hidden=!checked.size;
    selectionCount.textContent=s('watch.selected_count',{count:checked.size});
    selectionNames.textContent=[...checked].join(' · ');
    removeBtn.disabled=!checked.size||removing||adding;
    removeBtn.textContent=s(removing?'watch.removing':'watch.remove_selected',{count:checked.size});
    clearSelection.hidden=!checked.size;clearSelection.disabled=removing||adding;
    manageBtn.hidden=view==='list';manageBtn.disabled=removing||adding;
    clear(usage);if(!store.isPaid())usage.append(quotaNote("watches",items.length,cap)||"");
    const cnt = document.getElementById("watch-count");
    if (cnt) cnt.textContent = Number.isFinite(cap) ? s("watch.count", { n: items.length, cap }) : String(items.length);
    if (selected && !items.includes(selected)) {selected=null;renderDetail();}
    modes.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===view)));
    sorting.hidden=view==='heatmap'||view==='reading';
    const openDisclosures=new Set([...list.querySelectorAll('details[open][data-disclosure]')].map(n=>n.dataset.disclosure));
    const focusedMap=list.contains(document.activeElement)?document.activeElement?.dataset?.mapOpen:null;
    if(loading && !overview && !research.size){clear(list).append(spinner());return;}
    if (!items.length) {clear(list).append(empty(s('watch.empty')));return;}
    const rows=new Map((overview?.items || []).map(row=>[row.ticker,row]));
    if(view==='reading'){
      const ordered=[...items].filter(t=>[t,rows.get(t)?.company||''].join(' ').toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a,b)=>(rows.get(b)?.market_cap||0)-(rows.get(a)?.market_cap||0)||a.localeCompare(b));
      replaceReading(list,el('div.stock-reading-list',...ordered.map(t=>researchRow(t,rows.get(t),research.get(t)||missingResearch()))));
      if(!ordered.length)list.append(el('p.muted',s('focus.no_matching_stocks')));
      reportPaint();
      return;
    }
    const tableLeft=list.querySelector('.watch-table-scroll')?.scrollLeft||0;
    replaceReading(list,overviewView(items.map(t=>rows.get(t) || {ticker:t,company:t,market_cap_status:'missing',price_status:'missing'}),
      {view,query,sort,sortDirection,selection:focused?{checked,disabled:removing||adding,toggle:(tickers,value)=>{if(removing||adding)return;for(const t of tickers)value?checked.add(t):checked.delete(t);render();}}:null,onSort:key=>{sortDirection=key===sort?(sortDirection==='desc'?'asc':'desc'):key==='ticker'?'asc':'desc';sort=key;render();},area,renderResearch:focused?t=>reading({...research.get(t),ticker:t,...(!research.has(t)?missingResearch():{})}):null,onAreaChange:value=>{area=value;try{localStorage.setItem('ducky-watch-area',area);}catch{}render();list.querySelector(`[data-area="${area}"]`)?.focus();},selected,session:overview?.session,previous:overview?.previous_session,onSelect:selectTicker}));
    reportPaint();
    const scroll=list.querySelector('.watch-table-scroll');if(scroll)scroll.scrollLeft=tableLeft;
    for(const disclosure of list.querySelectorAll('details[data-disclosure]'))disclosure.open=openDisclosures.has(disclosure.dataset.disclosure);
    if(focusedMap)[...list.querySelectorAll('[data-map-open]')].find(n=>n.dataset.mapOpen===focusedMap)?.focus({preventScroll:true});
    layoutOverview(list);
  }

  function card(t, snap) {
    const c = el("article.card.snap", { "data-ticker": t });
    const head = el("div.snap-head",
      el("a.ticker.mono", { href: "#/chart/" + t }, "$" + t),
      el("span.spot.mono", snap && snap.ok ? px(snap.spot) : ""),
      snap && snap.ok && typeof snap.tech?.oversold === "boolean" ? el("span.chip", { class: snap.tech && snap.tech.oversold ? "chip-red" : "chip-dim" }, snap.tech && snap.tech.oversold ? s("watch.oversold") : s("watch.not_oversold")) : null,
      el("span.spacer"),
      el("a.btn.btn-ghost.btn-sm", { href: "#/chart/" + t }, s("watch.chart")),
      el("button.btn.btn-ghost.btn-sm.danger", { type: "button", "aria-label": s("watch.remove") + " " + t, onclick: () => onRemove(t) }, "✕"));
    c.appendChild(head);
    c.append(el('a.watch-evidence-entry',{href:'#/evidence/'+encodeURIComponent(t),'aria-label':s('watch.open_stock_map',{ticker:t})},
      icon('evidence'),el('span',el('strong',s('evidence.title')),el('span',s('watch.map_description'))),el('span',{'aria-hidden':'true'},'→')));
    c.append(el('a.btn.btn-ghost.btn-sm.watch-research',{href:'#/research/'+encodeURIComponent(t)},s('watch.research_record')));
    if (!snap) { c.appendChild(spinner()); return c; }
    if (snap.pending) { c.appendChild(spinner(s("common.building"))); return c; }
    if (snap.error && !snap.ok) {
      // The ticker IS on the list — the add (POST /watchlist) succeeded, only the separate /snapshot quote fetch
      // failed. Show a calm "added, quote loading — retry" state, never the red "API offline" box, so the card
      // can never contradict the green "已添加" toast (owner: "已添加 then 出错了 is a bug").
      const box = el("div.snap-loading");
      box.append(el("span.muted.small", s("watch.quote_loading")),
                 el("button.btn.btn-ghost.btn-sm", { type: "button", onclick: () => loadSnapshot(t, true) }, s("common.retry")));
      c.appendChild(box); return c;
    }
    if (!snap.ok) { c.appendChild(el("p.muted", s("watch.no_data"))); return c; }
    const stamp = snap.built_at ? new Date(snap.built_at) : null;
    const stampText = stamp && !Number.isNaN(stamp.getTime()) ? stamp.toISOString().replace("T", " ").slice(0,16) + " UTC" : s("watch.date_unknown");
    c.appendChild(el("div.snap-freshness", el("span.muted.small", s("watch.updated", {date:stampText})),
      el("button.btn.btn-ghost.btn-sm", {type:"button",onclick:()=>loadSnapshot(t,true)},s("watch.refresh"))));

    c.appendChild(companyContext(snap.company_context, snap.rs));
    const te = snap.tech || {}, r20 = (snap.retrace || {}).d20, rs = snap.rs || {}, v = snap.vol || {};
    const rows = el("dl.kv-grid");
    const row = (k, val, cls) => rows.append(el("dt", k), el("dd.mono", { class: cls || "" }, val));
    row(s("watch.rsi"), int(te.rsi_d) + " / " + int(te.rsi_w) + " / " + int(te.rsi_m), Number(te.rsi_d) < 30 ? "neg" : "");
    row(s("watch.dd"), pct(te.dd_pct), signClass(te.dd_pct));
    row(s("watch.vs50"), pct(te.vs_50dma), signClass(te.vs_50dma));
    row(s("watch.vs200"), pct(te.vs_200dma), signClass(te.vs_200dma));
    if (r20) row(s("watch.retrace"), int(r20.pos * 100) + "% · " + posWord(r20.pos) + " [" + num(r20.lo, 2) + "–" + num(r20.hi, 2) + "]", r20.pos < 0.25 ? "neg" : r20.pos > 0.75 ? "pos" : "");
    if (rs.status === "benchmark_changed") row(s("company.comparison_pending"), "—");
    if (rs.excess20 !== undefined && rs.excess20 !== null) row(s(rs.scope === "business_peers" ? "watch.rs_peers" : rs.kind === "basket" ? "watch.rs_theme" : "watch.rs_reference", { b: rs.benchmark || "—" }), pct(rs.excess20) + (rs.label ? " · " + rsWord(rs.label) : ""), signClass(rs.excess20));
    const pctOrDash = (x) => (x == null ? "—" : num(x, 1) + "%");   // avoid a broken "—%" when only one side is present
    if (v.iv || v.hv) row(s("watch.ivhv"), pctOrDash(v.iv) + " / " + pctOrDash(v.hv) + (v.ratio ? " → " + num(v.ratio, 2) + (v.label ? " (" + volWord(v.label) + ")" : "") : ""));
    c.appendChild(rows);

    // Pro rows: gamma walls + expected range
    const pro = el("dl.kv-grid.pro-rows");
    const g = snap.gamma, ex = snap.expected;
    const proRow = (k, val) => pro.append(el("dt", k), el("dd.mono", val));
    if (store.isPro()) {
      proRow(s("watch.gamma"), g ? px(g.call_wall) + " / " + px(g.put_wall) + " / " + px(g.flip) + (g.regime ? " · " + regimeWord(g.regime) : "") : "—");
      proRow(s("watch.expected"), ex ? px(ex.low) + "–" + px(ex.high) + " (±" + num(ex.move_pct, 1) + "%" + (ex.expiry ? " · " + ex.expiry : "") + ")" : "—");
      c.appendChild(pro);
    } else {
      proRow(s("watch.gamma"), "$000 / $000 / $000");
      proRow(s("watch.expected"), "$000–$000 (±0.0%)");
      c.appendChild(lock(pro));
    }
    c.appendChild(el("div.snap-actions",
      el('a.btn.btn-ghost.btn-sm',{href:'#/updates?ticker='+encodeURIComponent(t)},s('updates.follow_content')),
      el("a.btn.btn-ghost.btn-sm", { href: "#/creators?ticker=" + encodeURIComponent(t) }, s("watch.creator_mentions")),
      el("a.btn.btn-ghost.btn-sm", { href: "#/boards?mode=archive&ticker=" + encodeURIComponent(t) }, s("watch.radar_records")),
      el("a.btn.btn-primary.btn-sm", { href: "#/alerts?ticker=" + encodeURIComponent(t) }, s("watch.set_alert")),
      el("a.btn.btn-ghost.btn-sm", { href: "#/calendar?ticker=" + encodeURIComponent(t) }, s("watch.events"))));
    return c;
  }

  function posWord(p) { return p < 0.25 ? s("watch.pos_low") : p > 0.75 ? s("watch.pos_high") : s("watch.pos_mid"); }
  // localize server-provided enum verdicts (they arrive in one language); unknown values pass through unchanged.
  function enumWord(val, map) { const k = map[String(val).trim().toLowerCase()]; return k ? s(k) : (val == null ? "" : String(val)); }
  function volWord(x) { return enumWord(x, { "便宜": "watch.v_cheap", "cheap": "watch.v_cheap", "合理": "watch.v_fair", "fair": "watch.v_fair", "贵": "watch.v_rich", "偏贵": "watch.v_rich", "rich": "watch.v_rich", "expensive": "watch.v_rich" }); }
  function rsWord(x) { return enumWord(x, { "领先": "watch.rs_leading", "leading": "watch.rs_leading", "落后": "watch.rs_lagging", "lagging": "watch.rs_lagging", "同步": "watch.rs_inline", "持平": "watch.rs_inline", "相当": "watch.rs_inline", "inline": "watch.rs_inline" }); }
  function regimeWord(x) { return enumWord(x, { "positive": "watch.regime_pos", "偏多": "watch.regime_pos", "negative": "watch.regime_neg", "偏空": "watch.regime_neg", "neutral": "watch.regime_neutral", "中性": "watch.regime_neutral" }); }

  async function load() {
    // finding watchlist.js:123 — a /watchlist response in flight when logout() wipes the store would
    // otherwise repopulate it; capture the epoch and drop the write if the session changed.
    const epoch = store.epoch();
    const mine=++loadSeq;
    let membershipReady=false;
    researchLoading=focused;
    clear(readNotice);
    // Quotes/membership can render while the separately validated research read
    // is in flight. Source validation must not delay the first usable list.
    const current=()=>!disposed&&!signal?.aborted&&store.epoch()===epoch&&mine===loadSeq;
    const diagnostic=(stage,error)=>{
      root.dataset.researchReadError=stage;
      console.warn('Ducky research read', {stage,...api.readFailure(error)});
    };
    const paintResearch=()=>{
      if(!membershipReady)return;
      try{render();}catch(error){diagnostic('render',error);}
    };
    const readFailed=error=>{
      if(!current())return;
      diagnostic(error?.message==='invalid_research_response'?'invalid_response':api.readFailure(error).reason,error);
      researchLoading=false;researchFailed=true;
      if([401,402,403].includes(error?.status))research=new Map();
      else if(research.size)readNotice.append(el('p.small.muted',s('focus.summary_read_failed')));
      paintResearch();
    };
    // Handle read/shape failures separately from rendering. A render exception
    // must not turn a valid accepted response into "no saved analysis".
    const researchTask=focused?api.get('/me/stock-research',{signal}).then(response=>{
      if(!current())return;
      if(!Array.isArray(response?.items)||response.items.some(item=>!item||typeof item.ticker!=='string')){
        readFailed(new Error('invalid_research_response'));return;
      }
      delete root.dataset.researchReadError;
      for(const ticker of new Set([...research.keys(),...response.items.map(item=>item.ticker)]))
        syncSourceDialog(ticker,response.items.find(item=>item.ticker===ticker)?.sources||[]);
      researchLoading=false;researchFailed=false;research=new Map(response.items.map(item=>[item.ticker,item]));paintResearch();
    },readFailed):Promise.resolve();
    try {
      const response=await api.watchlist.list({signal});
      const items = normalizeList(response);
      if (!current()) return;
      overview = response?.overview || null;
      if(Number.isFinite(response?.cap))store.patch("me",{watch_cap:response.cap});
      loading = false;
      membershipAvailable=true;
      membershipReady=true;
      store.set("watchlist", items);
    } catch (err) {
      if (!current()) return;
      loading = false;
      membershipAvailable=false;
      if((overview||research.size)&&![401,402,403].includes(err.status)){membershipReady=true;render();readNotice.append(errorBox(err,load));}
      else{clear(list);list.appendChild(errorBox(err,load));}
    }
    await researchTask;
  }

  function loadSnapshot(t, force) {
    const snaps = store.get("snapshots") || {};
    // finding watchlist.js:118 — in-flight dedup: reuse the running fetch instead of starting a parallel
    // 6-try polling loop when a watchlist re-emit (or a double add) asks for the same ticker again.
    if (inflight.has(t)) return inflight.get(t);
    if (!force && reusableSnapshot(snaps[t])) return Promise.resolve();
    const epoch = store.epoch();   // finding watchlist.js:123 — session guard for late responses
    if (!snaps[t]?.ok) store.patch("snapshots", { [t]: { pending: true } });
    const p = (async () => {
      try {
        const r = await api.snapshot(t, { tries: 6, onWait: () => { if (!disposed && store.epoch() === epoch) store.patch("snapshots", { [t]: { pending: true } }); } });
        if (disposed || store.epoch() !== epoch) return;   // logged out mid-flight — don't repopulate the wiped store
        const snap = unpackSnapshot(r);
        store.patch("snapshots", { [t]: api.isAccepted(r) ? { ok: false, error: { message: s("common.building") } } : snap });
      } catch (err) {
        if (disposed || err.status === 401 || store.epoch() !== epoch) return;
        store.patch("snapshots", { [t]: { ok: false, error: err } });
      } finally {
        inflight.delete(t);
      }
    })();
    inflight.set(t, p);
    return p;
  }

  unsubs.push(store.subscribe("watchlist",()=>{
    // Membership changes can contribute a just-read stock graph while the
    // list request is pending. Existing authoritative rows keep precedence.
    for(const item of api.peek('/me/stock-research')?.items||[])
      if(!research.has(item.ticker))research.set(item.ticker,item);
    render();
  }));
  unsubs.push(store.subscribe("snapshots", renderDetail));
  unsubs.push(store.subscribe("me", () => {render();renderDetail();}));
  const priceUpdate=event=>{
    const update=event.detail,response=update?.value;
    if(disposed||signal?.aborted||mountedEpoch!==store.epoch())return;
    if(focused&&update?.path==='/me/stock-research'){
      if(loading||!membershipAvailable||!Array.isArray(response?.items))return;
      const watched=new Set(store.get('watchlist')||[]);
      research=new Map(response.items.filter(item=>watched.has(item.ticker)).map(item=>[item.ticker,item]));researchLoading=false;researchFailed=false;
      delete root.dataset.researchReadError;
      for(const ticker of watched)syncSourceDialog(ticker,research.get(ticker)?.sources||[]);
      render();update.accepted=true;return;
    }
    if(update?.path!=='/watchlist'||!Array.isArray(response?.overview?.items))return;
    const current=store.get('watchlist')||[],incoming=normalizeList(response);
    // Membership/cap changes still require the shared reload flow. A price
    // refresh never restores a removed ticker or replaces an open stock study.
    if(current.length!==incoming.length||current.some(t=>!incoming.includes(t))||
       (Number.isFinite(response.cap)&&response.cap!==store.get('me')?.watch_cap))return;
    const focusedButton=list.contains(document.activeElement)?document.activeElement?.dataset?.open:null;
    overview=response.overview;render();
    if(focusedButton)list.querySelector(`[data-open="${focusedButton}"]`)?.focus({preventScroll:true});
    update.accepted=true;
  };
  root.addEventListener('ducky:shared-read',priceUpdate);
  unsubs.push(()=>root.removeEventListener('ducky:shared-read',priceUpdate));
  render();
  await load();
  return () => {disposed=true;root.classList.remove("watchlist-view");unsubs.forEach((u) => u());};
}
