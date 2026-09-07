import { el, pct, px } from './ui.js';
import { s, LANG } from './strings.js';

const finite = n => typeof n === 'number' && Number.isFinite(n);
export const weighted = row => row.market_cap_status === 'ready' && finite(row.market_cap) && row.market_cap > 0 && row.security_type !== 'ETF';
export function capText(value) {
  return finite(value) && value > 0 ? new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US', {notation:'compact', maximumFractionDigits:1}).format(value) : '—';
}
export function changeClass(value) { return !finite(value) ? 'unknown' : value > 0 ? 'up' : value < 0 ? 'down' : 'flat'; }

// Squarify at the actual container aspect ratio. Exact area ratios; no minimum
// cell area or investment weighting change is used to make names fit.
export function treemap(rows, width=1000, height=600) {
  const items=rows.filter(weighted).sort((a,b)=>b.market_cap-a.market_cap || a.ticker.localeCompare(b.ticker));
  const total=items.reduce((sum,r)=>sum+r.market_cap,0),out=[];
  if(!total||width<=0||height<=0)return out;
  const scaled=items.map(r=>({row:r,area:r.market_cap/total*width*height}));
  let x=0,y=0,w=width,h=height,group=[];
  const worst=(list,side)=>{const areas=list.map(r=>r.area),sum=areas.reduce((a,b)=>a+b,0);return Math.max(side*side*Math.max(...areas)/(sum*sum),sum*sum/(side*side*Math.min(...areas)));};
  function place(list) {
    const area=list.reduce((sum,r)=>sum+r.area,0);
    if(w>=h){const dw=area/h;let dy=y;for(const r of list){const dh=r.area/dw;out.push({...r.row,x,y:dy,w:dw,h:dh});dy+=dh;}x+=dw;w-=dw;}
    else{const dh=area/w;let dx=x;for(const r of list){const dw=r.area/dh;out.push({...r.row,x:dx,y,w:dw,h:dh});dx+=dw;}y+=dh;h-=dh;}
  }
  for(const item of scaled){const side=Math.min(w,h);if(group.length&&worst([...group,item],side)>worst(group,side)){place(group);group=[];}group.push(item);}
  if(group.length)place(group);
  return out;
}

const mapRows=new WeakMap(),mapSizes=new WeakMap();
export function layoutOverview(root) {
  const map=root.querySelector('.watch-treemap');if(!map)return;
  const {width,height}=map.getBoundingClientRect();if(!width||!height)return;
  if(mapSizes.get(map)===width+':'+height)return;
  mapSizes.set(map,width+':'+height);
  const tiles=treemap(mapRows.get(map)||[],width,height),nodes=new Map([...map.children].map(node=>[node.dataset.open,node]));
  // Batch writes, then measure natural labels once. Resize never fetches data or
  // replaces focused controls, and a same-size observation is a no-op.
  for(const r of tiles){const node=nodes.get(r.ticker);Object.assign(node.style,{left:r.x/width*100+'%',top:r.y/height*100+'%',width:r.w/width*100+'%',height:r.h/height*100+'%'});node.classList.toggle('compact',r.w<90||r.h<62);}
  const tiny=tiles.map(r=>{const node=nodes.get(r.ticker),label=node.querySelector('strong'),style=getComputedStyle(node);return [node,label.scrollWidth>node.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)||label.scrollHeight>node.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)];});
  for(const [node,hidden] of tiny)node.classList.toggle('tiny',hidden);
  const small=root.querySelector('.watch-small-tiles');if(small){let count=0;for(const button of small.querySelectorAll('button')){const node=nodes.get(button.dataset.open);button.hidden=!(node.classList.contains('tiny')||node.classList.contains('compact'));if(!button.hidden)count++;}small.hidden=!count;}
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
    mapRows.set(map,filtered);
    const tiles=treemap(filtered);
    for(const r of tiles) {
      const tile=el('button.watch-tile',{type:'button','data-open':r.ticker, 'aria-label':title(r),
        'aria-pressed':String(selected===r.ticker),title:title(r),class:'watch-'+changeClass(r.change_pct),
        style:{left:r.x/10+'%',top:r.y/6+'%',width:r.w/10+'%',height:r.h/6+'%'},onclick:()=>onSelect(r.ticker)},
        el('strong.mono',r.ticker),
        el('span.mono',pct(r.change_pct,2)),el('span.watch-tile-company',r.company || ''));
      tile.style.setProperty('--strength',String(finite(r.change_pct)?Math.min(1,Math.abs(r.change_pct)/5):0));
      map.append(tile);
    }
    if(tiles.length) root.append(map);
    root.append(el('div.watch-legend',el('span.small',s('watch.map_legend')),
      ...[-5,-2,0,2,5].map(n=>el('span.mono',{class:'watch-'+changeClass(n)},`${n>0?'+':''}${n}%`)),el('span.small.watch-unknown',s('watch.missing_price'))));
    // Every small cell also has an accessible, minimum-size text target.
    if(tiles.length) root.append(el('div.watch-small-tiles',el('span.muted.small',s('watch.small_tiles')),
      ...tiles.map(r=>el('button.btn.btn-ghost.btn-sm.mono',{type:'button','data-open':r.ticker,onclick:()=>onSelect(r.ticker)},r.ticker+' '+pct(r.change_pct,2)))));
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
