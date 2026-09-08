import {recordDocument, renderDocument, recordHref, REPORT_KINDS} from '../record-format.js';
import {evidenceLink} from '../evidence-link.js';
// Radar reads the shared public ledger. Filters never fetch quotes or run research.
import { s, LANG } from "../strings.js";
import * as api from "../api.js";
import * as store from "../store.js";
import { el, clear, spinner, pct, px } from "../ui.js";
import { icon } from "../icons.js";
import { dateTime, metric } from './creator-research.js';
import { mountScreen } from './signal-screen.js';
import { mountSocial } from './social-tracking.js';
import { selectNavigation } from '../navigation.js';
import {isIndexChange, sourceEventHint, effectiveDate, effectiveTiming} from '../source-event.js';

export const BOARDS = [
  {key:'liquidity', kinds:'liquidity,kindex,macro'},
  {key:'digest', kinds:'digest,market,default,weekpreview'},
  {key:'insider', kinds:'insider,cluster'},
  {key:'partner', kinds:'partner,stake,13f'},
  {key:'political', kinds:'political', icon:'insider'},
  {key:'earnings', kinds:'earnings'},
  {key:'index', kinds:'index', icon:'calendar'},
  {key:'news', kinds:'news', icon:'digest'},
  {key:'hiring', kinds:'hiring'},
  {key:'volscan', kinds:'volscan'},
  {key:'industry', kinds:'nvdev', icon:'partner'},
  {key:'social', kinds:'social', icon:'boards'},
];
const EVENT_BOARDS=BOARDS.filter(b=>!['liquidity','digest','hiring','volscan','social'].includes(b.key));
const REPORT_BOARDS=BOARDS.filter(b=>['liquidity','digest','hiring','volscan'].includes(b.key));
const ALL_KINDS = EVENT_BOARDS.map(b=>b.kinds).join(',');
export const CAP_BANDS={micro:[0,3e8],small:[3e8,2e9],mid:[2e9,1e10],large:[1e10,2e11],mega:[2e11,Infinity]};
const sectorLabel=value=>{const label=s('radar.sector_'+value);return label==='radar.sector_'+value?value:label;};
const boardOf = row => row.board || BOARDS.find(b=>b.kinds.split(',').includes(row.kind))?.key;
const readable = row => Boolean(String(row.summary || '').trim() || String(row.extra?.message_text || '').trim());
function publicationDate(row) {
  const extra=row.extra || {};
  // New records explicitly distinguish source publication from our observation.
  // Only legacy records with no declared basis may use the old date field.
  const declared=Object.hasOwn(extra,'source_published_at')?extra.source_published_at:
    Object.hasOwn(row,'source_published_at')?row.source_published_at:
    extra.publication_basis==='first_observed'?null:
    Object.hasOwn(row,'published_at')?row.published_at:row.ts;
  return typeof declared==='string' && /^\d{4}-\d{2}-\d{2}/.test(declared) && Number.isFinite(Date.parse(declared))
    ?declared.slice(0,10):s('radar.publication_unknown');
}
export function filterRecords(rows, state, now=Date.now()) {
  const query=(state.q || '').trim().toLocaleLowerCase();
  const ticker=(state.ticker || '').trim().replace(/^\$/,'').toUpperCase();
  return rows.filter(row=> {
    if(typeof state.reports==='boolean' && state.board==='all' && (REPORT_KINDS.has(row.kind)||['liquidity','digest','hiring','volscan'].includes(row.board))!==state.reports)return false;
    if(state.board && state.board!=='all' && boardOf(row)!==state.board)return false;
    if(ticker && String(row.ticker || '').toUpperCase()!==ticker)return false;
    if(query && ![row.ticker,row.issuer_name,row.reporter_name,row.company,row.reporter_name?.includes('Oaktree')?'橡树资本':'',row.summary,row.extra?.message_text,row.extra?.message_en,row.extra?.message_zh,row.extra?.summary_en].join(' ').toLocaleLowerCase().includes(query))return false;
    if(state.sector && row.sector!==state.sector)return false;
    if(state.cap==='unknown' && row.market_cap!=null)return false;
    if(CAP_BANDS[state.cap] && !(row.market_cap!=null && row.market_cap>=CAP_BANDS[state.cap][0] && row.market_cap<CAP_BANDS[state.cap][1]))return false;
    if(['insider','cluster'].includes(row.kind) && state.mode!=='excerpts') {
      if(state.purchases==='open_market' && !(row.open_market_value>=200000))return false;
      if(['unverified','private_or_offering'].includes(state.purchases) && !(row.extra?.facts?.purchase_values?.[state.purchases]>0 || state.purchases==='unverified' && !row.extra?.facts?.venue_rule))return false;
    }
    if(state.direction && String(row.direction)!==state.direction)return false;
    if(state.content==='readable' && !readable(row))return false;
    if(state.content==='missing' && readable(row))return false;
    if(state.mode==='recent' && Date.parse(row.ts)<now-Number(state.days || 7)*86400000)return false;
    const day=(row.ts || '').slice(0,10);
    return !(state.start && day<state.start || state.end && day>state.end);
  }).sort((a,b)=>Date.parse(b.ts)-Date.parse(a.ts) || Number(b.id || 0)-Number(a.id || 0));
}
export function archivePath(state, cursor, current=false) {
  const params=new URLSearchParams({kind:BOARDS.find(b=>b.key===state.board)?.kinds || (state.reports?'digest,market,macro,liquidity,kindex,volscan,hiring,weekpreview,default':ALL_KINDS),limit:'40',content:state.content || 'all'});
  for(const key of ['ticker','q','start','end','direction','sector','cap','purchases'])if(state[key])params.set(key,state[key]);
  if(cursor)params.set('before',cursor);
  return (current?'/radar/archive.json?':'/public/radar/archive.json?')+params;
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
  if(params.get('board')==='social')return mountSocial(root,{...route,query:params});
  const reports=store.get('route')?.name==='reports';
  const availableBoards=reports?REPORT_BOARDS:EVENT_BOARDS;
  const currentAccess=store.isPro();
  const readingNow=()=>Date.now()-(currentAccess?0:5*86400000);
  let accessInfo=null;
  const state={reports,mode:['archive','excerpts'].includes(params.get('mode'))?params.get('mode'):'recent',
    board:BOARDS.some(b=>b.key===params.get('board'))?params.get('board'):'all',
    q:params.get('q') || '',ticker:params.get('ticker') || '',
    content:['all','missing'].includes(params.get('content'))?params.get('content'):'readable',
    direction:['-1','0','1'].includes(params.get('direction'))?params.get('direction'):'',
    days:['1','3','7'].includes(params.get('days'))?params.get('days'):'7',
    sector:params.get('sector') || '',cap:params.get('cap') || '',purchases:params.get('purchases') || 'open_market',
    start:params.get('start') || '',end:params.get('end') || ''};
  let coverageDoc=null;
  let recent=[], excerpts=[], archived=[], cursor=null, pending=false, failed=false, recentFailed=false, historyFailed=false;
  let recentDebounce=null;
  let alive=true, requestId=0, archiveCtl=null, recentReady=false;
  const staticCtl=new AbortController(), timer=setTimeout(()=>staticCtl.abort(),15000);
  const card=el('section.boards-view.radar-workspace');root.append(card);
  const header=el('header.radar-heading',el('div',el('h1',s(reports?'nav.reports':'boards.h1')),el('p.muted',s(reports?'reader.library_hint':'radar.subtitle'))),
    el('a.btn.btn-ghost.btn-sm',{href:'#/calendar'},icon('calendar'),s('watch.events')));
  const accessNote=el('div.radar-access-note',el('p',s(currentAccess?'radar.access_current':'radar.access_delayed')),
    currentAccess?null:el('a.btn.btn-ghost.btn-sm',{href:'#/billing'},s('radar.access_upgrade')));
  const screenPanel=el('div.radar-screen-panel');
  const screenEntry=Boolean(params.get('screen') || params.get('screening'));
  const disposeScreen=screenEntry?mountScreen(screenPanel,{signal:route.signal,query:params}):()=>{};
  const starters=el('div.radar-starters',...['liquidity','partner','volscan'].map(key=>el('button.radar-starter',
    {type:'button',onclick:()=>selectBoard(key)},icon(BOARDS.find(b=>b.key===key).icon || key),
    el('span',el('strong.starter-desktop',s('radar.start_'+key)),el('strong.starter-mobile',s('radar.short_'+key)),el('span.muted',s('radar.start_'+key+'_hint'))),el('span',{'aria-hidden':'true'},'↗'))));
  const coverage=el('details.radar-coverage',{'aria-label':s('radar.coverage')});
  const pelosiJump=el('button.btn.btn-ghost.btn-sm.radar-pelosi',{type:'button',onclick:showPelosi},s('radar.pelosi_history'));
  const nav=el('nav.radar-categories',{'aria-label':s('radar.categories')});
  nav.id='radar-categories';
  const categoryLabel=el('span');
  const categoryToggle=el('button.radar-category-toggle',{type:'button','aria-expanded':'false','aria-controls':nav.id,onclick:()=>{
    const open=sidebar.classList.toggle('categories-open');categoryToggle.setAttribute('aria-expanded',String(open));
  }},categoryLabel,el('span',{'aria-hidden':'true'},'⌄'));
  const sidebar=el('aside.radar-sidebar',el('h2',s('radar.categories')),categoryToggle,nav);
  const chooseCategory=key=>{
    if(window.matchMedia?.('(max-width: 720px)').matches){
      sidebar.classList.remove('categories-open');categoryToggle.setAttribute('aria-expanded','false');categoryToggle.focus({preventScroll:true});
    }
    selectBoard(key);
  };
  const tabs=el('div.radar-tabs',{'aria-label':s('radar.record_scope')},...['recent','archive','excerpts'].map(mode=>el('button',
    {type:'button','data-mode':mode,onclick:()=>{state.mode=mode;state.start='';state.end='';start.value='';end.value='';apply();}},s('radar.mode_'+mode))));
  const input=(name,type,placeholder)=>el('input.input',{name,type,placeholder,'aria-label':s('radar.'+name),maxlength:name==='q'?100:12});
  const query=input('q','search',s('radar.search_hint'));query.value=state.q;
  const ticker=input('ticker','search','NVDA');ticker.value=state.ticker;
  const content=el('select.input',{name:'content'},...['readable','all','missing'].map(v=>el('option',{value:v},s('radar.content_'+v))));content.value=state.content;
  const direction=el('select.input',{name:'direction'},...['','1','-1','0'].map(v=>el('option',{value:v},s('radar.direction_'+(v===''?'all':v==='1'?'buy':v==='-1'?'sell':'other')))));direction.value=state.direction;
  const sector=el('select.input',{name:'sector','aria-label':s('radar.sector')},el('option',{value:''},s('radar.sector_all')));
  const cap=el('select.input',{name:'cap','aria-label':s('radar.cap')},...['','micro','small','mid','large','mega','unknown'].map(v=>el('option',{value:v},s('radar.cap_'+(v||'all')))));cap.value=state.cap;
  const purchases=el('select.input',{name:'purchases','aria-label':s('radar.purchases')},...['open_market','all','unverified','private_or_offering'].map(v=>el('option',{value:v},s('radar.purchases_'+v))));purchases.value=state.purchases;
  const days=el('select.input',{name:'days'},...['1','3','7'].map(n=>el('option',{value:n},s('radar.days',{n}))));days.value=state.days;
  const start=el('input.input',{type:'date',name:'start','aria-label':s('radar.start')});start.value=state.start;
  const end=el('input.input',{type:'date',name:'end','aria-label':s('radar.end')});end.value=state.end;
  const field=(name,node)=>el('label.radar-field',el('span',s('radar.'+name)),node);
  const dateFields=el('div.radar-dates',field('start',start),field('end',end));
  const dayField=field('period',days);
  const filterToggle=el('button.radar-filter-toggle',{type:'button','aria-expanded':'false',onclick:()=>{
    const open=filter.classList.toggle('filters-expanded');filterToggle.setAttribute('aria-expanded',String(open));
  }},s('radar.more_filters'));
  const filter=el('form.radar-filters',field('q',query),field('ticker',ticker),filterToggle,el('div.radar-extra',field('sector',sector),field('cap',cap),field('purchases',purchases),field('direction',direction),dayField,field('content',content),dateFields),
    el('div.radar-filter-actions',el('button.btn.btn-primary',{type:'submit'},s('radar.apply')),
    el('button.btn.btn-ghost',{type:'button',onclick:reset},s('radar.reset'))));
  const guide=el('div.radar-guide');
  const advancedActive=['ticker','sector','cap','direction','start','end'].some(key=>state[key]) || state.purchases!=='open_market' || state.content!=='readable' || state.days!=='7';
  filter.classList.toggle('filters-expanded',advancedActive);
  filterToggle.setAttribute('aria-expanded',String(advancedActive));
  const summary=el('div.radar-result-summary',{role:'status','aria-live':'polite'});
  const note=el('p.radar-scope-note.muted');
  const rows=el('div.radar-records');
  const more=el('button.btn.btn-ghost.radar-more',{type:'button',onclick:()=>loadArchive(false)},s('creators.load_more'));
  const main=el('section.radar-main',tabs,guide,filter,summary,rows,more,note);
  // Explicit screening links lead with their destination. Market data arriving later
  // stays below it, so it cannot push the focused form out of the viewport.
  card.append(header,...(currentAccess?[]:[accessNote]),...(screenEntry?[screenPanel]:[]),el('div.radar-layout',sidebar,main),
    ...(screenEntry?[]:[screenPanel]),el('details.radar-browse',el('summary',s('radar.browse_questions')),starters),coverage,pelosiJump);
  if(screenEntry && !route.signal?.aborted && root.isConnected && epoch===store.epoch()){
    const target=screenPanel.querySelector('summary');
    target.focus({preventScroll:true});
    target.scrollIntoView?.({block:'start',behavior:'instant'});
  }
  filter.addEventListener('submit',e=>{e.preventDefault();apply();});
  for(const node of [content,direction,days,start,end,sector,cap,purchases])node.addEventListener('change',apply);
  for(const node of [query,ticker])node.addEventListener('input',()=>{if(state.mode!=='archive')apply();});
  route.signal?.addEventListener('abort',cleanup,{once:true});
  render();rows.append(spinner());
  const recentStart=new Date(readingNow()-7*86400000).toISOString().slice(0,10);
  const recentTask=api.get(archivePath({...state,start:recentStart,end:''},null,currentAccess).replace('limit=40','limit=200'),{auth:currentAccess,signal:staticCtl.signal}).then(doc=>{
    if(!Array.isArray(doc?.items))throw new Error('invalid_response');recent=doc.items;accessInfo=doc.access;
  }).catch(()=>{recentFailed=true;});
  const historyTask=fetch('/radar-history.json',{signal:staticCtl.signal}).then(r=>{if(!r.ok)throw new Error('unavailable');return r.json();}).then(doc=>{
    if(!Array.isArray(doc?.items))throw new Error('invalid_response');
    excerpts=doc.items.map(r=>({...r,id:'example:'+r.id,archived:true,summary:r.summary?.[LANG] || '',extra:{message_text:r.body?.[LANG] || ''}}));
  }).catch(()=>{historyFailed=true;});
  const coverageTask=api.get((currentAccess?'':'/public')+'/radar/coverage.json',{auth:currentAccess,signal:staticCtl.signal}).then(doc=>{coverageDoc=doc;}).catch(()=>{});
  const facetsTask=api.get((currentAccess?'':'/public')+'/radar/facets.json',{auth:currentAccess,signal:staticCtl.signal}).then(doc=>{
    for(const v of [...new Set([state.sector,...(doc.sectors||[])])].filter(Boolean))sector.append(el('option',{value:v},s('radar.sector_'+v)===('radar.sector_'+v)?v:s('radar.sector_'+v)));
    sector.value=state.sector;
  }).catch(()=>{if(state.sector){sector.append(el('option',{value:state.sector},state.sector));sector.value=state.sector;}});
  await Promise.all([recentTask,historyTask,coverageTask,facetsTask]);clearTimeout(timer);
  if(!alive || epoch!==store.epoch())return cleanup;
  recentReady=true;
  if(state.mode==='archive')await loadArchive(true);else render();
  return cleanup;

  function cleanup(){disposeScreen();clearTimeout(recentDebounce);alive=false;requestId++;archiveCtl?.abort();staticCtl.abort();clearTimeout(timer);}
  function persist(){const p=new URLSearchParams();for(const [k,v] of Object.entries(state))if(v && k!=='reports')p.set(k,v);history.replaceState(null,'','#/'+(reports?'reports':'boards')+'?'+p);selectNavigation(reports?'reports':'boards',p);}
  function readFilters(){state.q=query.value.trim();state.ticker=ticker.value.trim().toUpperCase().replace(/^\$/,'');state.content=content.value;state.direction=direction.value;state.sector=sector.value;state.cap=cap.value;state.purchases=purchases.value;state.days=days.value;state.start=start.value;state.end=end.value;}
  function apply(){
    readFilters();end.setCustomValidity(state.start && state.end && state.start>state.end?s('radar.date_error'):'');
    if(!filter.reportValidity())return;persist();
    if(state.mode==='archive')loadArchive(true);else{requestId++;archiveCtl?.abort();pending=false;failed=false;render();
      clearTimeout(recentDebounce);if(state.mode==='recent' && recentReady)recentDebounce=setTimeout(loadRecent,180);}
  }
  function selectBoard(key){
    if(!availableBoards.some(b=>b.key===key) && key!=='all'){location.hash='#/'+(['liquidity','digest','hiring','volscan'].includes(key)?'reports':'boards')+'?board='+key;return;}if(key==='social'){location.hash='#/boards?board=social';return;}state.board=key;apply();}
  function reset(){state.board='all';query.value='';ticker.value='';content.value='readable';direction.value='';sector.value='';cap.value='';purchases.value='open_market';days.value='7';start.value='';end.value='';apply();}
  async function loadRecent(){
    const token=++requestId;archiveCtl?.abort();archiveCtl=new AbortController();
    const options={...state,start:new Date(readingNow()-Number(state.days)*86400000).toISOString().slice(0,10),end:''};
    const url=archivePath(options,null,currentAccess).replace('limit=40','limit=200');pending=true;render();
    try{const doc=await api.get(url,{auth:currentAccess,signal:archiveCtl.signal});
      if(!alive || token!==requestId || epoch!==store.epoch())return;
      if(!Array.isArray(doc.items)||doc.filter_version!==3)throw new Error('unsupported_filters');
      recent=doc.items;recentFailed=false;accessInfo=doc.access;
    }catch{if(token===requestId)recentFailed=true;}
    finally{if(alive&&token===requestId){pending=false;render();}}
  }
  async function loadArchive(resetPage){
    if(!resetPage && pending)return;
    if(resetPage){archiveCtl?.abort();archived=[];cursor=null;}
    const token=++requestId;archiveCtl=new AbortController();pending=true;failed=false;render();
    try{
      const doc=await api.get(archivePath(state,cursor,currentAccess),{auth:currentAccess,signal:archiveCtl.signal});
      if(!alive || token!==requestId || epoch!==store.epoch())return;
      if(!Array.isArray(doc?.items) || (![2,3].includes(doc.filter_version) && (state.q || state.start || state.end || state.content!=='all')))throw new Error('invalid_response');
      if((state.cap || state.sector || state.purchases!=='all') && doc.filter_version!==3)throw new Error('unsupported_filters');
      const seen=new Set(archived.map(r=>r.id));archived.push(...doc.items.filter(r=>!seen.has(r.id)));
      cursor=doc.next_cursor || null;
      accessInfo=doc.access;
    }catch{if(token===requestId)failed=true;}
    finally{if(alive && token===requestId && epoch===store.epoch()){pending=false;render();}}
  }
  function render(){
    if(!alive)return;
    categoryLabel.textContent=s('radar.categories')+' · '+s(state.board==='all'?'radar.all':'boards.t_'+state.board);
    const source=state.mode==='recent'?recent:state.mode==='excerpts'?excerpts:archived;
    const shown=filterRecords(source,state,readingNow()), available=filterRecords(source,{...state,board:'all'},readingNow());
    const missingCount=filterRecords(source,{...state,content:'missing'},readingNow()).length;
    const hasError=state.mode==='recent'?recentFailed:state.mode==='excerpts'?historyFailed:failed;
    const focusedBoard=nav.contains(document.activeElement)?document.activeElement.dataset.board:null;
    clear(nav);
    for(const board of [{key:'all'},...availableBoards]){
      const count=board.key==='all'?available.length:available.filter(r=>boardOf(r)===board.key).length;
      nav.append(el('button.radar-category',{type:'button','aria-pressed':String(board.key===state.board),'data-board':board.key,onclick:()=>chooseCategory(board.key)},
        icon(board.icon || (board.key==='all'?'boards':board.key)),el('span',s(board.key==='all'?'radar.all':'boards.t_'+board.key)),
        // Archive counts cover the current server query only; don't imply other categories are empty.
        state.mode!=='excerpts'?null:el('span.radar-count',hasError?'—':String(count))));
    }
    if(focusedBoard)nav.querySelector('[data-board="'+focusedBoard+'"]')?.focus({preventScroll:true});
    for(const tab of tabs.children)tab.setAttribute('aria-pressed',String(tab.dataset.mode===state.mode));
    dayField.hidden=state.mode!=='recent';dateFields.hidden=state.mode==='recent';
    guide.hidden=state.board==='all';
    pelosiJump.hidden=state.board!=='political';
    guide.dataset.board=state.board;
    if(state.board==='all')main.append(guide);else filter.before(guide);
    clear(guide);guide.append(el('strong',s(state.board==='all'?'radar.guide_title':'boards.t_'+state.board)),
      el('p',s('radar.guide_'+state.board)));
    if(['all','insider'].includes(state.board))guide.append(el('details.radar-purchase-rule',el('summary',s('market.details')),el('p',s('radar.purchase_rule'))));
    guide.hidden=state.board==='all' && state.purchases==='all';
    const stocks=new Set(shown.filter(r=>r.kind!=='nvdev').map(r=>r.ticker).filter(Boolean)).size;
    summary.textContent=pending?s('common.loading'):s(reports?'reader.report_count':'radar.result_count',{n:shown.length,stocks});
    accessNote.querySelector('p').textContent=s(currentAccess?'radar.access_current':'radar.access_delayed')+
      (!currentAccess && accessInfo?.available_before?' '+s('radar.access_cutoff',{date:dateTime(accessInfo.available_before)}):'');
    note.textContent=s(state.mode==='recent'?(recent.length>=200?'radar.recent_capped':'radar.recent_scope'):
      state.mode==='excerpts'?'boards.history_note':cursor?'radar.archive_scope':'radar.archive_complete');
    renderCoverage();
    clear(rows);
    if(hasError)rows.append(el('div.radar-empty',el('strong',s('boards.load_error')),
      el('button.btn.btn-ghost',{type:'button',onclick:()=>state.mode==='archive'?loadArchive(!archived.length):location.reload()},s('common.retry'))));
    if(!shown.length && !pending && recentReady && !hasError)rows.append(el('div.radar-empty',icon(BOARDS.find(b=>b.key===state.board)?.icon || (state.board==='all'?'boards':state.board)),
      el('h3',s('radar.no_match')),el('p.muted',s(missingCount && state.content==='readable'?'radar.missing_count':'radar.no_match_hint',{n:missingCount})),
      missingCount && state.content==='readable'?el('button.btn.btn-ghost',{type:'button',onclick:()=>{content.value='all';apply();}},s('radar.show_missing')):null,
      ['all','insider'].includes(state.board) && state.purchases!=='all'?el('button.btn.btn-ghost',{type:'button',onclick:()=>{purchases.value='all';apply();}},s('radar.purchases_all')):null,
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
    coverage.hidden=!Array.isArray(coverageDoc?.sources);
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
}

export function itemRow(it, {standalone=false, language=LANG}={}){

    const board=boardOf(it), tk=String(it.ticker || '').toUpperCase();
    const sourceEvent=it.extra || {}, indexChange=isIndexChange(sourceEvent), eventMeaning=sourceEventHint(sourceEvent);
    const provenance=String(it.provenance || '').toLowerCase();
    const timeNote=provenance==='live'?'radar.observation_note':provenance==='source_revision'?'radar.revision_note':
      provenance==='source_corroboration'?'radar.corroboration_note':provenance?'radar.backfill_note':'boards.timestamp_note';
    const kind=it.archived?s('boards.t_'+board):s('radar.kind_'+it.kind);
    const doc=recordDocument(it,language), body=doc.hasBody?doc.raw:'';
    const label=doc.lead || s('radar.body_missing');
    const wrap=el('article.radar-record',{'data-record-id':it.id || '',class:!readable(it)?'radar-record-missing':''});
    const detail=el('div.radar-detail');
    const disclosure=el('span.radar-disclosure',s('reader.open')+' ↗');
    const title=el(standalone?'header.record-heading':'a.radar-record-toggle',standalone?{}:{href:recordHref(it)},
      el(standalone?'div.radar-record-meta':'span.radar-record-meta',el(standalone?'h1.radar-ticker':'strong.radar-ticker',doc.title),
        kind===doc.title?null:el('span.radar-kind',kind),el('time.muted',{datetime:it.ts},it.extra?.date_precision==='day'?String(it.ts || '').slice(0,10):standalone?dateTime(it.ts):String(it.ts || '').slice(11,16)+' UTC')),
      (it.issuer_name || it.company)?el('span.radar-company-name',it.issuer_name || it.company):null,
      it.reporter_name?el('span.radar-reporter',s('radar.reporter')+' · '+it.reporter_name):null,
      standalone?null:el('span.radar-record-title',label),
      indexChange?el('span.radar-company-meta',s('event.effective_date')+' · '+effectiveTiming(sourceEvent)):null,
      (it.sector || it.market_cap)?el('span.radar-company-meta',[it.sector?sectorLabel(it.sector):'',it.market_cap?s('radar.cap_value',{value:new Intl.NumberFormat(LANG==='en'?'en-US':'zh-CN',{notation:'compact',maximumFractionDigits:1,style:'currency',currency:'USD'}).format(it.market_cap)}):''].filter(Boolean).join(' · ')):null,
      standalone?null:el('span.radar-record-footer',disclosure));
    if(!standalone){wrap.append(title);return wrap;}
    if(it.kind==='nvdev')detail.append(el('p.radar-receipt-note',s('radar.mapping_note',{ticker:tk || '—'})));
    if(it.archived)detail.append(el('p.radar-receipt-note',s('boards.history_note')));
    detail.append(renderDocument(doc));
    if(body)detail.append(el('details.record-original',el('summary',s('reader.original')),el('pre',body),it.extra?.translation_recorded_at?el('p.muted.small',s('reader.translation_time',{date:dateTime(it.extra.translation_recorded_at)})):null));
    if(!it.provenance && body)detail.append(el('p.radar-time-note.muted',s('radar.receipt_basis')));
    if(eventMeaning)detail.append(el('p.radar-event-meaning',eventMeaning));
    if(it.identity_status==='sec_current')detail.append(el('p.radar-time-note.muted',s('radar.identity_repaired',{date:String(it.identity_as_of||'').slice(0,10)})));
    if(it.issuer_name || it.reporter_name || it.sector || it.market_cap){
      const facts=el('dl.radar-company-facts');
      for(const [key,value] of [['issuer',it.issuer_name||it.company],['reporter',it.reporter_name],['sector',it.sector?sectorLabel(it.sector):null],['cap',it.market_cap?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(it.market_cap):null]])if(value)facts.append(el('dt',s('radar.'+key)),el('dd',value));
      detail.append(facts);
      if(it.company_as_of)detail.append(el('p.muted.small',s('radar.company_as_of',{date:dateTime(it.company_as_of)})));
    }
    if(['insider','cluster'].includes(it.kind)){
      const values=it.extra?.facts?.purchase_values||{};
      detail.append(el('p.radar-purchase-rule',s('radar.purchase_rule')));
      for(const [venue,value] of Object.entries(values))if(value>0)detail.append(el('p.small',s('radar.purchases_'+venue)+' · '+px(value)));
      const evidence=el('details.radar-venue-evidence',el('summary',s('radar.venue_evidence')));
      const notes=new Map();for(const txn of it.extra?.facts?.transactions||[])for(const note of txn.venue_evidence||[])notes.set(note.id,note.text);
      for(const [id,text] of notes)evidence.append(el('p.small',id+' · '+text));
      if(notes.size)detail.append(evidence);
    }
    if(doc.truncated)detail.append(el('p.muted',s('boards.truncated')));
    if(!body && !it.archived)detail.append(el('p.muted',s('radar.body_note')));
    detail.append(el('div.radar-detail-facts',el('span',s('boards.recorded_at')),el('strong',dateTime(it.observed_at || it.ts)),
      el('span',s('radar.record_type')),el('strong',kind)),el('p.radar-time-note.muted',s(timeNote)));
    if(it.provenance)detail.append(el('div.radar-detail-facts',el('span',s('radar.event_date')),el('strong',it.event_date || '—'),el('span',s('radar.published_date')),el('strong',publicationDate(it))));
    if(!it.archived && !it.provenance){
      detail.append(el('h4',s('radar.follow_up')));
      if(it.base_d)detail.append(el('p.muted',s('creators.base_close')+' '+it.base_d+' · '+px(it.base_px)),
        el('div.study-results',...[1,5,20].map(n=>metric(s('creators.trading_days',{n}),pct(it['ret_'+n+'d']),it['ret_'+n+'d']))),el('p.radar-time-note.muted',s('boards.outcome_method')));
      else detail.append(el('p.muted',s('radar.outcome_missing')));
    }
    const actions=el('div.radar-record-actions');
    if(tk && it.kind!=='nvdev'){actions.append(evidenceLink(tk,it.id),el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+encodeURIComponent(tk)},s('radar.chart')),
      el('a.btn.btn-ghost.btn-sm',{href:'#/alerts?ticker='+encodeURIComponent(tk)},s('boards.set_alert')));}
    if(tk && ['index','news'].includes(it.kind)){
      const query=new URLSearchParams({ticker:tk}),day=effectiveDate(sourceEvent);
      if(day)query.set('date',day);
      actions.append(el('a.btn.btn-ghost.btn-sm',{href:'#/research/'+encodeURIComponent(tk)},s('watch.research_record')),
        el('a.btn.btn-ghost.btn-sm',{href:'#/calendar?'+query},s(indexChange?'radar.effective_calendar':'radar.stock_calendar')));
    }
    if(it.issuer_cik)actions.append(el('a.btn.btn-ghost.btn-sm',{href:'https://www.sec.gov/edgar/browse/?CIK='+encodeURIComponent(it.issuer_cik),target:'_blank',rel:'noopener noreferrer'},s('radar.issuer_filings')+' ↗'));
    if(it.company_source)actions.append(el('a.btn.btn-ghost.btn-sm',{href:it.company_source,target:'_blank',rel:'noopener noreferrer'},s('radar.company_profile')+' ↗'));
    let source=false;
    try{const url=new URL(it.extra?.source_url || it.extra?.url || it.source_url);if(url.protocol==='https:'){
      source=true;actions.append(el('a.btn.btn-ghost.btn-sm',{href:url.href,target:'_blank',rel:'noopener noreferrer'},s(it.archived?'radar.reference_link':'boards.source')+' ↗'));}}
    catch{}
    if(!source)detail.append(el('p.radar-time-note.muted',s('radar.source_missing')));
    detail.append(actions);wrap.append(title,detail);return wrap;
  }
