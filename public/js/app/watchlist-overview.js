import { el, pct, px } from './ui.js';
import { s, LANG } from './strings.js';
import { icon } from './icons.js';
import {metricKeys,metricCell,metricLabel,metricMethods,metricSortValue} from './watchlist-metrics.js';
import {signalKeys,signalCell,signalLabel,signalHelpButton,signalSortValue,signalMethods} from './watchlist-signals.js';

const finite = n => typeof n === 'number' && Number.isFinite(n);
// Keep the newest dated value during provider outages/after the close. Never
// replace a completed day's close with an earlier intraday trade on that day.
export function displayQuote(row, now=Date.now()) {
  const q=row?.quote, at=Date.parse(q?.quote_at);
  if(!q||!['current','stale'].includes(q.status)||!finite(q.price)||q.price<=0||!finite(at)||at>now)return null;
  const session=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
  if(finite(row.price)&&row.price>0&&row.price_session&&session<=row.price_session)return null;
  return q;
}
// Every surface (list rows, map tiles, breadth) shows the same number for a stock.
export const display=row=>displayQuote(row)||row;
// Quote age in seconds. With the server's own age and the moment the response arrived, the
// browser clock only measures time since arrival; otherwise it compares trade clocks directly.
export function quoteAgeSeconds(q, now=Date.now(), received=null) {
  if(finite(q?.age_seconds)&&finite(received)&&received<=now)return q.age_seconds+(now-received)/1000;
  const at=Date.parse(q?.quote_at);
  return finite(at)?Math.max(0,(now-at)/1000):null;
}
export const quoteFresh=(q,age)=>q?.status==='current'&&finite(age)&&age<=180;
export const quoteLabel=(q,age=quoteAgeSeconds(q))=>s(quoteFresh(q,age)?'watch.latest_quote':'watch.saved_quote');
export const quoteTime=q=>new Intl.DateTimeFormat(LANG==='zh'?'zh-CN':'en-US',{
  month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'America/New_York',timeZoneName:'short'}).format(new Date(q.quote_at));
// Relative age up to six hours, then the New York time of the print itself.
export function quoteAgeText(q, age=quoteAgeSeconds(q)) {
  if(!finite(age))return quoteTime(q);
  if(age<60)return s('watch.quote_age_now');
  if(age<3600)return s('watch.quote_age_minutes',{n:Math.floor(age/60)});
  if(age<6*3600)return s('watch.quote_age_hours',{n:Math.floor(age/3600)});
  return quoteTime(q);
}
// One clock line per quote. Data attributes let the view re-time it without a re-render.
export function quoteNote(q, {received=null, tag='small.muted'}={}) {
  const age=quoteAgeSeconds(q,Date.now(),received);
  return el(tag+'.watch-quote-time',{'data-quote-at':q.quote_at,'data-quote-status':q.status||'',
    'data-quote-age':finite(q.age_seconds)?String(q.age_seconds):'','data-quote-received':finite(received)?String(received):'',
    title:[q.provider,q.feed,quoteTime(q)].filter(Boolean).join(' · ')},quoteLabel(q,age)+' · '+quoteAgeText(q,age));
}
export function retimeQuotes(root, now=Date.now()) {
  for(const node of root.querySelectorAll('.watch-quote-time[data-quote-at]')){
    const q={quote_at:node.dataset.quoteAt,status:node.dataset.quoteStatus,age_seconds:node.dataset.quoteAge===''?null:Number(node.dataset.quoteAge)};
    const received=node.dataset.quoteReceived===''?null:Number(node.dataset.quoteReceived);
    const age=quoteAgeSeconds(q,now,received),text=quoteLabel(q,age)+' · '+quoteAgeText(q,age);
    if(node.textContent!==text)node.textContent=text;
  }
}
const retained = row => row.price_status === 'retained';
const savedLabel = row => s('watch.saved_close', {date:row.price_session || '—'});
export const weighted = row => row.market_cap_status === 'ready' && finite(row.market_cap) && row.market_cap > 0 && row.security_type !== 'ETF';
export function capText(value) {
  return finite(value) && value > 0 ? new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US', {notation:'compact', maximumFractionDigits:1}).format(value) : '—';
}
export function changeClass(value) { return !finite(value) ? 'unknown' : value > 0 ? 'up' : value < 0 ? 'down' : 'flat'; }

// The map and its legend use exactly the same scale. Near-flat moves stay close
// to neutral; saturation stops at ±5%, while labels retain the actual return.
export function heatColor(value) {
  if (!finite(value)) return '#35404d';
  const anchors=[[-5,[151,51,72]],[-2,[103,47,63]],[0,[37,49,58]],[2,[34,79,68]],[5,[21,108,82]]];
  const n=Math.max(-5,Math.min(5,value));
  const right=anchors.findIndex(a=>a[0]>=n);
  if(right===0)return 'rgb('+anchors[0][1].join(',')+')';
  const [lo,a]=anchors[right-1],[hi,b]=anchors[right],fraction=(n-lo)/(hi-lo);
  return 'rgb('+a.map((v,i)=>Math.round(v+(b[i]-v)*fraction)).join(',')+')';
}

function breadth(rows) {
  const counts={up:0,down:0,flat:0,unknown:0};
  for(const row of rows)counts[changeClass(display(row).change_pct)]++;
  return el('div.watch-breadth',
    el('div.watch-breadth-labels',...Object.entries(counts).filter(([,n])=>n).map(([kind,n])=>
      el('span',{class:'watch-'+kind},el('i',{'aria-hidden':'true'}),s('watch.breadth_'+kind,{n})))),
    el('div.watch-breadth-bar',{'aria-hidden':'true'},...Object.entries(counts).filter(([,n])=>n).map(([kind,n])=>
      el('span',{class:'watch-'+kind,style:{flex:String(n)}}))));
}

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

const mapRows=new WeakMap(),mapSizes=new WeakMap(),mapInspectors=new WeakMap();
export function layoutOverview(root, force=false) {
  const map=root.querySelector('.watch-treemap');if(!map)return;
  if(map.classList.contains('is-equal')){mapInspectors.get(map)?.resize();return;}
  const {width,height}=map.getBoundingClientRect();if(!width||!height)return;
  if(!force&&mapSizes.get(map)===width+':'+height)return;
  mapSizes.set(map,width+':'+height);
  const tiles=treemap(mapRows.get(map)||[],width,height),nodes=new Map([...map.children].map(node=>[node.dataset.open,node]));
  // Batch writes, then measure natural labels once. Resize never fetches data or
  // replaces focused controls, and a same-size observation is a no-op.
  for(const r of tiles){const node=nodes.get(r.ticker);Object.assign(node.style,{left:r.x/width*100+'%',top:r.y/height*100+'%',width:r.w/width*100+'%',height:r.h/height*100+'%'});node.classList.toggle('compact',r.w<94||r.h<78);node.classList.toggle('roomy',r.w>=230&&r.h>=175);node.style.setProperty('--tile-type',Math.min(34,Math.max(12,Math.min(r.w/6,r.h/5)))+'px');}
  const tiny=tiles.map(r=>{const node=nodes.get(r.ticker),label=node.querySelector('strong'),style=getComputedStyle(node);return [node,label.scrollWidth>node.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)||label.scrollHeight>node.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom)];});
  for(const [node,hidden] of tiny)node.classList.toggle('tiny',hidden);
  mapInspectors.get(map)?.resize();
  const small=root.querySelector('.watch-small-tiles');if(small){let count=0;for(const button of small.querySelectorAll('button')){const node=nodes.get(button.dataset.open);button.hidden=!(node.classList.contains('tiny')||node.classList.contains('compact'));if(!button.hidden)count++;}small.hidden=!count;small.querySelector('.watch-small-count').textContent=String(count);}
}

let tooltipSequence=0;
function mapInspector(frame, label, session) {
  const tip=el('div.watch-map-tooltip',{id:'watch-map-tip-'+(++tooltipSequence),role:'tooltip',hidden:true});
  let active=null,activeRow=null,dismissed=null,touched=null;
  function hide(){tip.hidden=true;active?.removeAttribute('aria-describedby');active=null;}
  function show(row,node,event) {
    if(event?.pointerType==='touch'||dismissed===node)return;
    hide();active=node;activeRow=row;
    const shown=display(row),quote=shown!==row?shown:null;
    tip.replaceChildren(
      el('div.watch-tip-heading',el('strong',row.ticker),el('span.mono',{class:'watch-'+changeClass(shown.change_pct)},pct(shown.change_pct,2))),
      el('div.watch-tip-company',row.company || row.ticker),
      el('div.muted.small',label(row)),
      el('dl.watch-tip-facts',el('dt',quote?quoteLabel(quote):s('watch.close')),el('dd.mono',px(shown.price)),el('dt',s('watch.cap')),el('dd.mono',capText(row.market_cap)+' '+(row.market_cap_currency || ''))),
      el('div.watch-tip-date',quote?quoteAgeText(quote)+' · '+quoteTime(quote):row.price_session || session || s('watch.summary_pending')));
    if(!quote&&retained(row))tip.append(el('p.watch-saved-note',savedLabel(row)),el('p.small',s('watch.retained_note')));
    tip.hidden=false;node.setAttribute('aria-describedby',tip.id);
    const box=frame.getBoundingClientRect(),cell=node.getBoundingClientRect(),rect=tip.getBoundingClientRect();
    const x=event?.clientX ?? cell.left+cell.width/2,y=event?.clientY ?? cell.top+cell.height/2;
    const left=Math.max(8,Math.min(box.width-rect.width-8,x-box.left+16));
    let top=y-box.top+18;
    if(top+rect.height>box.height-8)top=y-box.top-rect.height-18;
    tip.style.left=left+'px';tip.style.top=Math.max(8,Math.min(box.height-rect.height-8,top))+'px';
  }
  frame.addEventListener('pointerleave',()=>{dismissed=null;hide();});
  frame.addEventListener('pointerdown',event=>{touched=event.pointerType==='touch'?event.target.closest('.watch-tile'):null;if(touched)hide();},true);
  frame.addEventListener('keydown',event=>{touched=null;if(event.key==='Escape'){dismissed=active;hide();}});
  return {tip,show,focus(row,node){if(touched!==node)show(row,node);},resize(){if(active)show(activeRow,active);},blur(event){if(touched===event?.target)touched=null;dismissed=null;hide();}};
}

export function overviewView(rows, options) {
  const {view,query='',sort='market_cap',selected,session,previous,onSelect,area='cap',onAreaChange,renderResearch,onSort,selection,signals=null,sortDirection=sort==='ticker'?'asc':'desc',quoteReceived=null}=options;
  const root=el('div.watch-summary');
  const filtered=rows.filter(r=>[r.ticker,r.company,r.label_zh,r.label_en,r.industry].some(x=>String(x || '').toLowerCase().includes(query.trim().toLowerCase())));
  const label=r=>(LANG==='zh'?r.label_zh:r.label_en) || r.industry || (LANG==='zh'?r.sector_zh:r.sector) || s('company.unknown');
  const title=r=>{const d=display(r),quote=d!==r?d:null;return `${r.ticker} · ${r.company || ''} · ${label(r)} · ${pct(d.change_pct,2)} · ${quote?quoteLabel(quote)+' · '+quoteTime(quote):r.price_session || session || '—'} · ${s('watch.cap')}: ${capText(r.market_cap)} ${r.market_cap_currency || ''}${!quote&&retained(r)?' · '+savedLabel(r):''}`;};
  const anyQuote=filtered.some(r=>displayQuote(r));
  const button=(r,compact=false)=>{
    const quote=displayQuote(r);
    const shown=quote||r;
    const cells=compact?[]:metricKeys.map(key=>metricCell(key,r.metrics?.[key]));
    const identity=el('span.watch-identity',el('span.watch-identity-title',el('strong',r.ticker),
      compact?null:el('span.watch-industry',label(r))),el('span.watch-company',r.company || r.ticker),
      compact?null:el('span.watch-stock-cap',s('watch.cap')+' '+(r.security_type==='ETF'?'ETF':capText(r.market_cap))));
    const price=el('span.mono.watch-row-price',px(shown.price),!quote&&retained(r)?el('small.watch-saved-note',s('watch.saved_value')):null);
    const change=el('span.mono.watch-change',{class:'watch-'+changeClass(shown.change_pct)},pct(shown.change_pct,2));
    return el('div.watch-row-entry',{class:compact?'':'watch-rich-entry'},el('button.watch-row', {type:'button','data-open':r.ticker,
      'aria-pressed':String(selected===r.ticker),'aria-label':title(r)+(compact?'':' · '+cells.map(c=>[...c.children].map(n=>n.textContent).join(' · ')).join(' · ')),onclick:()=>onSelect(r.ticker)},
      identity,...cells,...(compact?[price,change,el('span.mono.watch-row-cap',capText(r.market_cap))]:[
        el('span.watch-quote',el('span.watch-metric-label',quote?quoteLabel(quote):s('watch.close')),price,change,
          quote?quoteNote(quote,{received:quoteReceived,tag:'small.watch-metric-note'}):null)])),
      el('a.watch-map-link',{href:'#/evidence/'+encodeURIComponent(r.ticker),'aria-label':s('watch.open_stock_map',{ticker:r.ticker}),'data-map-open':r.ticker,'data-tour':'stock.map','data-ticker':r.ticker},icon('evidence'),el('span',s('watch.open_map'))));
  };
  if(view!=='heatmap')root.append(el('p.muted.small.watch-session',anyQuote?s('watch.mixed_quote_note',{date:session||'—'}):session?s('watch.close_session',{date:session}):s('watch.summary_pending')));
  if(!filtered.length) {root.append(el('p.empty',s('watch.no_match')));return root;}
  if(filtered.some(retained))root.append(el('p.muted.small.watch-retained-note',{role:'status'},s('watch.retained_note')));
  if(view==='heatmap') {
    const panel=el('section.watch-map-panel'),frame=el('div.watch-map-frame');
    panel.append(el('div.watch-map-heading',el('div',el('h2',s('watch.map_title')),
      el('p.muted.small.watch-session',anyQuote?s('watch.mixed_quote_note',{date:session||'—'}):session?s('watch.quote_session',{date:session}):s('watch.summary_pending'))),breadth(filtered)));
    if(onAreaChange)panel.append(el('div.watch-map-scale',{role:'group','aria-label':s('watch.area')},
      ...['equal','cap'].map(mode=>el('button.btn.btn-ghost.btn-sm',{type:'button','data-area':mode,'aria-pressed':String(area===mode),onclick:()=>onAreaChange(mode)},s('watch.area_'+mode)))));
    const map=el('div.watch-treemap',{'aria-label':s('watch.view_heatmap'),class:area==='equal'?'is-equal':''});
    const inspector=mapInspector(frame,label,session);
    mapInspectors.set(map,inspector);
    mapRows.set(map,filtered);
    const tiles=area==='equal'?[...filtered].sort((a,b)=>a.ticker.localeCompare(b.ticker)):treemap(filtered);
    for(const r of tiles) {
      const d=display(r);
      const tile=el('button.watch-tile',{type:'button','data-open':r.ticker, 'aria-label':title(r),
        'aria-pressed':String(selected===r.ticker),class:'watch-'+changeClass(d.change_pct),
        style:area==='equal'?{}:{left:r.x/10+'%',top:r.y/6+'%',width:r.w/10+'%',height:r.h/6+'%'},onclick:()=>onSelect(r.ticker),
        onpointerenter:event=>inspector.show(r,tile,event),
        // Touch also focuses a button. Opening a hover layer at that point can
        // consume the first tap; keyboard focus still gets its full inspector.
        onfocus:()=>inspector.focus(r,tile),onblur:inspector.blur},
        el('span.watch-tile-sector',label(r)),el('strong',r.ticker),
        el('span.mono.watch-tile-change',pct(d.change_pct,2)),el('span.mono.watch-tile-price',px(d.price),d===r&&retained(r)?el('small.watch-saved-note',s('watch.saved_value')):null),el('span.watch-tile-company',r.company || ''),
        el('span.watch-tile-cap',s('watch.cap')+' '+capText(r.market_cap)));
      tile.style.setProperty('--tile-color',heatColor(d.change_pct));
      map.append(tile);
    }
    if(tiles.length){frame.append(map,inspector.tip);panel.append(frame);}
    panel.append(el('div.watch-legend',el('span.small',s(area==='equal'?'watch.equal_legend':'watch.map_legend')),
      el('div.watch-color-scale',...[-5,-2,0,2,5].map(n=>el('span.mono',{style:{background:heatColor(n)}},`${n>0?'+':''}${n}%`))),
      filtered.some(r=>!finite(display(r).change_pct))?el('span.small.watch-legend-missing',s('watch.missing_price')):null));
    // Every small cell also has an accessible, minimum-size text target.
    if(tiles.length&&area!=='equal') panel.append(el('details.watch-small-tiles',{open:true},el('summary',s('watch.small_tiles'),' ',el('span.watch-small-count.mono')),
      el('div.watch-small-list',...tiles.map(r=>el('button.watch-small-stock',{type:'button','data-open':r.ticker,
        'aria-pressed':String(selected===r.ticker),'aria-label':title(r),onclick:()=>onSelect(r.ticker)},
        el('span.watch-small-dot',{'aria-hidden':'true',style:{background:heatColor(display(r).change_pct)}}),
        el('strong',r.ticker),el('span.mono',{class:'watch-'+changeClass(display(r).change_pct)},pct(display(r).change_pct,2)))))));
    root.append(panel);
    const omitted=area==='equal'?[]:filtered.filter(r=>!weighted(r));
    if(omitted.length) root.append(el('section.watch-unweighted',el('h2',s('watch.unweighted')),
      el('p.muted.small',s('watch.unweighted_note')),...omitted.map(r=>button(r,true))));
  } else {
    sortRows(filtered,sort,sortDirection,{signals});
    if(renderResearch){
      const selectBox=(ticker=null)=>{
        const all=filtered.every(row=>selection.checked.has(row.ticker));
        const input=el('input',{type:'checkbox',checked:ticker?selection.checked.has(ticker):all,disabled:selection.disabled,
          'aria-label':s(ticker?'watch.select_stock':'watch.select_visible',{ticker}),'data-watch-select':ticker||'all',
          'data-reading-key':'select:'+(ticker||'all'),onchange:event=>selection.toggle(ticker?[ticker]:filtered.map(row=>row.ticker),event.target.checked)});
        if(!ticker)input.indeterminate=!all&&filtered.some(row=>selection.checked.has(row.ticker));
        return el('label.watch-select',input);
      };
      const sortHeader=(key,label)=>el('th',{scope:'col','aria-sort':sort===key?(sortDirection==='asc'?'ascending':'descending'):'none'},
        el('button.watch-sort',{type:'button','data-sort':key,'data-reading-key':'sort:'+key,onclick:()=>onSort?.(key)},
          el('span.watch-sort-label',label),el('span.watch-sort-icon',{'aria-hidden':'true'})));
      const table=el('table.watch-compact-table',el('thead',el('tr',sortHeader('ticker',s('watch.stock')),
        sortHeader('change_pct',s('watch.metric_quote')),el('th',{scope:'col'},s('watch.view_reading')),
        sortHeader('market_cap',s('watch.cap')),...signalKeys.map((key,i)=>{const th=sortHeader(key,signalLabel(key));th.classList.add('watch-signal-col');th.dataset.signal=key;if(!i)th.classList.add('is-first');
          th.append(signalHelpButton(key,signals?.meta||{}));return th;}),
        ...metricKeys.map(key=>sortHeader(key,metricLabel(key))))));
      if(selection){table.classList.add('watch-selectable');table.querySelector('th').prepend(selectBox());}
      const body=el('tbody');
      for(const row of filtered){
        const q=displayQuote(row),shown=q||row;
        const reading=renderResearch(row.ticker),preview=reading.querySelector('.stock-one-sentence')?.firstChild?.textContent||reading.querySelector('p')?.textContent||'';
        const analysisDate=reading.querySelector('.stock-analysis-date')?.textContent;
        const overview=el('details.watch-inline-reading',{'data-reading-key':row.ticker+':overview'},
          el('summary',{'data-reading-key':row.ticker+':overview-toggle'},el('span',
            el('span.watch-reading-preview',preview),analysisDate?el('small.watch-reading-date',analysisDate):null)),reading,
          el('a.stock-open',{href:'#/stock/'+encodeURIComponent(row.ticker),'data-reading-key':row.ticker+':open'},s('focus.open_stock')+' →'));
        body.append(el('tr',{'data-reading-anchor':row.ticker,class:selection?.checked.has(row.ticker)?'is-selected':''},
          el('th',{scope:'row'},selection?selectBox(row.ticker):null,el('a.stock-name',{href:'#/stock/'+encodeURIComponent(row.ticker),'data-reading-key':row.ticker+':name'},el('strong',row.ticker),el('span.watch-company',row.company||row.ticker)),
            el('a.watch-map-link',{href:'#/evidence/'+encodeURIComponent(row.ticker),'data-map-open':row.ticker,'data-tour':'stock.map','data-ticker':row.ticker,'data-reading-key':row.ticker+':map','aria-label':s('watch.open_stock_map',{ticker:row.ticker})},icon('evidence'),el('span',s('watch.open_map')))),
          el('td.watch-quote-cell',el('strong.mono',px(shown.price)),el('span.watch-change',{class:'watch-'+changeClass(shown.change_pct)},pct(shown.change_pct,2)),
            q?quoteNote(q,{received:quoteReceived}):el('small.muted',row.price_session||session||'—')),
          el('td.watch-overview-cell',overview),el('td.mono',row.security_type==='ETF'?'ETF':capText(row.market_cap)),
          ...signalKeys.map((key,i)=>el('td.watch-signal-cell',{class:i?'':'is-first','data-signal':key},signalCell(key,signals?.get(row.ticker),{ticker:row.ticker}))),
          ...metricKeys.map(key=>el('td',metricCell(key,row.metrics?.[key])))));
      }
      table.append(body);root.append(el('div.watch-table-scroll',{tabindex:0,'aria-label':s('watch.display')},table),metricMethods(filtered));
      if(signals)root.append(signalMethods(signals));
    }
    else root.append(el('div.watch-table.watch-rich-table',el('div.watch-row-entry.watch-columns-entry.watch-rich-entry',
      el('div.watch-row.watch-columns',el('span',s('watch.stock')),...metricKeys.map(key=>el('span',metricLabel(key))),
        el('span',s('watch.metric_quote'))),el('span.watch-map-column',s('watch.open_map'))),...filtered.map(r=>button(r))),metricMethods(filtered));
  }
  const methods=el('details.watch-method',{'data-disclosure':'prices'},el('summary',s('watch.method')),
    el('p.muted.small',s('watch.method_body',{start:previous || '—',end:session || '—'})));
  for(const r of filtered) methods.append(el('p.small',`${r.ticker} · ${s('watch.cap')}: ${capText(r.market_cap)} ${r.market_cap_currency || ''} · ${s('watch.cap_as_of')}: ${r.market_cap_as_of?.slice(0,10) || '—'}`));
  for(const r of filtered.filter(retained))methods.append(el('p.small',`${r.ticker} · ${savedLabel(r)} · ${s('watch.saved_at')}: ${r.price_recorded_at || '—'}`));
  root.append(methods);
  return root;
}

export function sortRows(rows,key,direction='desc',{signals=null}={}){
  const value=row=>signalKeys.includes(key)?signalSortValue(signals?.get(row.ticker),key):metricKeys.includes(key)?metricSortValue(row,key):['price','change_pct'].includes(key)?(displayQuote(row)||row)[key]:row[key];
  return rows.sort((a,b)=>{
    if(key==='ticker')return a.ticker.localeCompare(b.ticker)*(direction==='asc'?1:-1);
    const x=value(a),y=value(b);
    if(!finite(x)||!finite(y))return finite(x)?-1:finite(y)?1:a.ticker.localeCompare(b.ticker);
    return (x-y)*(direction==='asc'?1:-1)||a.ticker.localeCompare(b.ticker);
  });
}
