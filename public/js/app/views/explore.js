import {el,clear,spinner} from '../ui.js';
import {s,LANG} from '../strings.js';
import {symbolPicker} from '../symbol-picker.js';
import {stockHref} from '../stock-reading.js';
import {mount as researchFeed} from './today.js';
import {discoveryRows,discoveryStockRow,discoveryDate} from '../explore-discovery.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {icon} from '../icons.js';

let readingState=null;

export async function mount(root,{signal}={}){
  root.classList.add('focus-explore','explore-research');
  const epoch=store.epoch(),saved=readingState?.epoch===epoch?readingState:null;
  const controller=new AbortController();
  let disposed=false,query=saved?.query||'',feedDispose=null,feedLoading=false,feedLoaded=false,sequence=0,lastDoc=null;
  const current=()=>!disposed&&!signal?.aborted&&store.epoch()===epoch;
  const input=el('input.input',{type:'search',value:query,placeholder:s('focus.find_stock'),'aria-label':s('focus.find_stock'),autocomplete:'off'});
  input.addEventListener('input',()=>{query=input.value;remember();});
  const picker=symbolPicker(input,()=>[],{allowWatched:true,onSelect:row=>{remember();location.hash=stockHref(row.ticker,'explore');}});
  const tools=el('nav.explore-primary-tools',{'aria-label':s('explore.destinations')},
    el('a',{href:'#/explore','aria-current':'page'},icon('evidence'),s('explore.stock_research')),
    el('a',{href:'#/boards'},icon('boards'),s('explore.company_activity')),
    el('a',{href:'#/creators?scope=discover'},icon('creators'),s('focus.explore_creators')));
  root.append(el('header.focus-heading',el('div',el('h1',s('focus.explore')),el('p.muted',s('explore.intro')))),tools,picker.wrap);

  const notice=el('div.explore-read-notice',{'aria-live':'polite'}),list=el('div.explore-stock-list');
  const date=el('p.small.muted.explore-data-date');
  const refresh=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load()},s('watch.refresh'));
  const candidates=el('section.explore-candidates',{'aria-label':s('focus.discover_title')},
    el('header.explore-section-heading',el('h2',s('focus.discover_title')),refresh),date,notice,list);
  list.append(spinner());root.append(candidates);

  const context=el('details.explore-context',el('summary',s('explore.reading_question')),
    el('ol',el('li',s('explore.question_business')),el('li',s('explore.question_evidence')),el('li',s('explore.question_event'))));
  const feed=el('div.explore-week-feed');
  const weekly=el('details.explore-weekly',{'data-reading-key':'explore:weekly',open:saved?.expanded===true},
    el('summary',el('span',s('focus.discover_research')),el('span.small.muted',s('explore.optional_feed'))),
    el('p.small.muted',s('focus.discover_research_note')),feed);
  weekly.addEventListener('toggle',()=>{if(!current())return;remember();if(weekly.open)loadFeed();});
  root.append(context,weekly,
    el('details.explore-more-tools',el('summary',s('focus.tools_title')),el('nav.focus-tool-links',{'aria-label':s('focus.tools_title')},
      el('a.btn.btn-ghost',{href:'#/evidence'},s('focus.explore_map')),
      ...[['opportunities','opportunities'],['vibe','vibe'],['reports','reports'],['briefing','briefing'],['chart','chart'],['alerts','alerts']].map(([route,key])=>
        el('a.btn.btn-ghost',{href:'#/'+route},s('nav.'+key))))));

  function remember(){if(!disposed&&store.epoch()===epoch)readingState={epoch,query,expanded:weekly.open};}
  async function loadFeed(){
    if(!current()||feedLoading||feedLoaded)return;
    feedLoading=true;
    try{
      const dispose=await researchFeed(feed,{signal:controller.signal,scope:'all',embedded:true,initialDays:7});
      if(!current()){dispose?.();return;}feedDispose=dispose;feedLoaded=true;
    }catch{if(current())clear(feed).append(el('p.small.muted',s('focus.research_read_failed')),el('button.btn.btn-ghost',{type:'button',onclick:()=>loadFeed()},s('common.retry')));}
    finally{feedLoading=false;}
  }
  function render(doc){
    const rows=discoveryRows(doc,LANG);
    const focus=document.activeElement?.dataset.exploreLink;
    clear(list);clear(notice);
    date.textContent=s('explore.discussion_date',{date:discoveryDate(doc?.collected_at)});
    if(doc?.status==='stale')notice.append(el('p.small.muted',s('explore.discussion_stale')));
    if(rows.length)list.append(...rows.map(discoveryStockRow));
    else list.append(el('div.explore-empty',el('p',s('explore.discussion_empty')),el('button.btn.btn-ghost',{type:'button',onclick:()=>input.focus()},s('explore.search_instead'))));
    if(focus)Array.from(list.querySelectorAll('[data-explore-link]')).find(node=>node.dataset.exploreLink===focus)?.focus({preventScroll:true});
  }
  async function load(){
    const mine=++sequence;refresh.disabled=true;refresh.setAttribute('aria-busy','true');
    clear(notice);
    try{
      const doc=await api.get('/radar/social.json',{signal:controller.signal,silent402:true,observe:false});
      if(!current()||mine!==sequence)return;
      if(!doc||!Array.isArray(doc.items)||!['ready','stale','pending','unavailable','empty'].includes(doc.status))throw new api.ApiError(502,{error:'invalid_discovery_response'});
      lastDoc=doc;render(doc);
    }catch(error){
      if(!current()||mine!==sequence)return;
      if(!lastDoc||[401,402,403,404,410].includes(error.status)){lastDoc=null;clear(list);date.textContent='';}
      clear(notice).append(el('p.small.muted',s(lastDoc?'explore.discussion_refresh_failed':'explore.discussion_unavailable')),
        el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load()},s('common.retry')));
    }finally{if(current()&&mine===sequence){refresh.disabled=false;refresh.removeAttribute('aria-busy');}}
  }
  function dispose(){if(disposed)return;remember();disposed=true;controller.abort();picker.dispose();feedDispose?.();signal?.removeEventListener('abort',dispose);}
  signal?.addEventListener('abort',dispose,{once:true});
  if(signal?.aborted){dispose();return dispose;}
  if(weekly.open)loadFeed();
  await load();
  return dispose;
}
