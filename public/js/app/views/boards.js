// Radar reads the shared public ledger. Filters never fetch quotes or run research.
import { s, LANG } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import { el, clear, spinner, pct, px } from "../ui.js";
import { icon } from "../icons.js";
import { dateTime, metric } from './creator-research.js';

export const BOARDS = [
  {key:'liquidity', kinds:'liquidity,kindex,macro'},
  {key:'digest', kinds:'digest,market,default'},
  {key:'insider', kinds:'insider,cluster'},
  {key:'partner', kinds:'partner,stake,13f'},
  {key:'political', kinds:'political', icon:'insider'},
  {key:'earnings', kinds:'earnings'},
  {key:'hiring', kinds:'hiring'},
  {key:'volscan', kinds:'volscan'},
  {key:'industry', kinds:'nvdev', icon:'partner'},
];
const ALL_KINDS = BOARDS.map(b=>b.kinds).join(',');
const boardOf = row => row.board || BOARDS.find(b=>b.kinds.split(',').includes(row.kind))?.key;
const readable = row => Boolean(String(row.summary || '').trim() || String(row.extra?.message_text || '').trim());
export function filterRecords(rows, state, now=Date.now()) {
  const query=(state.q || '').trim().toLocaleLowerCase();
  const ticker=(state.ticker || '').trim().replace(/^\$/,'').toUpperCase();
  return rows.filter(row=> {
    if(state.board && state.board!=='all' && boardOf(row)!==state.board)return false;
    if(ticker && String(row.ticker || '').toUpperCase()!==ticker)return false;
    if(query && ![row.ticker,row.summary,row.extra?.message_text,row.extra?.message_en,row.extra?.summary_en].join(' ').toLocaleLowerCase().includes(query))return false;
    if(state.direction && String(row.direction)!==state.direction)return false;
    if(state.content==='readable' && !readable(row))return false;
    if(state.content==='missing' && readable(row))return false;
    if(state.mode==='recent' && Date.parse(row.ts)<now-Number(state.days || 7)*86400000)return false;
    const day=(row.ts || '').slice(0,10);
    return !(state.start && day<state.start || state.end && day>state.end);
  }).sort((a,b)=>Date.parse(b.ts)-Date.parse(a.ts) || Number(b.id || 0)-Number(a.id || 0));
}
export function archivePath(state, cursor) {
  const params=new URLSearchParams({kind:BOARDS.find(b=>b.key===state.board)?.kinds || ALL_KINDS,limit:'40',content:state.content || 'all'});
  for(const key of ['ticker','q','start','end','direction'])if(state[key])params.set(key,state[key]);
  if(cursor)params.set('before',cursor);
  return '/public/radar/archive.json?'+params;
}

const WA_MACRO = [
  { re: /continuing jobless/i, zh: "续请失业金", en: "Continuing claims" },
  { re: /nonfarm productivity/i, zh: "非农生产率", en: "Nonfarm productivity" },
  { re: /\bADP\b/i, zh: "小非农 ADP", en: "ADP payrolls" },
  { re: /initial jobless|jobless claims/i, zh: "初请失业金", en: "Jobless claims" },
  { re: /nonfarm|payroll/i, zh: "非农就业", en: "Nonfarm payrolls" },
  { re: /\bADP\b/i, zh: "小非农 ADP", en: "ADP payrolls" },
  { re: /unemployment rate/i, zh: "失业率", en: "Unemployment rate" },
  { re: /(average )?hourly earnings/i, zh: "平均时薪", en: "Avg hourly earnings" },
  { re: /participation rate/i, zh: "劳动参与率", en: "Participation rate" },
  { re: /\bCPI\b/i, zh: "CPI 通胀", en: "CPI" },
  { re: /\bPPI\b/i, zh: "PPI 物价", en: "PPI" },
  { re: /\bPCE\b/i, zh: "PCE 物价", en: "PCE" },
  { re: /retail sales/i, zh: "零售销售", en: "Retail sales" },
  { re: /JOLTS/i, zh: "JOLTS 职位空缺", en: "JOLTS openings" },
  { re: /ISM.*(services|non-?manufacturing)/i, zh: "ISM 服务业", en: "ISM Services" },
  { re: /ISM.*manufacturing.*(employ|new orders|prices|inventor|backlog|supplier|export|import)/i, drop: true },
  { re: /ISM.*manufacturing/i, zh: "ISM 制造业", en: "ISM Mfg" },
  { re: /IBD|TIPP|optimism/i, drop: true },
  { re: /GDPNow|atlanta fed/i, drop: true },
  { re: /consumer confidence/i, zh: "消费者信心", en: "Consumer confidence" },
  { re: /(consumer sentiment|michigan)/i, zh: "密歇根消费信心", en: "UMich sentiment" },
  { re: /durable goods/i, zh: "耐用品订单", en: "Durable goods" },
  { re: /(housing starts|building permits|home sales|existing home|new home)/i, zh: "房地产数据", en: "Housing" },
  { re: /trade balance/i, zh: "贸易帐", en: "Trade balance" },
  { re: /\bGDP\b/i, zh: "GDP", en: "GDP" },
  { re: /FOMC|rate decision|federal funds|minutes/i, zh: "FOMC 利率", en: "FOMC" },
  { re: /speaks|speech/i, zh: "美联储讲话", en: "Fed speaks", speaker: true },
];
export function waMacroLabel(name, isZh) {
  for (const m of WA_MACRO) {
    if (m.re.test(name)) {
      if (m.drop) return null;
      if (m.speaker) { const mm = name.match(/([A-Z][a-zA-Z]+)\s+speaks/i); const who = mm ? mm[1] : "";
        return (isZh ? "美联储讲话" : "Fed speaks") + (who ? (isZh ? " · " + who : ": " + who) : ""); }
      return isZh ? m.zh : m.en;
    }
  }
  return name;
}


export async function mount(root, route={}) {
  const epoch=store.epoch(), params=route.query || new URLSearchParams(location.hash.split('?')[1]);
  const state={mode:['archive','excerpts'].includes(params.get('mode'))?params.get('mode'):'recent',
    board:BOARDS.some(b=>b.key===params.get('board'))?params.get('board'):'all',
    q:params.get('q') || '',ticker:params.get('ticker') || '',
    content:['all','missing'].includes(params.get('content'))?params.get('content'):'readable',
    direction:['-1','0','1'].includes(params.get('direction'))?params.get('direction'):'',
    days:['1','3','7'].includes(params.get('days'))?params.get('days'):'7',
    start:params.get('start') || '',end:params.get('end') || ''};
  let coverageDoc=null;
  let recent=[], excerpts=[], archived=[], cursor=null, pending=false, failed=false, recentFailed=false, historyFailed=false;
  let alive=true, requestId=0, archiveCtl=null, detailId=0, recentReady=false;
  const staticCtl=new AbortController(), timer=setTimeout(()=>staticCtl.abort(),15000);
  const card=el('section.boards-view.radar-workspace');root.append(card);
  const header=el('header.radar-heading',el('div',el('h1',s('boards.h1')),el('p.muted',s('radar.subtitle'))),
    el('a.btn.btn-ghost.btn-sm',{href:'#/calendar'},icon('calendar'),s('watch.events')));
  const starters=el('div.radar-starters',...['liquidity','partner','volscan'].map(key=>el('button.radar-starter',
    {type:'button',onclick:()=>selectBoard(key)},icon(BOARDS.find(b=>b.key===key).icon || key),
    el('span',el('strong.starter-desktop',s('radar.start_'+key)),el('strong.starter-mobile',s('radar.short_'+key)),el('span.muted',s('radar.start_'+key+'_hint'))),el('span',{'aria-hidden':'true'},'↗'))));
  const coverage=el('details.radar-coverage',{'aria-label':s('radar.coverage')});
  const pelosiJump=el('button.btn.btn-ghost.btn-sm.radar-pelosi',{type:'button',onclick:showPelosi},s('radar.pelosi_history'));
  const nav=el('nav.radar-categories',{'aria-label':s('radar.categories')});
  const tabs=el('div.radar-tabs',{'aria-label':s('radar.record_scope')},...['recent','archive','excerpts'].map(mode=>el('button',
    {type:'button','data-mode':mode,onclick:()=>{state.mode=mode;state.start='';state.end='';start.value='';end.value='';apply();}},s('radar.mode_'+mode))));
  const input=(name,type,placeholder)=>el('input.input',{name,type,placeholder,'aria-label':s('radar.'+name),maxlength:name==='q'?100:12});
  const query=input('q','search',s('radar.search_hint'));query.value=state.q;
  const ticker=input('ticker','search','NVDA');ticker.value=state.ticker;
  const content=el('select.input',{name:'content'},...['readable','all','missing'].map(v=>el('option',{value:v},s('radar.content_'+v))));content.value=state.content;
  const direction=el('select.input',{name:'direction'},...['','1','-1','0'].map(v=>el('option',{value:v},s('radar.direction_'+(v===''?'all':v==='1'?'buy':v==='-1'?'sell':'other')))));direction.value=state.direction;
  const days=el('select.input',{name:'days'},...['1','3','7'].map(n=>el('option',{value:n},s('radar.days',{n}))));days.value=state.days;
  const start=el('input.input',{type:'date',name:'start','aria-label':s('radar.start')});start.value=state.start;
  const end=el('input.input',{type:'date',name:'end','aria-label':s('radar.end')});end.value=state.end;
  const field=(name,node)=>el('label.radar-field',el('span',s('radar.'+name)),node);
  const dateFields=el('div.radar-dates',field('start',start),field('end',end));
  const dayField=field('period',days);
  const filterToggle=el('button.radar-filter-toggle',{type:'button','aria-expanded':'false',onclick:()=>{
    const open=filter.classList.toggle('filters-expanded');filterToggle.setAttribute('aria-expanded',String(open));
  }},s('radar.more_filters'));
  const filter=el('form.radar-filters',field('q',query),filterToggle,el('div.radar-extra',field('ticker',ticker),field('direction',direction),dayField,field('content',content),dateFields),
    el('div.radar-filter-actions',el('button.btn.btn-primary',{type:'submit'},s('radar.apply')),
    el('button.btn.btn-ghost',{type:'button',onclick:reset},s('radar.reset'))));
  const guide=el('div.radar-guide');
  const summary=el('div.radar-result-summary',{role:'status','aria-live':'polite'});
  const note=el('p.radar-scope-note.muted');
  const rows=el('div.radar-records');
  const more=el('button.btn.btn-ghost.radar-more',{type:'button',onclick:()=>loadArchive(false)},s('creators.load_more'));
  const main=el('section.radar-main',tabs,guide,filter,summary,note,rows,more);
  card.append(header,starters,coverage,pelosiJump,el('div.radar-layout',el('aside.radar-sidebar',el('h2',s('radar.categories')),nav),main));
  filter.addEventListener('submit',e=>{e.preventDefault();apply();});
  for(const node of [content,direction,days,start,end])node.addEventListener('change',apply);
  for(const node of [query,ticker])node.addEventListener('input',()=>{if(state.mode!=='archive')apply();});
  route.signal?.addEventListener('abort',cleanup,{once:true});
  render();rows.append(spinner());
  const recentStart=new Date(Date.now()-7*86400000).toISOString().slice(0,10);
  const recentTask=api.get('/public/radar/archive.json?limit=200&content=all&start='+recentStart,{auth:false,signal:staticCtl.signal}).then(doc=>{
    if(!Array.isArray(doc?.items))throw new Error('invalid_response');recent=doc.items;
  }).catch(()=>{recentFailed=true;});
  const historyTask=fetch('/radar-history.json',{signal:staticCtl.signal}).then(r=>{if(!r.ok)throw new Error('unavailable');return r.json();}).then(doc=>{
    if(!Array.isArray(doc?.items))throw new Error('invalid_response');
    excerpts=doc.items.map(r=>({...r,archived:true,summary:r.summary?.[LANG] || '',extra:{message_text:r.body?.[LANG] || ''}}));
  }).catch(()=>{historyFailed=true;});
  const coverageTask=api.get('/public/radar/coverage.json',{auth:false,signal:staticCtl.signal}).then(doc=>{coverageDoc=doc;}).catch(()=>{});
  await Promise.all([recentTask,historyTask,coverageTask]);clearTimeout(timer);
  if(!alive || epoch!==store.epoch())return cleanup;
  recentReady=true;
  if(state.mode==='archive')await loadArchive(true);else render();
  return cleanup;

  function cleanup(){alive=false;requestId++;archiveCtl?.abort();staticCtl.abort();clearTimeout(timer);}
  function persist(){const p=new URLSearchParams();for(const [k,v] of Object.entries(state))if(v)p.set(k,v);history.replaceState(null,'','#/boards?'+p);}
  function readFilters(){state.q=query.value.trim();state.ticker=ticker.value.trim().toUpperCase().replace(/^\$/,'');state.content=content.value;state.direction=direction.value;state.days=days.value;state.start=start.value;state.end=end.value;}
  function apply(){
    readFilters();end.setCustomValidity(state.start && state.end && state.start>state.end?s('radar.date_error'):'');
    if(!filter.reportValidity())return;persist();
    if(state.mode==='archive')loadArchive(true);else{requestId++;archiveCtl?.abort();pending=false;failed=false;render();}
  }
  function selectBoard(key){state.board=key;apply();}
  function reset(){state.board='all';query.value='';ticker.value='';content.value='readable';direction.value='';days.value='7';start.value='';end.value='';apply();}
  async function loadArchive(resetPage){
    if(!resetPage && pending)return;
    if(resetPage){archiveCtl?.abort();archived=[];cursor=null;}
    const token=++requestId;archiveCtl=new AbortController();pending=true;failed=false;render();
    try{
      const doc=await api.get(archivePath(state,cursor),{auth:false,signal:archiveCtl.signal});
      if(!alive || token!==requestId || epoch!==store.epoch())return;
      if(!Array.isArray(doc?.items) || (doc.filter_version!==2 && (state.q || state.start || state.end || state.content!=='all')))throw new Error('invalid_response');
      const seen=new Set(archived.map(r=>r.id));archived.push(...doc.items.filter(r=>!seen.has(r.id)));
      cursor=doc.next_cursor || null;
    }catch{if(token===requestId)failed=true;}
    finally{if(alive && token===requestId && epoch===store.epoch()){pending=false;render();}}
  }
  function render(){
    if(!alive)return;
    const source=state.mode==='recent'?recent:state.mode==='excerpts'?excerpts:archived;
    const shown=filterRecords(source,state), available=filterRecords(source,{...state,board:'all'});
    const missingCount=filterRecords(source,{...state,content:'missing'}).length;
    const hasError=state.mode==='recent'?recentFailed:state.mode==='excerpts'?historyFailed:failed;
    const focusedBoard=nav.contains(document.activeElement)?document.activeElement.dataset.board:null;
    clear(nav);
    for(const board of [{key:'all'},...BOARDS]){
      const count=board.key==='all'?available.length:available.filter(r=>boardOf(r)===board.key).length;
      nav.append(el('button.radar-category',{type:'button','aria-pressed':String(board.key===state.board),'data-board':board.key,onclick:()=>selectBoard(board.key)},
        icon(board.icon || (board.key==='all'?'boards':board.key)),el('span',s(board.key==='all'?'radar.all':'boards.t_'+board.key)),
        // Archive counts cover the current server query only; don't imply other categories are empty.
        state.mode==='archive'?null:el('span.radar-count',hasError?'—':String(count))));
    }
    if(focusedBoard)nav.querySelector('[data-board="'+focusedBoard+'"]')?.focus({preventScroll:true});
    for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.dataset.mode===state.mode));
    dayField.hidden=state.mode!=='recent';dateFields.hidden=state.mode==='recent';
    guide.hidden=state.board==='all';
    clear(guide);guide.append(el('strong',s(state.board==='all'?'radar.guide_title':'boards.t_'+state.board)),
      el('p',s('radar.guide_'+state.board)));
    const stocks=new Set(shown.filter(r=>r.kind!=='nvdev').map(r=>r.ticker).filter(Boolean)).size;
    summary.textContent=pending?s('common.loading'):s('radar.result_count',{n:shown.length,stocks});
    note.textContent=s(state.mode==='recent'?(recent.length>=200?'radar.recent_capped':'radar.recent_scope'):
      state.mode==='excerpts'?'boards.history_note':cursor?'radar.archive_scope':'radar.archive_complete');
    renderCoverage();
    clear(rows);
    if(hasError)rows.append(el('div.radar-empty',el('strong',s('boards.load_error')),
      el('button.btn.btn-ghost',{type:'button',onclick:()=>state.mode==='archive'?loadArchive(!archived.length):location.reload()},s('common.retry'))));
    if(!shown.length && !pending && recentReady && !hasError)rows.append(el('div.radar-empty',icon(BOARDS.find(b=>b.key===state.board)?.icon || (state.board==='all'?'boards':state.board)),
      el('h3',s('radar.no_match')),el('p.muted',s(missingCount && state.content==='readable'?'radar.missing_count':'radar.no_match_hint',{n:missingCount})),
      missingCount && state.content==='readable'?el('button.btn.btn-ghost',{type:'button',onclick:()=>{content.value='all';apply();}},s('radar.show_missing')):null,
      el('button.btn.btn-ghost',{type:'button',onclick:()=>{if(state.mode==='recent'){state.mode='archive';start.value='';end.value='';apply();}else reset();}},s(state.mode==='recent'?'radar.mode_archive':'radar.reset')),
      state.mode==='recent' && excerpts.some(r=>state.board==='all' || r.board===state.board)?el('button.btn.btn-ghost',{type:'button',onclick:()=>{state.mode='excerpts';apply();}},s('radar.mode_excerpts')):null));
    function appendRecords(host,items){
      let day='';for(const row of items){const next=(row.ts || '').slice(0,10);if(next!==day){day=next;host.append(el('h3.radar-day',day+' UTC'));}host.append(itemRow(row));}
    }
    const background=state.board==='all'?shown.filter(r=>r.kind==='nvdev'):[];
    appendRecords(rows,background.length?shown.filter(r=>r.kind!=='nvdev'):shown);
    if(background.length){
      const group=el('details.radar-background',el('summary',s('radar.industry_group',{n:background.length})),el('p.muted',s('radar.industry_note')));
      appendRecords(group,background);rows.append(group);
    }
    more.hidden=state.mode!=='archive' || (!cursor && !pending) || failed;more.disabled=pending;
  }
  function renderCoverage(){
    clear(coverage);
    if(!Array.isArray(coverageDoc?.sources))return;
    coverage.append(el('summary.radar-coverage-title',el('strong',s('radar.coverage')),el('span.muted',s('radar.coverage_total',{n:coverageDoc.sources.reduce((n,r)=>n+r.records,0)}))));
    const grid=el('div.radar-coverage-grid');
    for(const src of coverageDoc.sources.filter(r=>r.source!=='insider-feed')){
      const key=src.kind==='political'?'political':src.kind;
      const latest=src.source==='insider-bulk'?coverageDoc.sources.find(r=>r.source==='insider-feed'):src;
      const status=['ok','empty'].includes(latest?.status)?s('radar.sync_ok'):latest?.status==='not_started'?s('radar.sync_pending'):s('radar.sync_partial');
      const button=el('button.radar-coverage-card',{type:'button',onclick:()=>{
        state.mode='archive';state.board=key;query.value='';ticker.value='';direction.value='';start.value='';end.value='';apply();
      }},el('strong',s('boards.t_'+key)),el('span.radar-coverage-number',s('radar.coverage_records',{n:src.records})),
      el('span.muted',(src.first_date || '—').slice(0,10)+' → '+(src.last_date || '—').slice(0,10)),
      el('span',status+(latest?.last_attempt?' · '+dateTime(latest.last_attempt):'')),
      src.gap_count?el('small.muted',s(src.source==='insider-bulk'?'radar.sec_gap':src.source==='house'?'radar.house_gap':'radar.coverage_gaps',{n:src.gap_count})):null);
      grid.append(button);
    }
    coverage.append(el('p.muted',s('radar.coverage_note')),grid);
  }
  function showPelosi(){state.mode='archive';state.board='political';query.value='Pelosi';ticker.value='';direction.value='';start.value='';end.value='';apply();}
  function itemRow(it){
    const board=boardOf(it), tk=String(it.ticker || '').toUpperCase();
    const kind=it.archived?s('boards.t_'+board):s('radar.kind_'+it.kind);
    const body=(LANG==='en'?it.extra?.message_en:null) || it.extra?.message_text || '';
    const label=String((LANG==='en'?it.extra?.summary_en:null) || it.summary || body || s('radar.body_missing')).trim();
    const wrap=el('article.radar-record',{'data-record-id':it.id || '',class:!readable(it)?'radar-record-missing':''});
    const detail=el('div.radar-detail',{id:'radar-detail-'+(++detailId),hidden:true});
    const disclosure=el('span.radar-disclosure',s('boards.expand'));
    const title=el('button.radar-record-toggle',{type:'button','aria-expanded':'false','aria-controls':detail.id},
      el('span.radar-record-meta',el('strong.radar-ticker',it.kind==='nvdev'?s('radar.industry_label'):tk?'$'+tk:s(['liquidity','digest'].includes(board)?'radar.market_wide':'radar.no_ticker')),
        el('span.radar-kind',kind),el('time.muted',{datetime:it.ts},it.extra?.date_precision==='day'?String(it.ts || '').slice(0,10):String(it.ts || '').slice(11,16)+' UTC')),
      el('span.radar-record-title',label),
      el('span.radar-record-footer',el('span.radar-status',s(it.provenance?'radar.source_archive':it.kind==='nvdev'?'radar.mapping_unverified':it.archived?'boards.history':body?'radar.body_available':readable(it)?'radar.summary_only':'radar.body_missing')),disclosure));
    title.addEventListener('click',()=>{const open=detail.hidden;detail.hidden=!open;title.setAttribute('aria-expanded',String(open));disclosure.textContent=s(open?'boards.collapse':'boards.expand');wrap.classList.toggle('open',open);});
    if(it.kind==='nvdev')detail.append(el('p.radar-receipt-note',s('radar.mapping_note',{ticker:tk || '—'})));
    if(it.archived)detail.append(el('p.radar-receipt-note',s('boards.history_note')));
    detail.append(el('h4',s(it.provenance?'radar.source_summary':it.archived?'boards.history':body?'radar.original_message':'radar.saved_summary')),el('div.radar-message',body || label));
    if(it.extra?.message_truncated)detail.append(el('p.muted',s('boards.truncated')));
    if(!body && !it.archived)detail.append(el('p.muted',s('radar.body_note')));
    detail.append(el('div.radar-detail-facts',el('span',s('boards.recorded_at')),el('strong',dateTime(it.observed_at || it.ts)),
      el('span',s('radar.record_type')),el('strong',kind)),el('p.radar-time-note.muted',s(it.provenance?'radar.backfill_note':'boards.timestamp_note')));
    if(it.provenance)detail.append(el('div.radar-detail-facts',el('span',s('radar.event_date')),el('strong',it.event_date || '—'),el('span',s('radar.published_date')),el('strong',String(it.ts || '').slice(0,10))));
    if(!it.archived && !it.provenance){
      detail.append(el('h4',s('radar.follow_up')));
      if(it.base_d)detail.append(el('p.muted',s('creators.base_close')+' '+it.base_d+' · '+px(it.base_px)),
        el('div.study-results',...[1,5,20].map(n=>metric(s('creators.trading_days',{n}),pct(it['ret_'+n+'d']),it['ret_'+n+'d']))),el('p.radar-time-note.muted',s('boards.outcome_method')));
      else detail.append(el('p.muted',s(state.mode==='recent'?'radar.outcome_history':'radar.outcome_missing')));
    }
    const actions=el('div.radar-record-actions');
    if(tk && it.kind!=='nvdev'){actions.append(el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+encodeURIComponent(tk)},s('radar.chart')),
      el('a.btn.btn-ghost.btn-sm',{href:'#/alerts?ticker='+encodeURIComponent(tk)},s('boards.set_alert')));}
    let source=false;
    try{const url=new URL(it.extra?.source_url || it.extra?.url || it.source_url);if(url.protocol==='https:'){
      source=true;actions.append(el('a.btn.btn-ghost.btn-sm',{href:url.href,target:'_blank',rel:'noopener noreferrer'},s(it.archived?'radar.reference_link':'boards.source')+' ↗'));}}
    catch{}
    if(!source)detail.append(el('p.radar-time-note.muted',s('radar.source_missing')));
    if(state.mode==='recent')actions.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{
      state.mode='archive';state.board=board || 'all';ticker.value=tk;query.value='';start.value='';end.value='';apply();
    }},s('radar.related_history')));
    detail.append(actions);wrap.append(title,detail);return wrap;
  }
}
