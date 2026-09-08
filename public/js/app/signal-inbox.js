import {recordHref} from './record-format.js';
import {el,clear} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';
import {sourceDay} from './source-event.js';

const tickerPattern=/^[A-Z][A-Z0-9.-]{0,9}$/;
function date(value) {
  if(!sourceDay(value))return s('updates.date_unknown');
  if(value.length===10)return value;
  const parsed=new Date(value);
  return Number.isFinite(parsed.getTime())?parsed.toISOString().replace('T',' ').slice(0,16)+' UTC':s('updates.date_unknown');
}
function sourceURL(value) {try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}

// Independent pagination and failure state: creator updates can fail without hiding
// watchlist events. The owning view supplies its account/entitlement guard.
export function signalInboxSession({valid,onLoseAccess}) {
  let host=null,items=[],cursor=null,pending=false,failed=false,failedMore=false,ready=false,version=0,ctl=null;
  function render() {
    if(!host || !valid())return;
    clear(host);host.append(el('div.view-head',el('h2',s('updates.signals_title')),
      el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:pending,'data-signals-refresh':'',onclick:()=>load(false)},s('updates.refresh'))),
      el('p.small.muted',s('updates.signals_basis')));
    if(failed)host.append(el('div.errbox',el('p',s('updates.signals_error')),
      el('button.btn.btn-ghost',{type:'button',disabled:pending,'data-signals-retry':'',onclick:()=>load(failedMore)},s('common.retry'))));
    if(ready&&!items.length&&!failed)host.append(el('p.muted',s('updates.signals_empty')));
    for(const row of items) {
      const current=row.content_status==='current',tk=tickerPattern.test(row.ticker)?row.ticker:'',source=current?sourceURL(row.source_url):null;
      const title=current?((LANG==='en'?row.title_en:null)||row.title||s('updates.signal_unavailable')):
        s(row.content_status==='superseded'?'updates.signal_superseded':'updates.signal_unavailable');
      const status=['queued','sent','failed','cancelled','unknown'].includes(row.delivery?.status)?row.delivery.status:'unknown';
      const statusKey=['unknown','cancelled'].includes(status)?'screen.delivery_'+status:'updates.signal_'+(status==='queued'?'queued_state':status);
      const kindKey='radar.kind_'+row.kind,kindLabel=s(kindKey);
      const card=el('article.card.signal-inbox-item',{'data-signal-id':row.id},
        el('div.updates-item-top',tk?el('strong.mono','$'+tk):null,el('span.chip',kindLabel===kindKey?s('updates.signals_title'):kindLabel)),el('h3',title));
      card.append(el('p.small.signal-delivery',s('updates.signal_delivery')+' · '+s(statusKey)));
      const dates=el('details.updates-detail',el('summary',s('updates.permalink')));
      for(const [label,value] of [['signal_published',row.published_at],['signal_observed',row.observed_at],['signal_queued',row.queued_at]])
        dates.append(el('p.small.muted',s('updates.'+label)+' · '+date(value)));
      if(current&&row.effective_at)dates.append(el('p.small',s('event.effective_date')+' · '+date(row.effective_at)));
      card.append(dates);
      const actions=el('div.radar-record-actions');
      if(tk&&row.kind==='ticker-brief')actions.append(el('a.btn.btn-ghost.btn-sm',{href:'#/briefing?ticker='+encodeURIComponent(tk)},s('stockbrief.open')));
      else if(tk)actions.append(el('a.btn.btn-ghost.btn-sm',{href:'#/research/'+encodeURIComponent(tk)},s('watch.research_record')),
        el('a.btn.btn-ghost.btn-sm',{href:'#/boards?mode=archive&ticker='+encodeURIComponent(tk)},s('updates.signal_radar')));
      if(current && row.kind!=='ticker-brief' && /^[a-zA-Z0-9][a-zA-Z0-9:._-]{0,149}$/.test(row.source_record_id||''))actions.append(el('a.btn.btn-ghost.btn-sm',{href:recordHref({id:row.source_record_id})},s('reader.open')));
      if(source)actions.append(el('a.btn.btn-ghost.btn-sm',{href:source,target:'_blank',rel:'noopener noreferrer'},s('boards.source')+' ↗'));
      card.append(actions);host.append(card);
    }
    if(cursor)host.append(el('button.btn.btn-ghost',{type:'button',disabled:pending,'data-signals-more':'',onclick:()=>load(true)},s('updates.signals_more')));
    if(pending)host.append(el('p.small.muted',{role:'status'},s('common.loading')));
  }
  async function load(more=false) {
    if(!valid()||document.visibilityState==='hidden'||pending)return;
    pending=true;failed=false;failedMore=more;const run=++version;ctl=new AbortController();render();
    const params=new URLSearchParams({limit:'30'});if(more&&cursor)params.set('before_id',cursor);
    try{
      const doc=await api.get('/signals/inbox?'+params,{signal:ctl.signal,silent402:true});
      if(run!==version||!valid())return;
      if(!Array.isArray(doc?.items)||api.isAccepted(doc))throw Error('invalid_response');
      items=[...new Map([...(more?items:[]),...doc.items].map(row=>[String(row.id),row])).values()];
      cursor=doc.next_cursor||null;ready=true;
    }catch(error){if(run===version&&valid()){if(error.status===402){reset();onLoseAccess();return;}failed=true;}}
    finally{if(run===version){pending=false;render();}}
  }
  function reset(){version++;ctl?.abort();items=[];cursor=null;pending=false;ready=false;failed=false;if(host)clear(host);}
  return {load,reset,render(){host=el('section.card.signal-inbox');render();return host;},dispose(){reset();host=null;}};
}
