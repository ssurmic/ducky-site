// A small, inspectable closing-price chart. No synthetic intraday ticks or IV.
import {el,clear,px} from './ui.js';
import {s} from './strings.js';

export function closingPoints(payload){
  const rows=Array.isArray(payload)?payload:payload?.bars||payload?.items||[];
  const points=new Map();
  for(const row of rows){
    const day=row.date??row.time??row.t,close=row.close??row.c;
    if(typeof day==='number'&&(!Number.isFinite(day)||!Number.isFinite(new Date(day>1e12?day:day*1000).getTime())))continue;
    let date=typeof day==='number'?new Date(day>1e12?day:day*1000).toISOString().slice(0,10):String(day||'').slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||!Number.isFinite(close)||close<=0)continue;
    points.set(date,{date,close});
  }
  return [...points.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function closingChart(payload,{selectedDate}={}){
  const points=closingPoints(payload),figure=el('figure.stock-closing-chart');
  if(points.length<2)return el('p.muted',s('focus.chart_missing'));
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('viewBox','0 0 640 180');svg.setAttribute('role','img');svg.setAttribute('aria-label',s('focus.chart_label'));
  const lo=Math.min(...points.map(p=>p.close)),hi=Math.max(...points.map(p=>p.close)),spread=hi-lo||hi*.05;
  const x=i=>12+i*616/(points.length-1),y=v=>162-(v-lo)*140/spread;
  const path=document.createElementNS(ns,'path');path.setAttribute('d',points.map((p,i)=>(i?'L':'M')+x(i).toFixed(2)+' '+y(p.close).toFixed(2)).join(' '));path.setAttribute('class','stock-price-line');svg.append(path);
  const dot=document.createElementNS(ns,'circle');dot.setAttribute('r','4');dot.setAttribute('class','stock-price-dot');svg.append(dot);
  const value=el('output.mono'),slider=el('input.stock-chart-scrub',{type:'range',min:0,max:points.length-1,value:points.length-1,step:1,'aria-label':s('focus.inspect_close')});
  const update=()=>{const i=Number(slider.value),point=points[i];value.textContent=point.date+' · '+px(point.close);slider.setAttribute('aria-valuetext',value.textContent);dot.setAttribute('cx',x(i));dot.setAttribute('cy',y(point.close));};
  const selected=points.findIndex(p=>p.date===selectedDate);if(selected>=0){slider.value=selected;slider.dataset.scrubbed='true';}
  slider.addEventListener('input',()=>{slider.dataset.scrubbed='true';update();});update();
  figure.append(svg,el('figcaption',value,el('span.small.muted',s('focus.chart_period',{start:points[0].date,end:points.at(-1).date}))),slider,
    el('p.small.muted',s('focus.chart_basis')));
  if(payload?.stale)figure.append(el('p.data-notice',s('focus.chart_stale')));
  return figure;
}
