import { s, LANG } from '../strings.js';
import { el, clear, pct, px } from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {claimDetails,sourceAt} from './creator-claim.js';
import {readingPreview} from '../reading-preview.js';
import {eventPriceSnapshot} from './event-price-snapshot.js';

const researchOwners=new WeakMap();

export function studyStatus(call) {
  const context=call.price_context,window=context?.publication_20;
  if(!window)return 'processing';
  if(window.status==='time_unknown'||context.publication_reference?.status==='time_unknown')return 'time_unknown';
  if(window.status==='corporate_action_review'||context.since_publication?.status==='corporate_action_review')return 'corporate_action_review';
  if(window.status==='missing_history')return 'missing_history';
  if(window.status==='missing_price'||context.publication_reference?.status!=='ready'||context.latest_close?.status!=='ready')return 'missing_price';
  return ['ready','pending'].includes(window.status)?window.status:'processing';
}

export function researchRows(items, {kolId='', query='', history=false, allowedIds=null,tickers=null}={}) {
  const latest = new Map();
  const postKey=p=>JSON.stringify([p.kol_id,p.id]);
  const canonical=new Set(items.filter(p=>p.canonical).flatMap(p=>(p.calls||[]).filter(c=>c.point_id).map(c=>postKey(p)+':'+c.point_id)));
  const seen=new Set();
  for (const p of items) if (!p.canonical && (!latest.has(postKey(p)) || p.revision_id > latest.get(postKey(p)))) latest.set(postKey(p),p.revision_id);
  return items.filter(p=>(!kolId || p.kol_id===kolId) && (!allowedIds || allowedIds.includes(p.kol_id)) && (p.canonical || history || latest.get(postKey(p))===p.revision_id))
    .flatMap(p=>(p.calls || []).map((c,index)=>({post:p,call:c,index})))
    .filter(({post,call})=>history || ((!call.canonical_replacement && (post.canonical || !canonical.has(postKey(post)+':'+call.point_id))) && !['retracted','superseded'].includes(call.attribution_status)))
    .filter(row=>{const key=researchIdentity(row);if(seen.has(key))return false;seen.add(key);return true;})
    .filter(({post,call})=>(tickers===null||tickers.includes(call.sym))&&[post.kol_name,post.title,call.sym].join(' ').toLowerCase().includes(query.toLowerCase()));
}

export function researchIdentity({post,call,index=0}) {
  return JSON.stringify([post.kol_id,post.id,call.sym,
    call.point_id||call.claim_id||post.study_key||String(post.revision_id)+':'+index]);
}

export function researchGroups(rows) {
  const ordered=[...rows].sort((a,b)=>{
    const stamp=(Date.parse(b.post.published_at)||0)-(Date.parse(a.post.published_at)||0);
    if(stamp)return stamp;
    if(a.post.kol_id===b.post.kol_id && a.post.id===b.post.id){
      const time=row=>Number.isFinite(row.call.start_seconds)?row.call.start_seconds:-1;
      if(time(a)!==time(b))return time(b)-time(a);
    }
    return researchIdentity(a).localeCompare(researchIdentity(b));
  });
  const groups=new Map();
  for(const row of ordered){
    const key=JSON.stringify([row.post.kol_id,row.call.sym]);
    if(!groups.has(key))groups.set(key,{key,rows:[],latest:row});
    groups.get(key).rows.push(row);
  }
  return [...groups.values()];
}

function opinionNote(post,call) {
  return (typeof call.note==='object'&&call.note?(call.note[LANG]||call.note.zh||call.note.en):call.note)||post.title||post.kol_name;
}

function sourceClock(seconds) {
  return Number.isFinite(seconds)&&seconds>=0?Math.floor(seconds/60)+':'+String(Math.floor(seconds)%60).padStart(2,'0'):'';
}

export async function mountResearch(root, selection) {
  const epoch=store.epoch();
  if (!store.isPro()) {root.append(el('p.muted',s('creators.research_pro')),el('a.btn.btn-primary',{href:'#/billing'},s('creators.upgrade')));return;}
  const owner={};researchOwners.set(root,owner);
  let doc={items:[]},loading=false,loadError=false,sequence=0,focusHandled=false;
  const openGroups=new Set();
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
    for(const group of root.querySelectorAll('details.study-group')){
      if(group.open)openGroups.add(group.dataset.groupKey);else openGroups.delete(group.dataset.groupKey);
    }
    clear(root);
    root.append(el('p.muted.small',s('creators.study_intro')));
    const rows=researchRows(doc.items || [],{...selection}),groups=researchGroups(rows);
    const targetLoaded=selection?.point&&rows.some(({post,call})=>[call.point_id,call.claim_id,post.study_key].includes(selection.point));
    if(selection?.point&&!targetLoaded&&!loading&&!loadError){
      root.append(el('p.small.muted',{role:'status'},s(doc.next_cursor?'creators.target_pending':'creators.target_missing')));
      if(doc.next_cursor)root.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>loadPage(true)},s('creators.load_more_studies')));
    }
    const complete=rows.filter(r=>r.call.price_context?.publication_20?.status==='ready');
    if(rows.length)root.append(el('p.muted.small',s('creators.study_count',{n:rows.length,completed:complete.length})));
    const counts={};for(const r of rows){const status=studyStatus(r.call);counts[status]=(counts[status]||0)+1;}
    if(rows.length)root.append(el('p.small.muted.study-coverage',{ 'data-scope':'loaded_views' },
      Object.entries(counts).map(([status,n])=>s('creators.coverage_'+status,{n})).join(' · ')));
    if(!rows.length && !loading && !loadError)root.append(el('p.empty',s(doc.status==='collecting'?'creators.status_processing':'creators.no_studies')));
    if(groups.length)root.append(el('p.small.muted.study-group-count',s('creators.group_count',{n:groups.length})));
    const list=el('div.study-list.study-groups');
    for(const group of groups) {
      const {post:latestPost,call:latestCall}=group.latest;
      const focused=selection?.point&&group.rows.find(({post,call})=>[call.point_id,call.claim_id,post.study_key].includes(selection.point));
      if(focused&&!focusHandled){openGroups.add(group.key);focusHandled=true;}
      const wrapper=el('details.study-group',{open:openGroups.has(group.key),'data-group-key':group.key});
      const stance=normalizedStance(latestCall.stance);
      const summary=el('summary.study-group-summary',{class:'study-'+stance},
        el('span.study-group-heading',el('strong.mono','$'+latestCall.sym),
          el('span.cr-take',{class:'cr-'+stance},s('creators.take_'+stance)),
          el('span.small.muted.study-group-author',latestPost.kol_name||latestPost.kol_id)));
      const position=sourceClock(latestCall.start_seconds);
      summary.append(el('span.small.muted.study-group-time',s('creators.latest_publication')+' '+dateTime(latestPost.published_at)+(position?' · '+s('creators.source_position',{time:position}):'')),
        el('span.study-group-note',readingPreview(opinionNote(latestPost,latestCall),LANG!=='en')));
      const stances=new Set(group.rows.filter(r=>r.post.published_at===latestPost.published_at).map(r=>normalizedStance(r.call.stance)));
      if(stances.size>1)summary.append(el('span.small.muted.study-group-mixed',s('creators.same_time_mixed')));
      if(latestCall.condition_text||latestCall.conditional||latestCall.intent==='conditional')summary.append(el('span.small.study-group-conditional',s('creators.conditional_view')));
      summary.append(eventPriceSnapshot(latestCall.price_context),el('span.study-group-expand',
        el('span',s('creators.group_views',{n:group.rows.length})),el('span',{'aria-hidden':'true'},'⌄')));
      const body=el('div.study-group-views');wrapper.append(summary,body);
      for(const {post,call} of group.rows) {
      const window=call.price_context?.publication_20 || {},out=window;
      const status=studyStatus(call);
      const stance=normalizedStance(call.stance);
      const row=el('article.study-row',{class:'study-'+stance,'data-point-id':call.point_id||call.claim_id||post.study_key||''});
      if(selection?.point&&[call.point_id,call.claim_id,post.study_key].includes(selection.point))row.classList.add('is-focused-study');
      const note=opinionNote(post,call);
      row.append(el('div.study-heading',el('a.mono',{href:'#/evidence/'+encodeURIComponent(call.sym)+(call.point_id?'?source='+encodeURIComponent(call.point_id):'')},'$'+call.sym),
        el('span.cr-take',{class:'cr-'+stance},s('creators.take_'+stance)),el('span.evidence-badge','BACKTEST')),
        el('h3',readingPreview(note||post.title||post.kol_name,LANG!=='en')),el('p.muted.small',post.kol_name+' · '+s('creators.published')+' '+dateTime(post.published_at)));
      row.append(eventPriceSnapshot(call.price_context));
      if(call.condition_text)row.append(el('p.study-condition',call.condition_text));
      if(['retracted','superseded'].includes(call.attribution_status))row.append(el('p.err',s('creatorclaim.superseded')));
      const details=el('details.study-detail',el('summary',s('creators.evidence_version')),el('p.small.muted',post.title||''));
      if(readingPreview(note,LANG!=='en')!==note)details.append(el('p',note));
      const timeline=el('dl.evidence-timeline');
      for(const [key,value] of [['creators.first_seen',dateTime(post.first_seen_at)],['creators.version_recorded',dateTime(post.recorded_at)],['creators.base_close',window.base_d?window.base_d+' · '+px(window.base_px):'—'],['creators.end_close',out.end_d?out.end_d+' · '+px(out.end_px):'—']])
        timeline.append(el('div',el('dt',s(key)),el('dd',value)));
      details.append(claimDetails(call));
      details.append(timeline);
      if(post.provenance==='legacy_import') row.append(el('p.muted.small',s('creators.legacy_import')));
      if(out.status==='ready') {
        row.append(el('p.study-window',s('creators.twenty_day_result')+' ',el('strong.mono',{class:out.ret<0?'neg':out.ret>0?'pos':''},pct(out.ret))));
      }
      if(status!=='ready')row.append(el('p.study-status',s(status==='pending'?'creators.twenty_day_pending':'creators.status_'+status)));
      const evidence=el('div.cr-evidence',
        call.evidence?el('blockquote',call.evidence):el('p.small.muted',s('creatorclaim.source_link')),
        el('p.muted.small',s('creators.version_recorded')+' '+dateTime(post.recorded_at)));
      const source=sourceAt(post.url,call.action_start_seconds??call.start_seconds)||safeSource(post.url);
      if(source) evidence.append(el('a',{href:source,target:'_blank',rel:'noopener noreferrer'},s('creators.orig')+' ↗'));
      details.append(evidence);row.append(details);body.append(row);
      }
      list.append(wrapper);
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
