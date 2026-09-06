import {s} from '../strings.js';
import {el,pct} from '../ui.js';
import {avatar} from './creator-setup.js';
import {dateTime,safeSource,metric} from './creator-research.js';

const language=()=>document.documentElement.lang?.startsWith('en')?'en':'zh';
const summary=row=>row?.[language()] || row?.zh || row?.en || '';

export function activityChart(rows=[]) {
  const values=rows.slice(-6),max=Math.max(1,...values.map(r=>r.indexed));
  return el('figure.creator-activity',el('div.creator-activity-bars',...values.map(row=>
    el('div.creator-activity-column',el('span.small',String(row.reviewed)+' / '+row.indexed),
      el('div.creator-activity-track',{style:{height:(12+row.indexed/max*88)+'px'}},
        el('div',{style:{height:(row.indexed?row.reviewed/row.indexed*100:0)+'%'}})),el('time.small.muted',row.month)))),
    el('figcaption.small.muted',s('creatorpage.coverage_legend')));
}

export function priceChart(row) {
  const points=row?.path;
  if(!Array.isArray(points)||points.length<2||points.some(p=>!Number.isFinite(p.stock)||!Number.isFinite(p.spy)))return null;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 600 235');svg.setAttribute('role','img');
  svg.setAttribute('aria-label',s('creatorpage.chart_description',{ticker:row.ticker,ret:pct(row.ret),spy:pct(row.spy_ret)}));
  svg.classList.add('creator-price-chart');
  const lo=Math.min(0,...points.flatMap(p=>[p.stock,p.spy])),hi=Math.max(0,...points.flatMap(p=>[p.stock,p.spy])),span=hi-lo||1;
  const x=i=>55+i/(points.length-1)*522,y=v=>20+(hi-v)/span*166;
  const add=(tag,attrs,text)=>{const node=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text)node.textContent=text;svg.append(node);};
  for(const value of [...new Set([lo,0,hi])]){add('line',{x1:55,x2:577,y1:y(value),y2:y(value),stroke:'var(--border)'});add('text',{x:48,y:y(value)+4,'text-anchor':'end',fill:'var(--muted)','font-size':11},value.toFixed(1)+'%');}
  for(const [key,color] of [['stock','var(--accent)'],['spy','#7eafff']])add('polyline',{points:points.map((p,i)=>x(i)+','+y(p[key])).join(' '),fill:'none',stroke:color,'stroke-width':key==='stock'?3:2,'stroke-dasharray':key==='spy'?'5 4':'none'});
  for(const [i,anchor] of [[0,'start'],[points.length-1,'end']])add('text',{x:x(i),y:212,'text-anchor':anchor,fill:'var(--muted)','font-size':11},points[i].d);
  const readout=el('p.creator-chart-readout.small',{'aria-live':'polite'});
  const cursor=document.createElementNS(svg.namespaceURI,'line');for(const[k,v]of Object.entries({y1:18,y2:187,stroke:'var(--muted)','stroke-dasharray':'2 3'}))cursor.setAttribute(k,v);svg.append(cursor);
  const range=el('input.creator-chart-range',{type:'range',min:0,max:points.length-1,value:points.length-1,'aria-label':s('creatorpage.inspect_date')});
  function inspect(i){const p=points[i];cursor.setAttribute('x1',x(i));cursor.setAttribute('x2',x(i));readout.textContent=p.d+' · '+row.ticker+' '+pct(p.stock)+' · SPY '+pct(p.spy);}
  range.addEventListener('input',()=>inspect(Number(range.value)));inspect(points.length-1);
  return el('figure.creator-chart',svg,range,readout);
}

export function renderCreatorPage(root,{creator,page={},onTab=()=>{},tickers=null}={}) {
  const coverage=page.coverage || {};
  const identity=el('header.creator-page-heading',el('div.creator-identity',avatar(creator),el('div',el('h1',creator.name),el('p.small.muted',s('creatorpage.coverage',{ready:coverage.reviewed||0,total:coverage.indexed||0})))));
  root.append(identity);
  const chart=page.chart&&(!tickers||tickers.includes(page.chart.ticker))?page.chart:null;
  const visual=el('section.creator-page-visual');
  const figure=priceChart(chart);
  if(figure){
    visual.append(el('div.creator-visual-heading',el('h3',s('creatorpage.price_title',{ticker:chart.ticker})),el('span.evidence-badge',s(chart.basis==='published'?'creatorpage.reconstructed':'creatorpage.recorded'))),
      el('p.small.muted',s('creatorpage.price_scope',{n:chart.horizon})),figure,
      el('div.creator-page-metrics',metric('$'+chart.ticker,pct(chart.ret),chart.ret),metric('SPY',pct(chart.spy_ret),chart.spy_ret),metric(s('creatorpage.excess'),pct(chart.excess),chart.excess)));
    visual.append(el('details.creator-page-method',el('summary',s('creators.source_details')),el('p.small',s('creatorpage.price_method')),
      el('p.small.muted',s('creators.published')+' '+dateTime(chart.published_at)),el('p.small.muted',s('creators.first_seen')+' '+dateTime(chart.recorded_at)),
      chart.evidence?el('blockquote',chart.evidence):null,safeSource(chart.url)?el('a',{href:chart.url,target:'_blank',rel:'noopener noreferrer'},s('creators.orig')+' ↗'):null));
  }else{
    visual.append(el('h3',s('creatorpage.coverage_title')),activityChart(page.activity||[]),
      el('p.small.muted',s('creatorpage.no_price')));
  }
  if(figure)root.append(visual);
  const highlights=(page.highlights||[]).filter(p=>!tickers||p.tickers?.some(t=>tickers.includes(t)));
  const highlightsNode=el('section.creator-highlights',el('h3',s('creatorpage.highlights')));
  for(const p of highlights){
    let url=safeSource(p.url);if(url){const u=new URL(url);u.searchParams.set('t',String(Math.floor(p.start_seconds||0)));url=u.href;}
    highlightsNode.append(el('article',el('time.small.muted',String(p.published_at||'').slice(0,10)),el('p',summary(p.summary)),
      url?el('a.small',{href:url,target:'_blank',rel:'noopener noreferrer'},s('creatorpage.source')+' ↗'):null));
  }
  if(!highlights.length)highlightsNode.append(el('p.muted',s(page.backfill?'creatorpage.preparing':'creatorpage.no_summary')));
  root.append(highlightsNode);
  if(!figure){visual.classList.add('creator-page-coverage-mini');root.append(visual);}
  if(page.mentions?.length)root.append(el('div.creator-mentions',el('span.small.muted',s('creatorpage.mentions')),
    ...page.mentions.map(m=>el('a.cr-chip',{href:'#/chart/'+encodeURIComponent(m.ticker)},'$'+m.ticker))));
  root.append(el('div.evidence-controls',el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>onTab('lab')},s('creatorlab.tab')),
    el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>onTab('research')},s('creators.research'))));
  const detail=el('details.creator-page-about',el('summary',s('creators.about')),el('p.small',creator.profile?.description||creator.descr||s('creators.profile_pending')));
  if(safeSource(creator.url))detail.append(el('a',{href:creator.url,target:'_blank',rel:'noopener noreferrer'},s('creators.channel')+' ↗'));
  if(page.as_of)detail.append(el('p.small.muted',s('creatorpage.updated')+' '+dateTime(page.as_of)));
  if(page.backfill){const b=page.backfill,c=b.counts||{};detail.append(el('p.small.muted',s('creatorpage.backfill',{date:b.since_day,ready:c.ready||0,pending:(c.queued||0)+(c.running||0)+(c.retry||0)+(c.processing||0),missing:(c.unavailable||0)+(c.too_long||0)+(c.too_dense||0)+(c.channel_mismatch||0)})));
    if(b.capped)detail.append(el('p.small.muted',s('creatorpage.capped',{n:b.limit})));}
  root.append(detail);
}
