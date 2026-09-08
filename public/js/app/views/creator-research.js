import { s, LANG } from '../strings.js';
import { el, clear, pct, px } from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {claimDetails,priceContext,sourceAt} from './creator-claim.js';
import {readingPreview} from '../reading-preview.js';

export function researchRows(items, {kolId='', query='', history=false, allowedIds=null,tickers=null}={}) {
  const latest = new Map();
  for (const p of items) if (!p.canonical && (!latest.has(p.id) || p.revision_id > latest.get(p.id))) latest.set(p.id,p.revision_id);
  return items.filter(p=>(!kolId || p.kol_id===kolId) && (!allowedIds || allowedIds.includes(p.kol_id)) && (p.canonical || history || latest.get(p.id)===p.revision_id))
    .flatMap(p=>(p.calls || []).map(c=>({post:p,call:c})))
    .filter(({call})=>history || (!call.canonical_replacement && !['retracted','superseded'].includes(call.attribution_status)))
    .filter(({post,call})=>(tickers===null||tickers.includes(call.sym))&&[post.kol_name,post.title,call.sym].join(' ').toLowerCase().includes(query.toLowerCase()));
}

export async function mountResearch(root, selection) {
  const epoch=store.epoch();
  if (!store.isPro()) {root.append(el('p.muted',s('creators.research_pro')),el('a.btn.btn-primary',{href:'#/billing'},s('creators.upgrade')));return;}
  root.append(el('p',{role:'status'},s('common.loading')));
  let doc;
  try {doc=await api.get('/kol/research'+(selection?.kolId?'?kol_id='+encodeURIComponent(selection.kolId):''));}
  catch {if(root.isConnected) {clear(root);root.append(el('p.err',{role:'alert'},s('creators.research_error')));}return;}
  if(epoch!==store.epoch() || !root.isConnected) return;
  let horizon='20',basis='published',history=false;
  render();
  function render() {
    clear(root);
    const controls=el('div.evidence-controls');
    for(const [value,key] of [['published','creators.window_published'],['recorded','creators.window_recorded']])
      controls.append(el('button.btn.btn-ghost.btn-sm',{type:'button','aria-pressed':String(basis===value),onclick:()=>{basis=value;render();}},s(key)));
    const select=el('select.input',{'aria-label':s('creators.horizon')},...[1,5,20,60].map(n=>el('option',{value:String(n),selected:horizon===String(n)},s('creators.trading_days',{n}))));
    select.addEventListener('change',()=>{horizon=select.value;render();});controls.append(select);
    controls.append(el('button.btn.btn-ghost.btn-sm',{type:'button','aria-pressed':String(history),onclick:()=>{history=!history;render();}},s(history?'creators.latest_versions':'creators.all_versions')));
    root.append(controls,el('p.research-method',s('creators.method')),
      el('p.muted.small',s(basis==='published'?'creators.published_caveat':'creators.recorded_caveat')));
    const rows=researchRows(doc.items || [],{...selection,history}).sort((a,b)=>
      (Date.parse(b.post[basis==='published'?'published_at':'recorded_at'])||0)-(Date.parse(a.post[basis==='published'?'published_at':'recorded_at'])||0));
    const complete=rows.filter(r=>r.call.windows?.[basis]?.horizons?.[horizon]?.status==='ready');
    const losses=complete.filter(r=>r.call.windows[basis].horizons[horizon].ret<0);
    root.append(el('div.evidence-metrics',
      metric(s('creators.opinions'),rows.length),metric(s('creators.matured'),complete.length),
      metric(s('creators.price_declines'),losses.length),metric(s('creators.pending_missing'),rows.length-complete.length)));
    if(!rows.length) {root.append(el('p.empty',s('creators.no_studies')));return;}
    const list=el('div.study-list');
    for(const {post,call} of rows) {
      const window=call.windows?.[basis] || {},out=window.horizons?.[horizon] || {};
      const status=window.status==='ready'?(out.status || 'pending'):(window.status || 'pending');
      const row=el('article.study-row');
      const note=typeof call.note==='object'&&call.note?(call.note[LANG]||call.note.zh||call.note.en):call.note;
      row.append(el('div.study-heading',el('a.mono',{href:'#/evidence/'+encodeURIComponent(call.sym)+(call.point_id?'?source='+encodeURIComponent(call.point_id):'')},'$'+call.sym),
        el('span.cr-take',s('creators.take_'+call.stance)),el('span.evidence-badge','BACKTEST')),
        el('h3',readingPreview(note||post.title||post.kol_name,LANG!=='en')),el('p.muted.small',post.kol_name+' · '+s('creators.published')+' '+dateTime(post.published_at)));
      if(['retracted','superseded'].includes(call.attribution_status))row.append(el('p.err',s('creatorclaim.superseded')));
      if(call.price_context?.simulation?.reason==='condition_not_evaluated')row.append(el('p.small',s('creatorclaim.conditional')));
      const details=el('details.study-detail',el('summary',s('creators.evidence_version')),el('p.small.muted',post.title||''));
      const timeline=el('dl.evidence-timeline');
      for(const [key,value] of [['creators.first_seen',dateTime(post.first_seen_at)],['creators.version_recorded',dateTime(post.recorded_at)],['creators.base_close',window.base_d?window.base_d+' · '+px(window.base_px):'—'],['creators.end_close',out.end_d?out.end_d+' · '+px(out.end_px):'—']])
        timeline.append(el('div',el('dt',s(key)),el('dd',value)));
      details.append(claimDetails(call));
      const anchors=priceContext(call.price_context);
      if(anchors)details.append(anchors);
      details.append(timeline);
      if(post.provenance==='legacy_import') row.append(el('p.muted.small',s('creators.legacy_import')));
      if(status==='ready') {details.append(priceChart(out.path,call.sym));row.append(el('div.study-results',
        metric(s('creators.stock_return'),pct(out.ret),out.ret),metric('SPY',pct(out.spy_ret),out.spy_ret),
        metric(s('creators.excess'),pct(out.excess),out.excess)),
        el('p.muted.small',s('creators.close_range',{low:pct(out.min_close_return),high:pct(out.max_close_return)})));}
      else row.append(el('p.study-status',s('creators.status_'+status)));
      const evidence=el('details.cr-evidence',el('summary',s('creators.evidence_version')),
        call.evidence?el('blockquote',call.evidence):el('p.small.muted',s('creatorclaim.source_link')),
        el('p.muted.small',s('creators.version_recorded')+' '+dateTime(post.recorded_at)));
      const source=sourceAt(post.url,call.action_start_seconds??call.start_seconds)||safeSource(post.url);
      if(source) evidence.append(el('a',{href:source,target:'_blank',rel:'noopener noreferrer'},s('creators.orig')+' ↗'));
      details.append(evidence);row.append(details);list.append(row);
    }
    root.append(list,el('p.muted.small',doc.limit?s('creators.research_limit',{n:doc.limit}):s('creators.research_scope')));
  }
}

export function dateTime(value) {
  if(!value || Number.isNaN(Date.parse(value))) return '—';
  return new Date(value).toISOString().replace('T',' ').slice(0,16)+' UTC';
}
export function safeSource(value) {
  try {const u=new URL(value);return u.protocol==='https:' && ['youtube.com','www.youtube.com','youtu.be','x.com','www.x.com','twitter.com'].includes(u.hostname)?u.href:null;} catch{return null;}
}
export function metric(label,value,number) {
  return el('div.evidence-metric',el('span.muted.small',label),el('strong.mono',{class:typeof number==='number'?(number<0?'neg':number>0?'pos':''):''},String(value)));
}

function priceChart(points,ticker) {
  if(!Array.isArray(points) || points.length<2) return null;
  const values=points.flatMap(p=>[p.stock,p.spy]);
  if(values.some(v=>!Number.isFinite(v)))return null;
  const low=Math.min(0,...values),high=Math.max(0,...values),span=high-low || 1;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 360 130');svg.setAttribute('role','img');
  svg.setAttribute('aria-label',ticker+' '+pct(points.at(-1).stock)+'; SPY '+pct(points.at(-1).spy));
  svg.classList.add('study-chart');
  function shape(tag,attrs,text) {const n=document.createElementNS(svg.namespaceURI,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text)n.textContent=text;svg.append(n);}
  const x=i=>42+i/(points.length-1)*298,y=v=>16+(high-v)/span*80;
  for(const value of [...new Set([low,0,high])]) {
    shape('line',{x1:42,x2:340,y1:y(value),y2:y(value),stroke:'var(--border)','stroke-dasharray':value===0?'3 3':'1 0'});
    shape('text',{x:36,y:y(value)+3,'text-anchor':'end',fill:'var(--muted)','font-size':9},value.toFixed(1)+'%');
  }
  for(const[key,color]of [['stock','var(--accent)'],['spy','var(--muted)']])
    shape('polyline',{points:points.map((p,i)=>`${x(i)},${y(p[key])}`).join(' '),fill:'none',stroke:color,'stroke-width':2,'stroke-dasharray':key==='spy'?'4 3':'1 0'});
  shape('text',{x:42,y:120,fill:'var(--muted)','font-size':9},points[0].d);
  shape('text',{x:340,y:120,'text-anchor':'end',fill:'var(--muted)','font-size':9},points.at(-1).d);
  return el('figure.study-figure',svg,el('figcaption.muted.small',ticker+' ━  ·  SPY ┄'));
}
