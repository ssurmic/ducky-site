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
    .map(row=>({ticker:row.ticker,rank:row.rank,
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
  const count=Number.isFinite(row.mentions)?new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(row.mentions):'—';
  const change=Number.isFinite(row.attentionChange)?pct(row.attentionChange,0):'—';
  const description=[Number.isFinite(row.mentions)?s('focus.discover_mentions',{n:count}):s('explore.mentions_unknown'),
    Number.isFinite(row.attentionChange)?s('focus.discover_change',{n:change}):s('explore.change_unknown')].join('; ');
  const primary=anchor([
    el('span.explore-stock-identity',el('span.explore-rank',String(row.rank)),el('strong.explore-stock-symbol.ticker-symbol',row.ticker)),
    row.company&&row.company!==row.ticker?el('span.explore-company',{title:row.company},row.company):null,
    el('span.explore-attention',{'aria-hidden':'true'},el('span.explore-mention-count',count),el('span.explore-mention-change',change)),
    el('span.explore-measure-description',{id:'explore-attention-'+row.ticker},description)
  ],target,'stock','explore-stock-open');
  primary.setAttribute('aria-label',s('explore.research_stock',{ticker:row.ticker})+(row.company&&row.company!==row.ticker?' · '+row.company:''));
  // The main link's name is the action; its description retains both measurements for screen readers.
  primary.setAttribute('aria-describedby','explore-attention-'+row.ticker);
  return el('article.explore-stock-row',{'data-ticker':row.ticker},
    primary,
    el('nav.explore-stock-routes',{'aria-label':s('explore.stock_routes',{ticker:row.ticker})},
      anchor(s('explore.metrics_short'),target+'&tab=metrics','metrics'),
      anchor(s('explore.map_short'),target+'&tab=evidence','map')));
}
