export function eventKind(e) {
  const hay=(e.title_en||'')+' '+(e.title||'');
  if(e.type==='earnings') return 'earnings';
  if(e.type==='index_change') return 'index';
  if(e.type==='opex'||e.type==='witching') return e.type;
  if(e.type==='rebal') return /month.end|月末/i.test(hay)?'month_end':'index';
  if(e.type!=='macro') return 'other';
  if(/productivity|生产率|continuing|续请|minutes|纪要|speech|讲话|speaks|testimony/i.test(hay)) return 'other';
  for(const [kind,re] of [
    ['adp',/\bADP\b|小非农/i],['cpi',/\bCPI\b/i],['ppi',/\bPPI\b/i],['pce',/\bPCE\b/i],
    ['nfp',/非农|\bNFP\b|nonfarm|payroll|employment situation/i],['claims',/初请|jobless|claims/i],
    ['retail',/零售|retail/i],['gdp',/\bGDP\b/i],
    ['fomc',/FOMC|利率决议|议息|rate decision|federal funds/i],['pmi',/\bPMI\b|\bISM\b/i]]) if(re.test(hay)) return kind;
  return 'other';
}
export function calendarEventKey(e) {
  if(e.type==='index_change' && (e.event_id || e.id))return 'index_change|'+(e.event_id || e.id);
  const kind=eventKind(e), hay=(e.title_en||e.title||'').trim().toLowerCase();
  const precise=['other','pmi','index'].includes(kind)?hay:kind;
  const issuers=kind==='earnings'?(e.tickers||[]).slice().sort().join(','):'';
  return [e.date,e.type,precise,issuers].join('|');
}

export function calendarTicker(value) {
  const ticker=String(value || '').trim().toUpperCase();
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(ticker)?ticker:'';
}
export function calendarEventTicker(event, preferred='') {
  const tickers=(event.tickers || []).map(calendarTicker).filter(Boolean),scope=calendarTicker(preferred);
  return scope && tickers.includes(scope)?scope:(tickers[0] || '');
}
// Full-day order for the agenda and dialogs; compact previews have their own
// visibility policy below, without changing or filtering the event records.
export function orderCalendarEvents(events,{scopeTicker='',isWatched=()=>false}={}) {
  const scope=calendarTicker(scopeTicker);
  const priority=e=>['holiday','early_close'].includes(e.type)?0:
    scope && calendarEventTicker(e,scope)===scope?1:e.type==='macro'?2:isWatched(e)?3:4;
  return events.map((event,index)=>({event,index,priority:priority(event)}))
    .sort((a,b)=>a.event.date.localeCompare(b.event.date)||a.priority-b.priority||a.index-b.index)
    .map(row=>row.event);
}

// A generic overflow count must never stand in for a watched earnings release.
// Keep session changes, the linked company and ALL watched earnings visible;
// fill spare preview slots from the existing full-day order. Busy days can grow.
export function calendarDayPreview(events,{scopeTicker='',isWatched=()=>false,limit=3}={}) {
  const scope=calendarTicker(scopeTicker);
  const priority=e=>['holiday','early_close'].includes(e.type)?0:
    scope && calendarEventTicker(e,scope)===scope?1:
    e.type==='earnings' && isWatched(e)?2:3;
  const ranked=events.map((event,index)=>({event,index,priority:priority(event)}))
    .sort((a,b)=>a.priority-b.priority||a.index-b.index);
  const count=Math.max(limit,ranked.filter(row=>row.priority<3).length);
  const visible=ranked.slice(0,count).map(row=>row.event);
  const selected=new Set(visible);
  return {visible,hidden:events.filter(event=>!selected.has(event))};
}
