import {el} from '../ui.js';
import {s} from '../strings.js';
import {dateTime} from './creator-research.js';

export function socialHistoryChart(rows) {
  const points=[...new Map(rows.map(r=>[r.id,r])).values()]
    .filter(r=>Number.isFinite(Date.parse(r.collected_at)))
    .sort((a,b)=>Date.parse(a.collected_at)-Date.parse(b.collected_at));
  const host=el('figure.social-history-plot',el('figcaption',s('social.chart_title')));
  if(!points.length)return host;
  const ns='http://www.w3.org/2000/svg';
  function node(tag,attrs){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;}
  const svg=node('svg',{viewBox:'0 0 640 140',role:'img','aria-label':s('social.chart_title')});
  const start=Date.parse(points[0].collected_at),end=Date.parse(points.at(-1).collected_at);
  const x=r=>20+600*(end===start ? 0.5 :(Date.parse(r.collected_at)-start)/(end-start));
  const y=r=>120-r.index;
  svg.append(node('path',{d:'M20 20V120H620',fill:'none',stroke:'currentColor',opacity:'.25'}));
  let previous=null;
  for(const p of points){
    if(!Number.isFinite(p.index)||p.index<0||p.index>100){previous=null;continue;}
    // Missing observations and collection gaps remain gaps, never zero heat.
    if(previous&&Date.parse(p.collected_at)-Date.parse(previous.collected_at)<=7200000)
      svg.append(node('path',{d:`M${x(previous)} ${y(previous)}L${x(p)} ${y(p)}`,fill:'none',stroke:'currentColor','stroke-width':2}));
    const dot=node('circle',{cx:x(p),cy:y(p),r:3,fill:'currentColor'}),title=node('title',{});
    title.textContent=dateTime(p.collected_at)+' · '+p.index+' / 100';dot.append(title);svg.append(dot);previous=p;
  }
  host.append(svg,el('p.small.muted',dateTime(points[0].collected_at)+' → '+dateTime(points.at(-1).collected_at)),el('p.small.muted',s('social.chart_note')));
  return host;
}
