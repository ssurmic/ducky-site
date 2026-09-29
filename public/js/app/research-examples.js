import {el,pct} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';

// Where to start: the stocks people are talking about right now, from the saved Reddit ranking
// (GET /radar/social.json, collected off the request path), each opening the stock workspace. A live
// ranking, never a fixed list of old cases; the section stays hidden when the ranking cannot be
// read (plan or outage) so nothing stale takes its place.
const TICKER=/^[A-Z][A-Z0-9.\-]{0,9}$/,LIMIT=6;
const when=value=>{const t=Date.parse(value||'');return Number.isFinite(t)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(t):'—';};

export function starterCards(doc){
  const rows=(Array.isArray(doc?.items)?doc.items:[]).filter(r=>TICKER.test(r?.ticker||'')&&Number.isFinite(r?.rank)).sort((a,b)=>a.rank-b.rank).slice(0,LIMIT);
  // Keep the complete saved overview on demand; attention never supplies a verdict.
  return rows.map(r=>{
    const target='#/stock/'+encodeURIComponent(r.ticker)+'?from=today';
    const company=typeof r.company==='string'?r.company:typeof r.name==='string'?r.name:'';
    const count=Number.isFinite(r.mentions)&&r.mentions>=0?new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(r.mentions):null;
    const change=Number.isFinite(r.change_pct)?pct(r.change_pct,0):null;
    const description=[count===null?s('explore.mentions_unknown'):s('focus.discover_mentions',{n:count}),
      change===null?s('explore.change_unknown'):s('focus.discover_change',{n:change})].join(' · ');
    const text=r?.overall?.[LANG==='en'?'en':'zh'];
    const overview=typeof text==='string'&&text.trim()?el('details.research-example-view',{'data-reading-key':'discover:'+r.ticker+':overview'},
      el('summary',s('explore.overview')),el('p.research-example-overall',text.trim())):null;
    return el('article.research-example',{'data-ticker':r.ticker},
      el('a.stock-open.research-example-open',{href:target,'data-reading-key':'discover:'+r.ticker,
        'aria-label':'#'+r.rank+' · '+s('explore.research_stock',{ticker:r.ticker})+(company&&company!==r.ticker?' · '+company:''),
        'aria-describedby':'starter-attention-'+r.ticker},
        el('span.research-example-identity',el('span.research-example-rank','#'+r.rank),el('strong.ticker-symbol',r.ticker)),
        company&&company!==r.ticker?el('span.research-example-company',{title:company},company):null,
        el('span.research-example-attention',{'aria-hidden':'true'},el('span.research-example-count',count??'—'),el('span.research-example-change',change??'—')),
        el('span.research-example-description',{id:'starter-attention-'+r.ticker},description)),
      el('nav.research-example-routes',{'aria-label':s('explore.stock_routes',{ticker:r.ticker})},
        el('a',{href:target+'&tab=evidence','data-reading-key':'discover:'+r.ticker+':map'},s('watch.open_map')),overview));
  });
}

export function discoverStarters({signal}={}){
  const box=el('section.research-examples',{hidden:true,'aria-label':s('focus.discover_title')});
  api.get('/radar/social.json',{signal,silent402:true,observe:false}).then(doc=>{
    if(signal?.aborted||!['ready','stale'].includes(doc?.status))return;
    const cards=starterCards(doc);if(!cards.length)return;
    box.append(el('h2',s('focus.discover_title')),el('p.small.muted',s('explore.discussion_date',{date:when(doc.collected_at)})),
      el('p.research-example-key',el('span',s('explore.comparison_key')),el('span',s('explore.attention_only'))),el('div.research-example-grid',...cards));
    box.hidden=false;
  }).catch(()=>{});
  return box;
}
