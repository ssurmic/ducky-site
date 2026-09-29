// Saved Explore candidates. Membership changes only through the parent’s existing
// explicit Add action; rank never grants eligibility or implies a bullish view.
import {el,clear,spinner,pct} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';
import {discoveryRows,discoveryDate} from './explore-discovery.js';

export function watchlistStarters({signal,current=()=>true,watched=()=>[],actionState=()=>({}),onAdd,onDone}={}){
  const controller=new AbortController();
  let disposed=false,busy=false,pending=null;
  const entries=new Map();
  const valid=()=>!disposed&&!signal?.aborted&&current();
  const date=el('p.small.muted.watch-starters-date',{hidden:true});
  const status=el('div.watch-starters-status',{'aria-live':'polite'});
  const list=el('div.watch-starters-list');
  const done=el('button.btn.btn-primary.watch-starters-done',{type:'button',hidden:true,onclick:()=>{if(valid()&&!pending)onDone?.();}});
  const more=el('a',{href:'#/explore'},s('watch.first_use_more'));
  const node=el('section.watch-first-use',{'aria-label':s('explore.discussion_title')},
    el('header.watch-starters-heading',el('h2',s('explore.discussion_title')),
      more,done),date,
    el('p.small.muted.watch-starters-basis',s('explore.attention_only')),status,list);
  async function load(){
    if(!valid()||busy)return;
    busy=true;clear(status).append(spinner());
    try{
      const doc=await api.get('/radar/social.json',{signal:controller.signal,silent402:true,observe:false});
      if(!valid())return;
      if(!doc||!Array.isArray(doc.items)||!['ready','stale','pending','unavailable','empty'].includes(doc.status))throw new api.ApiError(502,{error:'invalid_discovery_response'});
      clear(status);clear(list);entries.clear();
      const dated=typeof doc.collected_at==='string'&&Number.isFinite(Date.parse(doc.collected_at));
      date.hidden=!dated;date.textContent=dated?s('explore.discussion_date',{date:discoveryDate(doc.collected_at)}):'';
      const rows=discoveryRows(doc,LANG).slice(0,6);
      if(doc.status==='stale')status.append(el('p.small.muted',s('explore.discussion_stale')));
      for(const row of rows){
        const href='#/stock/'+encodeURIComponent(row.ticker);
        const count=Number.isFinite(row.mentions)?s('focus.discover_mentions',{n:new Intl.NumberFormat(LANG==='zh'?'zh-CN':'en-US').format(row.mentions)}):s('explore.mentions_unknown');
        const source=doc.items.find(item=>item?.ticker===row.ticker&&item.rank===row.rank),summaryDate=source?.overall_as_of;
        const summary=row.summary&&typeof summaryDate==='string'&&Number.isFinite(Date.parse(summaryDate))?row.summary:'';
        const feedback=el('p.watch-starter-feedback',{hidden:true,role:'status'});
        const button=el('button.btn.btn-primary.btn-sm.watch-starter-add',{type:'button',onclick:()=>add(row)},s('watch.add_to_watchlist'));
        if(typeof onAdd!=='function')button.hidden=true;
        entries.set(row.ticker,{button,feedback});
        list.append(el('article.watch-starter',{'data-ticker':row.ticker},
          el('a.watch-starter-open',{href,'data-reading-key':'watch-starter:'+row.ticker,
            'aria-label':s('explore.research_stock',{ticker:row.ticker})},
            el('span.watch-starter-identity',el('strong',row.ticker),row.company&&row.company!==row.ticker?el('span',row.company):null)),
          el('p.watch-starter-count',count,Number.isFinite(row.attentionChange)?el('span.muted',s('focus.discover_change',{n:pct(row.attentionChange,0)})):null),
          summary?el('div.watch-starter-reading',el('p',summary),el('small.muted',s('watch.starter_reading_date',{date:discoveryDate(summaryDate)}))):null,
          el('div.watch-starter-actions',button,
            el('a.watch-starter-research',{href},s('focus.open_stock')),
            el('a.watch-starter-map',{href:href+'?tab=evidence','aria-label':s('watch.open_stock_map',{ticker:row.ticker})},s('watch.open_map'))),feedback));
      }
      update();
      if(!rows.length)status.append(el('p.small.muted',s(doc.status==='pending'?'watch.first_use_pending':doc.status==='unavailable'?'explore.discussion_unavailable':'explore.discussion_empty')));
      if(['pending','unavailable'].includes(doc.status))status.append(retry());
    }catch(error){
      if(!valid())return;
      clear(list);entries.clear();date.hidden=true;date.textContent='';
      clear(status).append(el('p.small.muted',s('explore.discussion_unavailable')),retry());
    }finally{busy=false;}
  }
  function update(){
    if(!valid())return;
    const state=actionState(),membership=watched();
    for(const [ticker,{button}] of entries){
      const added=membership.includes(ticker),working=pending===ticker;
      button.disabled=added||!!pending||!!state.disabled;
      button.classList.toggle('is-added',added);
      button.textContent=added?s('watch.starter_added'):working?s('watch.adding'):state.label||s('watch.add_to_watchlist');
      button.setAttribute('aria-label',button.textContent+' · '+ticker);
      button.setAttribute('aria-busy',String(working&&!added));
    }
    more.hidden=!!membership.length;done.hidden=!membership.length;done.disabled=!!pending||!!state.pending;
    done.textContent=s('watch.starter_done',{n:membership.length});
  }
  async function add(row){
    if(!valid()||pending||actionState().disabled||watched().includes(row.ticker)||!onAdd)return;
    const entry=entries.get(row.ticker);pending=row.ticker;entry.feedback.hidden=true;update();
    const report=message=>{if(valid()){entry.feedback.textContent=message;entry.feedback.hidden=false;}};
    try{
      const added=await onAdd(row,report);
      if(valid()&&!added&&entry.feedback.hidden)report(s('watch.starter_add_failed'));
    }catch{report(s('watch.starter_add_failed'));}
    finally{pending=null;update();}
  }
  const retry=()=>el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:load},s('common.retry'));
  function dispose(){if(disposed)return;disposed=true;controller.abort();signal?.removeEventListener('abort',dispose);}
  signal?.addEventListener('abort',dispose,{once:true});
  load();
  return {node,dispose,update};
}
