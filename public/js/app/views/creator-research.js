import { s, LANG } from '../strings.js';
import { el, clear, pct, px } from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {claimDetails,sourceAt} from './creator-claim.js';
import {readingPreview} from '../reading-preview.js';
import {eventPriceSnapshot} from './event-price-snapshot.js';

const researchOwners=new WeakMap();

export function researchRows(items, {kolId='', query='', history=false, allowedIds=null,tickers=null}={}) {
  const latest = new Map();
  const canonical=new Set(items.filter(p=>p.canonical).flatMap(p=>(p.calls||[]).map(c=>p.id+':'+c.point_id)));
  const seen=new Set();
  for (const p of items) if (!p.canonical && (!latest.has(p.id) || p.revision_id > latest.get(p.id))) latest.set(p.id,p.revision_id);
  return items.filter(p=>(!kolId || p.kol_id===kolId) && (!allowedIds || allowedIds.includes(p.kol_id)) && (p.canonical || history || latest.get(p.id)===p.revision_id))
    .flatMap(p=>(p.calls || []).map(c=>({post:p,call:c})))
    .filter(({post,call})=>history || ((!call.canonical_replacement && (post.canonical || !canonical.has(post.id+':'+call.point_id))) && !['retracted','superseded'].includes(call.attribution_status)))
    .filter(({post,call})=>{const key=post.canonical?post.id+':'+call.sym+':'+(post.cluster_key||call.point_id||post.study_key):post.revision_id+':'+(call.claim_id||call.point_id||call.sym);if(seen.has(key))return false;seen.add(key);return true;})
    .filter(({post,call})=>(tickers===null||tickers.includes(call.sym))&&[post.kol_name,post.title,call.sym].join(' ').toLowerCase().includes(query.toLowerCase()));
}

export async function mountResearch(root, selection) {
  const epoch=store.epoch();
  if (!store.isPro()) {root.append(el('p.muted',s('creators.research_pro')),el('a.btn.btn-primary',{href:'#/billing'},s('creators.upgrade')));return;}
  const owner={};researchOwners.set(root,owner);
  let doc={items:[]},loading=false,loadError=false,sequence=0;
  const active=()=>epoch===store.epoch() && root.isConnected && researchOwners.get(root)===owner;
  await loadPage();
  async function loadPage(append=false) {
    const request=++sequence;loading=true;loadError=false;
    if(!append)doc={items:[]};
    render();
    const params=new URLSearchParams();
    if(selection?.kolId)params.set('kol_id',selection.kolId);
    if(append && doc.next_cursor)params.set('before',doc.next_cursor);
    try {
      const next=await api.get('/kol/research'+(params.size?'?'+params.toString():''));
      if(!active() || request!==sequence)return;
      doc={...next,items:append?[...doc.items,...(next.items||[])]:next.items||[]};
    } catch {if(!active() || request!==sequence)return;loadError=true;}
    loading=false;render();
  }
  function render() {
    clear(root);
    root.append(el('p.muted.small',s('creators.study_intro')));
    const rows=researchRows(doc.items || [],{...selection}).sort((a,b)=>
      (Date.parse(b.post.published_at)||0)-(Date.parse(a.post.published_at)||0));
    const complete=rows.filter(r=>r.call.price_context?.publication_20?.status==='ready');
    if(rows.length)root.append(el('p.muted.small',s('creators.study_count',{n:rows.length,completed:complete.length})));
    if(!rows.length && !loading && !loadError)root.append(el('p.empty',s('creators.no_studies')));
    const list=el('div.study-list');
    for(const {post,call} of rows) {
      const window=call.price_context?.publication_20 || {},out=window;
      const status=out.status||'missing_price';
      const stance=normalizedStance(call.stance);
      const row=el('article.study-row',{class:'study-'+stance});
      const note=typeof call.note==='object'&&call.note?(call.note[LANG]||call.note.zh||call.note.en):call.note;
      row.append(el('div.study-heading',el('a.mono',{href:'#/evidence/'+encodeURIComponent(call.sym)+(call.point_id?'?source='+encodeURIComponent(call.point_id):'')},'$'+call.sym),
        el('span.cr-take',{class:'cr-'+stance},s('creators.take_'+stance)),el('span.evidence-badge','BACKTEST')),
        el('h3',readingPreview(note||post.title||post.kol_name,LANG!=='en')),el('p.muted.small',post.kol_name+' · '+s('creators.published')+' '+dateTime(post.published_at)));
      row.append(eventPriceSnapshot(call.price_context));
      if(call.condition_text)row.append(el('p.study-condition',call.condition_text));
      if(['retracted','superseded'].includes(call.attribution_status))row.append(el('p.err',s('creatorclaim.superseded')));
      const details=el('details.study-detail',el('summary',s('creators.evidence_version')),el('p.small.muted',post.title||''));
      const timeline=el('dl.evidence-timeline');
      for(const [key,value] of [['creators.first_seen',dateTime(post.first_seen_at)],['creators.version_recorded',dateTime(post.recorded_at)],['creators.base_close',window.base_d?window.base_d+' · '+px(window.base_px):'—'],['creators.end_close',out.end_d?out.end_d+' · '+px(out.end_px):'—']])
        timeline.append(el('div',el('dt',s(key)),el('dd',value)));
      details.append(claimDetails(call));
      details.append(timeline);
      if(post.provenance==='legacy_import') row.append(el('p.muted.small',s('creators.legacy_import')));
      if(status==='ready') {
        row.append(el('p.study-window',s('creators.twenty_day_result')+' ',el('strong.mono',{class:out.ret<0?'neg':out.ret>0?'pos':''},pct(out.ret))));
      } else row.append(el('p.study-status',s(status==='pending'?'creators.twenty_day_pending':'creators.status_'+status)));
      const evidence=el('div.cr-evidence',
        call.evidence?el('blockquote',call.evidence):el('p.small.muted',s('creatorclaim.source_link')),
        el('p.muted.small',s('creators.version_recorded')+' '+dateTime(post.recorded_at)));
      const source=sourceAt(post.url,call.action_start_seconds??call.start_seconds)||safeSource(post.url);
      if(source) evidence.append(el('a',{href:source,target:'_blank',rel:'noopener noreferrer'},s('creators.orig')+' ↗'));
      details.append(evidence);row.append(details);list.append(row);
    }
    root.append(list);
    if(loading)root.append(el('p.muted',{role:'status'},s('common.loading')));
    if(loadError)root.append(el('p.err',{role:'alert'},s('creators.research_error')));
    if(doc.next_cursor || loadError)root.append(el('button.btn.btn-ghost',{type:'button',disabled:loading,
      onclick:()=>loadPage(!!doc.next_cursor)},s(loadError?'common.retry':'creators.load_more_studies')));
    root.append(el('p.muted.small',doc.next_cursor?s('creators.more_studies_available'):s('creators.research_scope')),
      el('details.study-method',el('summary',s('creators.price_method')),el('p.muted.small',s('creators.price_method_detail'))));
  }
}

export function normalizedStance(value) {
  const v=String(value||'').trim().toLowerCase();
  return ['bull','bullish','support'].includes(v)?'bull':['bear','bearish','counter'].includes(v)?'bear':'neutral';
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
