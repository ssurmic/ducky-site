import {s} from '../strings.js';
import {el, clear, num, px, errorBox} from '../ui.js';
import * as api from '../api.js';
import {dateTime} from './creator-research.js';

const tr=k=>s('record.'+k);
const streams=['price','technical','options','vibe','radar','creator','calendar','digest'];
const value=v=>v===null||v===undefined||v===''?'—':String(v);
const link=(href,label)=>el('a.btn.btn-ghost.btn-sm',{href},label);
function destination(stream,ticker) {
  const tk=encodeURIComponent(ticker);
  return ({price:'#/chart/'+tk,technical:'#/chart/'+tk,options:'#/watchlist?ticker='+tk,
    vibe:'#/boards?board=social&ticker='+tk,radar:'#/boards?mode=archive&ticker='+tk,
    creator:'#/creators?ticker='+tk,calendar:'#/calendar',digest:'#/briefing'})[stream];
}

export function recordCard(item) {
  const p=item.payload||{},card=el('article.research-evidence');
  if(p.content_status) return el('article.research-evidence',el('p.data-notice',tr('corrected')),
    el('p.small.muted',tr('observed')+' '+dateTime(item.observed_at)),
    el('details',el('summary',tr('evidence')),el('code.social-record-id',item.id)));
  let title=p.title||p.summary||p.creator_name||'';
  if(typeof title!=='string') title='';
  if(title)card.append(el('p',title));
  let fields=[];
  if(item.stream==='price')fields=[['spot',px(p.spot)]];
  if(item.stream==='technical')fields=[['rsi',num(p.rsi_d,1)],['drawdown',p.dd_pct==null?'—':num(p.dd_pct,1)+'%']];
  if(item.stream==='options')fields=[['iv',p.iv==null?'—':num(p.iv,1)+'%'],['hv',p.hv==null?'—':num(p.hv,1)+'%'],['call_wall',px(p.call_wall)],['put_wall',px(p.put_wall)]];
  if(item.stream==='vibe')fields=[['mentions',num(p.mentions,0)],['heat',p.index==null?'—':num(p.index,1)+' / 100']];
  if(item.stream==='calendar')fields=[['event_date',value(p.date)],['event_time',value(p.time_et)]];
  if(p.effective_at)fields.push(['effective_at',value(p.effective_at)]);
  if(fields.length)card.append(el('dl.research-facts',...fields.map(([k,v])=>el('div',el('dt',tr(k)),el('dd.mono',v)))));
  if(item.stream==='vibe')card.append(el('p.small.muted',tr('vibe_limit')));
  const published=item.source_at ? (p.date_precision==='day'||item.source_at.length===10 ? item.source_at.slice(0,10)+' · '+tr('unknown_time') : dateTime(item.source_at)) : tr('unknown');
  if(item.source_at)card.append(el('p.small.muted',tr('published')+' '+published));
  card.append(el('p.small.muted',tr(item.freshness==='stale'?'stale':'observed')+' '+dateTime(item.observed_at)));
  const details=el('details',el('summary',tr('evidence')),
    el('p.small',tr('published')+' '+published),
    el('p.small',tr('indexed')+' '+dateTime(item.indexed_at)),
    el('code.social-record-id',item.id));
  if(p.relation_basis)details.append(el('p.small',tr('relation')+' '+value(p.relation_basis)));
  try {const u=new URL(p.source_url);if(u.protocol==='https:'&&!u.username&&!u.password)details.append(link(u.href,tr('source')));}catch{}
  card.append(details);return card;
}

export function renderRecord(doc) {
  const section=el('section.research-record',el('h2',tr('title')));
  if(!Array.isArray(doc.items)||!doc.items.length) {
    section.append(el('p.data-notice',tr(doc.status==='pending'?'pending':'empty')));return section;
  }
  section.append(el('p.muted.small',tr('intro')));
  if(doc.refresh_pending)section.append(el('p.data-notice',tr('refreshing')));
  const grid=el('div.research-record-grid');
  for(const stream of streams) {
    const items=doc.items.filter(r=>r.stream===stream);
    const card=el('section.card.research-stream',el('h3',tr(stream)),link(destination(stream,doc.ticker),tr('open_'+stream)));
    if(!items.length)card.append(el('p.muted.small',tr(stream==='radar'?'radar_uncovered':'uncovered')));
    else {
      card.append(recordCard(items[0]));
      if(items.length>1)card.append(el('details',el('summary',tr('more')),...items.slice(1).map(recordCard)));
    }
    grid.append(card);
  }
  section.append(grid);
  if(doc.market_context?.items?.length)section.append(el('details.card',el('summary',tr('market_context')),
    el('p.small.muted',tr('market_basis')),...doc.market_context.items.map(recordCard)));
  return section;
}

export async function mountRecord(root,ticker,signal) {
  const host=el('div');root.append(host);
  async function load(){
    clear(host);host.append(el('p.muted',{role:'status'},s('common.loading')));
    try {
      const doc=await api.get('/research/context/'+encodeURIComponent(ticker),{signal,silent402:true});
      if(signal?.aborted)return;clear(host);host.append(renderRecord(doc));
      const rows=el('div'),details=el('details.card',el('summary',tr('history')),el('p.small.muted',tr('history_note')),rows);
      let cursor=null,loading=false,started=false;
      const more=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:history},s('creators.load_more'));
      async function history(){
        if(loading)return;loading=true;more.disabled=true;
        try {
          const query=new URLSearchParams({limit:'15'});if(cursor)query.set('before',cursor);
          const data=await api.get('/research/history/'+encodeURIComponent(ticker)+'?'+query,{signal,silent402:true});
          if(signal?.aborted)return;
          rows.querySelector('.history-error')?.remove();
          for(const item of data.items||[])rows.append(el('section',el('h4',tr(item.stream)),recordCard(item)));
          cursor=data.next_cursor;more.hidden=!cursor;started=true;
          if(!rows.childElementCount)rows.append(el('p.muted',tr('empty')));
        }catch(e){if(!signal?.aborted)rows.append(el('div.history-error',errorBox(e,history)));}
        finally{loading=false;more.disabled=false;}
      }
      details.addEventListener('toggle',()=>{if(details.open&&!started)history();});details.append(more);host.append(details);
    }catch(e){if(!signal?.aborted){clear(host);host.append(errorBox(e,load));}}
  }
  await load();
}

export async function mountChanges(root,signal) {
  const host=el('section.card',el('h2',tr('changes')));root.append(host);
  try {
    const doc=await api.get('/research/changes',{signal,silent402:true});
    if(signal?.aborted)return;
    if(!doc.items?.length){host.append(el('p.muted',tr('no_changes')));return;}
    for(const row of doc.items)host.append(el('p.research-change',link('#/research/'+encodeURIComponent(row.ticker),'$'+row.ticker),
      el('span',tr(row.stream)),el('time.small.muted',dateTime(row.recorded_at))));
  }catch(e){if(!signal?.aborted)host.append(errorBox(e));}
}
