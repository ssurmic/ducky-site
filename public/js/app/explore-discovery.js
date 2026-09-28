import {el,pct} from './ui.js';
import {s,LANG} from './strings.js';
import {stockHref} from './stock-reading.js';

const TICKER=/^[A-Z][A-Z0-9.\-]{0,9}$/;
// Presentation of the existing saved discussion ranking, not a new stock screen or price model.
export function discoveryRows(doc,lang=LANG){
  if(!['ready','stale'].includes(doc?.status))return [];
  const seen=new Set();
  return (Array.isArray(doc?.items)?doc.items:[])
    .filter(row=>row&&TICKER.test(row.ticker||'')&&Number.isInteger(row.rank)&&row.rank>0)
    .sort((a,b)=>a.rank-b.rank)
    .filter(row=>{if(seen.has(row.ticker))return false;seen.add(row.ticker);return true;})
    .slice(0,6).map(row=>({ticker:row.ticker,rank:row.rank,
      company:typeof row.company==='string'?row.company:typeof row.name==='string'?row.name:'',
      summary:typeof row.overall?.[lang==='en'?'en':'zh']==='string'?row.overall[lang==='en'?'en':'zh'].trim():'',
      mentions:Number.isFinite(row.mentions)&&row.mentions>=0?row.mentions:null,
      attentionChange:Number.isFinite(row.change_pct)?row.change_pct:null}));
}
export function discoveryDate(value){
  const date=Date.parse(value||'');
  return Number.isFinite(date)?new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date):s('explore.date_unknown');
}
export function discoveryStockRow(row){
  const target=stockHref(row.ticker,'explore');
  const anchor=(label,href,key,className='stock-open')=>el('a.'+className,{href,'data-explore-link':row.ticker+':'+key},label);
  return el('article.explore-stock-row',{'data-ticker':row.ticker},
    el('div.explore-stock-identity',el('span.small.muted.explore-rank',String(row.rank).padStart(2,'0')),
      anchor(row.ticker,target,'stock','explore-stock-symbol'),row.company&&row.company!==row.ticker?el('span.small.muted',row.company):null),
    el('div.explore-stock-context',anchor(row.summary||s('explore.open_company'),target,'summary','explore-stock-summary'),
      el('p.small.muted.explore-attention',Number.isFinite(row.mentions)?s('focus.discover_mentions',{n:new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(row.mentions)}):s('explore.mentions_unknown'),
        Number.isFinite(row.attentionChange)?' · '+s('focus.discover_change',{n:pct(row.attentionChange,0)}):null)),
    el('nav.explore-stock-routes',{'aria-label':s('explore.stock_routes',{ticker:row.ticker})},
      anchor(s('explore.overview'),target,'overview'),anchor(s('explore.metrics'),target+'&tab=metrics','metrics'),
      anchor(s('explore.map'),target+'&tab=evidence','map'),
      anchor(s('explore.activity'),'#/boards?ticker='+encodeURIComponent(row.ticker),'activity')));
}
