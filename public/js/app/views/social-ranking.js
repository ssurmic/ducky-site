import {el,num,pct} from '../ui.js';
import {s} from '../strings.js';
import {evidenceLink} from '../evidence-link.js';

export function attentionTrend(samples=[]) {
  const points=samples.filter(p=>Number.isFinite(Date.parse(p.at))&&Number.isFinite(p.mentions)&&p.mentions>=0)
    .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
  const host=el('span.social-rank-trend');
  if(points.length<2)return el('span.social-rank-trend.muted',s('social.trend_building'));
  const ns='http://www.w3.org/2000/svg';
  const node=(tag,attrs)=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
  const svg=node('svg',{viewBox:'0 0 120 36',role:'img','aria-label':s('social.trend_days',{n:points.length})});
  const first=Date.parse(points[0].at),last=Date.parse(points.at(-1).at),max=Math.max(1,...points.map(p=>p.mentions));
  const x=p=>3+114*(Date.parse(p.at)-first)/Math.max(1,last-first),y=p=>32-28*p.mentions/max;
  let previous;
  for(const p of points){
    // Missing days are left disconnected; absence from a top-100 sample is not zero.
    if(previous&&Math.round((Date.parse(p.at.slice(0,10))-Date.parse(previous.at.slice(0,10)))/86400000)===1)
      svg.append(node('path',{d:`M${x(previous)} ${y(previous)}L${x(p)} ${y(p)}`,fill:'none',stroke:'currentColor','stroke-width':'1.8'}));
    const dot=node('circle',{cx:x(p),cy:y(p),r:'2',fill:'currentColor'}),title=node('title',{});
    title.textContent=p.at.slice(0,10)+' · '+num(p.mentions,0);dot.append(title);svg.append(dot);previous=p;
  }
  host.append(svg,el('small',s('social.trend_days',{n:points.length})));return host;
}

export function rankingRow(row,{samples=[],details}={}) {
  const delta=Number.isFinite(row.rank_previous)?row.rank_previous-row.rank:null;
  const rank=el('span.social-rank-number',el('strong',String(row.rank??'—')),
    el('small.muted',delta===null?'—':delta===0?'·':(delta>0?'↑':'↓')+Math.abs(delta)));
  const summary=el('div.social-rank-summary',rank,
    el('div.social-rank-stock',el('a',{href:'#/chart/'+encodeURIComponent(row.ticker)},row.ticker),el('span.muted',row.company)),
    el('div.social-rank-value',el('small',s('social.mentions_short')),el('strong',num(row.mentions,0))),
    el('div.social-rank-value',el('small',s('social.change_short')),el('span',row.change_pct==null?'—':pct(row.change_pct,0))),
    el('div.social-rank-value.social-rank-votes',el('small',s('social.votes_short')),el('span',num(row.upvotes,0))),attentionTrend(samples));
  // Disclosure owns the larger existing evidence/history UI. Numbers stay visible.
  return el('article.social-rank-row',{'data-record-id':row.id},summary,
    el('details.social-ranking-details',el('summary',s('social.row_details')),details),
    el('div.social-rank-map',evidenceLink(row.ticker,row.id)));
}
