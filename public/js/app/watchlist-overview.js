import { el, pct, px } from './ui.js';
import { s, LANG } from './strings.js';

const finite = n => typeof n === 'number' && Number.isFinite(n);
export const weighted = row => row.market_cap_status === 'ready' && finite(row.market_cap) && row.market_cap > 0 && row.security_type !== 'ETF';
export function capText(value) {
  return finite(value) && value > 0 ? new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US', {notation:'compact', maximumFractionDigits:1}).format(value) : '—';
}
export function changeClass(value) { return !finite(value) ? 'unknown' : value > 0 ? 'up' : value < 0 ? 'down' : 'flat'; }

// Balanced, longest-edge subdivision. Exact area ratios; never enlarge small caps.
export function treemap(rows, width=1000, height=600) {
  const out=[];
  function split(items,x,y,w,h) {
    if (!items.length) return;
    if (items.length===1) {out.push({...items[0],x,y,w,h});return;}
    const total=items.reduce((n,r)=>n+r.market_cap,0);
    let cut=1, sum=items[0].market_cap;
    while(cut<items.length-1 && Math.abs(sum+items[cut].market_cap-total/2)<Math.abs(sum-total/2)) sum+=items[cut++].market_cap;
    const ratio=sum/total;
    if(w>=h) {split(items.slice(0,cut),x,y,w*ratio,h);split(items.slice(cut),x+w*ratio,y,w*(1-ratio),h);}
    else {split(items.slice(0,cut),x,y,w,h*ratio);split(items.slice(cut),x,y+h*ratio,w,h*(1-ratio));}
  }
  split(rows.filter(weighted).sort((a,b)=>b.market_cap-a.market_cap || a.ticker.localeCompare(b.ticker)),0,0,width,height);
  return out;
}

export function overviewView(rows, options) {
  const {view,query='',sort='market_cap',selected,session,previous,onSelect}=options;
  const root=el('div.watch-summary');
  const filtered=rows.filter(r=>[r.ticker,r.company,r.label_zh,r.label_en,r.industry].some(x=>String(x || '').toLowerCase().includes(query.trim().toLowerCase())));
  const label=r=>(LANG==='zh'?r.label_zh:r.label_en) || r.industry || (LANG==='zh'?r.sector_zh:r.sector) || s('company.unknown');
  const title=r=>`${r.ticker} · ${r.company || ''} · ${label(r)} · ${pct(r.change_pct,2)} · ${r.price_session || session || '—'} · ${s('watch.cap')}: ${capText(r.market_cap)} ${r.market_cap_currency || ''}`;
  const button=(r,compact=false)=>el('button.watch-row', {type:'button','data-open':r.ticker,
    'aria-pressed':String(selected===r.ticker),title:title(r),onclick:()=>onSelect(r.ticker)},
    el('span.watch-identity',el('strong.mono',r.ticker),el('span.muted.small',r.company || r.ticker),compact?null:el('span.muted.small',label(r))),
    el('span.mono.watch-row-price',px(r.price)),
    el('span.mono.watch-change',{class:'watch-'+changeClass(r.change_pct)},pct(r.change_pct,2)),
    el('span.mono.watch-row-cap',r.security_type==='ETF'?'ETF':capText(r.market_cap)));
  root.append(el('p.muted.small.watch-session',session?s('watch.close_session',{date:session}):s('watch.summary_pending')));
  if(!filtered.length) {root.append(el('p.empty',s('watch.no_match')));return root;}
  if(view==='heatmap') {
    const map=el('div.watch-treemap',{'aria-label':s('watch.view_heatmap')});
    const tiles=treemap(filtered);
    for(const r of tiles) {
      const tile=el('button.watch-tile',{type:'button','data-open':r.ticker, 'aria-label':title(r),
        'aria-pressed':String(selected===r.ticker),title:title(r),class:'watch-'+changeClass(r.change_pct)+(r.w<85||r.h<58?' tiny':''),
        style:{left:r.x/10+'%',top:r.y/6+'%',width:r.w/10+'%',height:r.h/6+'%'},onclick:()=>onSelect(r.ticker)},
        el('strong.mono',r.ticker),el('span.mono',pct(r.change_pct,2)),el('span.watch-tile-company',r.company || ''));
      tile.style.setProperty('--strength',String(finite(r.change_pct)?Math.min(1,Math.abs(r.change_pct)/5):0));
      map.append(tile);
    }
    if(tiles.length) root.append(map);
    root.append(el('div.watch-legend',el('span.small',s('watch.map_legend')),
      ...[-5,-2,0,2,5].map(n=>el('span.mono',{class:'watch-'+changeClass(n)},`${n>0?'+':''}${n}%`)),el('span.small.watch-unknown',s('watch.missing_price'))));
    // Every small cell also has an accessible, minimum-size text target.
    const small=tiles.filter(r=>r.w<85||r.h<58);
    if(small.length) root.append(el('div.watch-small-tiles',el('span.muted.small',s('watch.small_tiles')),
      ...small.map(r=>el('button.btn.btn-ghost.btn-sm.mono',{type:'button','data-open':r.ticker,onclick:()=>onSelect(r.ticker)},r.ticker+' '+pct(r.change_pct,2)))));
    const omitted=filtered.filter(r=>!weighted(r));
    if(omitted.length) root.append(el('section.watch-unweighted',el('h2',s('watch.unweighted')),
      el('p.muted.small',s('watch.unweighted_note')),...omitted.map(r=>button(r,true))));
  } else {
    filtered.sort((a,b)=>sort==='ticker'?a.ticker.localeCompare(b.ticker):
      (finite(b[sort])?b[sort]:-Infinity)-(finite(a[sort])?a[sort]:-Infinity) || a.ticker.localeCompare(b.ticker));
    root.append(el('div.watch-row.watch-columns',el('span',s('watch.stock')),el('span',s('watch.close')),
      el('span',s('watch.day_change')),el('span',s('watch.cap'))),...filtered.map(r=>button(r)));
  }
  const methods=el('details.watch-method',el('summary',s('watch.method')),
    el('p.muted.small',s('watch.method_body',{start:previous || '—',end:session || '—'})));
  for(const r of filtered) methods.append(el('p.small',`${r.ticker} · ${s('watch.cap')}: ${capText(r.market_cap)} ${r.market_cap_currency || ''} · ${s('watch.cap_as_of')}: ${r.market_cap_as_of?.slice(0,10) || '—'}`));
  root.append(methods);
  return root;
}
