// today-gauge.js — a half-dial for a 0–100 reading (Fear & Greed, USD liquidity): coloured bands,
// the active band lit, a needle at the score and the number inside. Pure SVG in the app's own
// colour tokens (dark and light), no library, no animation. Descriptive: the bands are the
// provider's own thresholds, never a signal to act on.
import {s} from './strings.js';

const NS='http://www.w3.org/2000/svg';
const CX=100,CY=104,R_OUT=92,R_IN=64;
const svg=(tag,attrs={},...children)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))if(v!==null&&v!==undefined)n.setAttribute(k,String(v));for(const c of children)if(c)n.append(c);return n;};
const polar=(r,deg)=>[CX+r*Math.cos(deg*Math.PI/180),CY-r*Math.sin(deg*Math.PI/180)];
const clamp=v=>Math.min(100,Math.max(0,v));
// 0 sits at the left end of the dial, 100 at the right.
export const angle=score=>180-clamp(score)*1.8;
const fix=n=>n.toFixed(2);

function bandPath(from,to){
  const a0=angle(from),a1=angle(to),[x0,y0]=polar(R_OUT,a0),[x1,y1]=polar(R_OUT,a1),[x2,y2]=polar(R_IN,a1),[x3,y3]=polar(R_IN,a0);
  const large=a0-a1>180?1:0;
  return `M${fix(x0)} ${fix(y0)} A${R_OUT} ${R_OUT} 0 ${large} 1 ${fix(x1)} ${fix(y1)} L${fix(x2)} ${fix(y2)} A${R_IN} ${R_IN} 0 ${large} 0 ${fix(x3)} ${fix(y3)} Z`;
}
// Bands are [{to, tone, label}] in ascending order; the first starts at 0, the last ends at 100.
export function bandFor(bands,score){
  if(!Number.isFinite(score))return null;
  return bands.find(b=>score<b.to)||bands[bands.length-1];
}

export function gauge({name,score,bands,word=''}){
  const ok=Number.isFinite(score),active=ok?bandFor(bands,score):null;
  const root=svg('svg',{class:'today-gauge',viewBox:'0 0 200 118',role:'img','aria-label':s('today.gauge_label',{name,score:ok?Math.round(score):'—',band:active?.label||word||'—'})});
  let from=0;
  for(const band of bands){
    root.append(svg('path',{class:'today-gauge-band is-'+band.tone+(band===active?' is-active':''),d:bandPath(from,band.to),'data-band':band.label}));
    from=band.to;
  }
  for(const tick of [0,25,50,75,100]){
    const [x,y]=polar(R_IN-7,angle(tick));
    root.append(svg('circle',{class:'today-gauge-tick',cx:fix(x),cy:fix(y),r:1.6}));
  }
  for(const [tick,dx,dy] of [[0,-14,4],[50,0,-4],[100,14,4]]){
    const [x,y]=polar(R_IN-16,angle(tick));
    root.append(svg('text',{class:'today-gauge-scale',x:fix(x+dx),y:fix(y+dy),'text-anchor':'middle'},String(tick)));
  }
  if(ok){
    const [nx,ny]=polar(R_IN+8,angle(score));
    root.append(svg('line',{class:'today-gauge-needle',x1:CX,y1:CY,x2:fix(nx),y2:fix(ny)}),svg('circle',{class:'today-gauge-hub',cx:CX,cy:CY,r:5}));
  }
  root.append(svg('text',{class:'today-gauge-value',x:CX,y:CY-14,'text-anchor':'middle'},ok?String(Math.round(score)):'—'));
  return root;
}
