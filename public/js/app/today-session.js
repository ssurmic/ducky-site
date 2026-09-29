// Current market overview: one saved snapshot, with independent source clocks.
import {el} from './ui.js';
import {s,LANG} from './strings.js';

const finite=value=>typeof value==='number'&&Number.isFinite(value);
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const instant=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
const nyDay=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const time=value=>instant(value)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{timeZone:'America/New_York',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))+' ET':'—';
const percent=value=>finite(value)?(value>0?'+':'')+value.toFixed(2)+'%':'—';
const INDEXES=['SPY','QQQ','DIA','IWM'];
const TICKERS=new Set([...INDEXES,'XLK','SMH','XLC','XLY','XLP','XLF','XLV','XLE','XLI','XLB','XLU','GLD','SLV','USO','TLT']);

export function currentSession(doc,{now=new Date()}={}){
 const data=doc?.current_session;
 if(data?.schema!=='market-current/1'||!day(data.session)||!Number.isSafeInteger(data.sequence)||data.sequence<0||
   !/^[a-f0-9]{64}$/.test(data.revision_id||'')||!instant(data.published_at)||!instant(data.expires_at)||
   Date.parse(data.published_at)>now.getTime()+5000||Date.parse(data.expires_at)<Date.parse(data.published_at)||
   !['pre','open','post','closed'].includes(data.phase)||!['ready','partial','unavailable'].includes(data.status)||
   !Array.isArray(data.quotes)||data.macro?.schema!=='market-readings/1')return null;
 const stale=data.session!==nyDay(now)||Date.parse(data.expires_at)<=now.getTime();
 return {data,stale};
}

function quoteItem(row,{stale=false}={}){
 const valid=finite(row?.price)&&row.price>0&&instant(row.quote_at)&&instant(row.recorded_at);
 const available=valid&&row.status!=='missing';
 const ticker=row.ticker;
 const item=el('div.today-session-quote',{'data-ticker':ticker},
   el('span.today-session-name',s('today.session_'+ticker)),
   el('span.today-session-symbol',ticker),
   el('strong.mono',{class:available&&finite(row.change_pct)?row.change_pct>0?'pos':row.change_pct<0?'neg':'':''},available?percent(row.change_pct):'—'),
   el('span.today-session-clock',available?time(row.quote_at):s('today.session_missing')));
 if(available&&(stale||row.status!=='current'))item.append(el('span.today-session-saved',s(!stale&&row.status==='session_quote'?'today.session_quote':'today.session_saved_quote')));
 return item;
}

export function sessionOverview(doc,options={}){
 const state=currentSession(doc,options);if(!state)return null;
 const {data,stale}=state;
 const rows=new Map(data.quotes.filter(r=>r&&TICKERS.has(r.ticker)).map(r=>[r.ticker,r]));
 const phase=stale?'saved':data.phase;
 const box=el('section.today-session',{'aria-label':s('today.session_title'),'data-reading-anchor':'macro-current'},
  el('header.today-session-head',el('h2.today-section-title',s('today.session_title')),
   el('span.today-session-phase',s('today.session_phase_'+phase)),el('span.small.muted',data.session)),
  el('div.today-session-indices',...INDEXES.map(ticker=>quoteItem(rows.get(ticker)||{ticker,status:'missing'},state))));
 const text=data.summary?.[LANG==='zh'?'zh':'en'];
 if(typeof text==='string'&&text.trim())box.append(el('p.today-session-summary',text.trim()));
 const coverage=data.coverage||{};
 box.append(el('p.small.muted.today-session-meta',
  s('today.session_updated',{time:time(data.published_at)})+(stale?' · '+s('today.session_stale'):'')));
 if(data.phase==='post')box.append(el('p.small.muted.today-session-meta.today-session-post-basis',s('today.session_post_basis')));
 const details=el('details.today-session-details',{'data-reading-key':'macro-current:details'},
  el('summary',{'data-reading-key':'macro-current:details:toggle'},s('today.session_all')),
  el('p.small.muted',s('today.session_basis')),
  el('div.today-session-all',...[...TICKERS].filter(t=>!INDEXES.includes(t)).map(ticker=>quoteItem(rows.get(ticker)||{ticker,status:'missing'},state))));
 if(Number.isInteger(coverage.current)&&Number.isInteger(coverage.expected))details.append(el('p.small.muted',s('today.session_coverage',{n:coverage.current+(Number.isInteger(coverage.session_quote)?coverage.session_quote:0),total:coverage.expected})));
 const sourceRows=[...rows.values()].filter(r=>r.status!=='missing'&&instant(r.quote_at));
 if(sourceRows.length)details.append(el('p.small.muted',s('today.session_sources',{sources:[...new Set(sourceRows.map(r=>[r.provider,r.feed].filter(Boolean).join(' / ')))].join('; ')})));
 box.append(details);return box;
}

// Historical chart rows remain untouched. Current cards take only this snapshot's metrics.
export function sessionMacro(doc,options={}){
 const state=currentSession(doc,options);if(!state)return doc;
 return {...doc,market_readings:state.data.macro,fear_greed:state.data.fear_greed??null};
}
