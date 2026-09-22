import {el,pct} from './ui.js';
import {s,LANG} from './strings.js';
import {icon} from './icons.js';
import * as api from './api.js';

// Where to start: the stocks people are talking about right now, from the saved Reddit ranking
// (GET /radar/social.json, collected off the request path), each opening its research map. A live
// ranking, never a fixed list of old cases; the section stays hidden when the ranking cannot be
// read (plan or outage) so nothing stale takes its place.
const TICKER=/^[A-Z][A-Z0-9.\-]{0,9}$/,LIMIT=6;
const when=value=>{const t=Date.parse(value||'');return Number.isFinite(t)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(t):'—';};

export function starterCards(doc){
  const rows=(Array.isArray(doc?.items)?doc.items:[]).filter(r=>TICKER.test(r?.ticker||'')&&Number.isFinite(r?.rank)).sort((a,b)=>a.rank-b.rank).slice(0,LIMIT);
  return rows.map(r=>el('a.research-example',{href:'#/evidence/'+encodeURIComponent(r.ticker),'data-ticker':r.ticker,'data-reading-key':'discover:'+r.ticker},icon('evidence'),
    el('strong','#'+r.rank+' · '+r.ticker),
    el('span.small.muted',[Number.isFinite(r.mentions)?s('focus.discover_mentions',{n:new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(r.mentions)}):null,
      Number.isFinite(r.change_pct)?s('focus.discover_change',{n:pct(r.change_pct,0)}):null].filter(Boolean).join(' · ')),
    el('span.example-arrow',{'aria-hidden':'true'},'→')));
}

export function discoverStarters({signal}={}){
  const box=el('section.research-examples',{hidden:true,'aria-label':s('focus.discover_title')});
  api.get('/radar/social.json',{signal,silent402:true,observe:false}).then(doc=>{
    if(signal?.aborted||!['ready','stale'].includes(doc?.status))return;
    const cards=starterCards(doc);if(!cards.length)return;
    box.append(el('h2',s('focus.discover_title')),el('p.small.muted',s('focus.discover_note',{date:when(doc.collected_at)})),el('div.research-example-grid',...cards));
    box.hidden=false;
  }).catch(()=>{});
  return box;
}
