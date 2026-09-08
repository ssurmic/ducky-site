import {el,clear,spinner,errorBox,modal,closeModal} from '../ui.js';
import {s,LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {factText} from './stock-briefs.js';

const pick=v=>v?.[LANG==='en'?'en':'zh']||'';
const tickerOK=v=>/^[A-Z][A-Z0-9.\-]{0,9}$/.test(v||'');
const time=v=>{const d=new Date(v);return v&&Number.isFinite(d.getTime())?d.toISOString().replace('T',' ').slice(0,16)+' UTC':'—';};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'—';
function source(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const position=v=>{const n=Math.floor(v);return Number.isFinite(n)?Math.floor(n/60)+':'+String(n%60).padStart(2,'0'):'';};
const factDescription=e=>e.topic==='price_gaps'?(e.data?.gaps?.length?e.data.gaps.map(g=>`${g.date} · $${g.lower}–$${g.upper}`).join(' / '):s('evidence.no_gaps')):factText(e);
const missingLabel=k=>k.startsWith('ytd_')?s('evidence.missing_ytd',{benchmark:k.slice(4)}):k==='price_gaps'?s('evidence.missing_gaps'):s('stockbrief.missing_'+k);
const textIndex=n=>JSON.stringify([n.title,n.reason,n.intent,n.published_at,...(n.evidence||[]).map(e=>[e.author,e.title,e.reason,e.topic,e.data,e.published_at])]).toLowerCase();

export function detail(node){
  const body=el('div.evidence-detail',el('p.evidence-stance',{class:'is-'+node.stance},s('evidence.'+node.stance)),
    node.conditional?el('p.data-notice',s('evidence.conditional')):null,
    pick(node.reason)?el('p',pick(node.reason)):null);
  for(const e of node.evidence||[]){
    const item=el('article.evidence-source',el('h3',e.author||s('evidence.recorded_data')),
      e.kind==='fact'?el('p',factDescription(e)):el('p',pick(e.reason)||pick(e.title)),
      e.published_at?el('p.small.muted',s('evidence.published',{at:date(e.published_at)})):null,
      el('p.small.muted',s('evidence.observed',{at:time(e.observed_at)})),
      e.retrieved_at?el('p.small.muted',s('evidence.retrieved',{at:Array.isArray(e.retrieved_at)?e.retrieved_at.map(time).join(' / '):time(e.retrieved_at)})):null,
      Number.isFinite(e.start_seconds)?el('p.small.muted',s('evidence.segment',{start:position(e.start_seconds),end:position(e.end_seconds)})):null);
    if(e.freshness==='stale')item.append(el('p.data-notice',s('evidence.stale_source')));
    const href=source(e.source_url);
    if(href)item.append(el('a.btn.btn-ghost.btn-sm',{href,target:'_blank',rel:'noopener noreferrer'},s('evidence.open_source')+' ↗'));
    else item.append(el('p.small.muted',s(e.kind==='fact'?'evidence.saved_calculation':'evidence.no_source_link')));
    const audit=el('details',el('summary',s('evidence.record_details')),
      el('p.small.muted',s('evidence.linked',{at:time(node.recorded_at)})),
      e.source_hash?el('p.evidence-hash.mono',e.source_hash):null);
    if(e.kind==='fact')audit.append(el('pre.evidence-facts',JSON.stringify(e.data,null,2)));
    item.append(audit);body.append(item);
  }
  if(node.evidence_omitted)body.append(el('p.small.muted',s('evidence.more_sources',{n:node.evidence_omitted})));
  modal(pick(node.title),body);
}

export function mapView(doc,{archive=false}={}){
  const nodes=Array.isArray(doc.nodes)?doc.nodes:[],view=el('section.evidence-workspace');
  const summary=el('div.evidence-takeaway',el('span.eyebrow',s('evidence.takeaway')),
    el('p',pick(doc.summary)||s('evidence.summary_'+(doc.summary_status==='insufficient'?'insufficient':'pending'))));
  if(doc.summary){
    for(const ref of doc.summary.citations||[]){
      const index=nodes.findIndex(n=>n.id===ref);if(index<0)continue;
      summary.append(el('button.brief-citation',{type:'button',onclick:()=>detail(nodes[index]),'aria-label':s('evidence.citation',{n:index+1})},String(index+1)));
    }
  }
  view.append(summary);
  if(archive)view.append(el('p.data-notice',s('evidence.archive',{at:time(doc.recorded_at)})));
  if(doc.status==='stale')view.append(el('p.data-notice',s('evidence.stale')));
  if(doc.withdrawn)view.append(el('p.data-notice',s('evidence.withdrawn',{n:doc.withdrawn})));
  if(!nodes.length){view.append(el('p.empty',s('evidence.empty')),el('a.btn.btn-ghost',{href:'#/research/'+doc.ticker},s('evidence.records')));return view;}
  let scope='all',query='',limit=6;
  const search=el('input.input',{type:'search',placeholder:s('evidence.find'),maxlength:120,'aria-label':s('evidence.find'),oninput:()=>{query=search.value.toLowerCase().trim();limit=6;paint();}});
  const filters=el('div.evidence-filters',{'aria-label':s('evidence.filter')});
  const controls=[];
  const filterSelect=el('select.input.evidence-filter-select',{'aria-label':s('evidence.filter'),onchange:()=>{scope=filterSelect.value;limit=6;paint();}});
  for(const key of ['all','support','counter','context']){
    const count=key==='all'?nodes.length:nodes.filter(n=>n.stance===key).length;
    const button=el('button.btn.btn-ghost.btn-sm',{type:'button','aria-pressed':key==='all'?'true':'false',onclick:()=>{scope=key;limit=6;paint();}},s('evidence.filter_'+key)+' · '+count);
    controls.push([key,button]);filters.append(button);
    filterSelect.append(el('option',{value:key},s('evidence.filter_'+key)+' · '+count));
  }
  view.append(el('div.evidence-tools',search,filterSelect,filters));
  const branches=el('div.evidence-branches');
  const center=el('div.evidence-center',el('span.mono','$'+doc.ticker),el('strong',s('evidence.viewpoints')),
    el('span.small.muted',s(nodes.length===1?'evidence.recorded_single':'evidence.recorded_count',{n:nodes.length})));
  view.append(el('div.evidence-map',center,branches));
  const total=el('p.small.muted',{'aria-live':'polite'});
  const more=el('button.btn.btn-ghost',{type:'button',onclick:()=>{limit+=12;paint();}},s('evidence.more'));
  view.append(total,more);
  function paint(){
    controls.forEach(([key,b])=>b.setAttribute('aria-pressed',String(key===scope)));filterSelect.value=scope;
    const filtered=nodes.filter(n=>(scope==='all'||n.stance===scope)&&(!query||textIndex(n).includes(query)));
    // Balanced first screen; selecting All never silently buries opposition.
    const first=[];
    if(scope==='all'&&!query){for(const stance of ['support','counter','context'])first.push(...filtered.filter(n=>n.stance===stance).slice(0,2));}
    const ordered=[...first,...filtered.filter(n=>!first.includes(n))];
    clear(branches);
    for(const node of ordered.slice(0,limit)){
      const authors=[...new Set((node.evidence||[]).map(e=>e.author).filter(Boolean))];
      const card=el('button.evidence-node',{type:'button',class:'is-'+node.stance,onclick:()=>detail(node)},
        el('span.evidence-node-label',s('evidence.'+node.stance),node.conditional?el('span',s('evidence.condition_tag')):null),
        el('strong',pick(node.title)),
        el('span.small.muted',authors.join(' · ')||s('evidence.recorded_data')),
        el('span.evidence-node-footer',el('span',date(node.published_at||node.observed_at)),
          el('span',s((node.evidence||[]).length===1?'evidence.source_single':'evidence.sources',{n:(node.evidence||[]).length})+' ↗')));
      branches.append(card);
    }
    if(!filtered.length)branches.append(el('p.empty',s('evidence.no_match')));
    total.textContent=s('evidence.showing',{shown:Math.min(limit,filtered.length),total:filtered.length});
    more.hidden=filtered.length<=limit;
  }
  paint();
  const coverage=doc.coverage||{},jobs=coverage.jobs||{};
  const details=el('details.evidence-coverage',el('summary',s('evidence.coverage')),
    el('p',s('evidence.count_basis')),el('p.small.muted',s('evidence.checked',{at:time(doc.checked_at)})),
    el('p',s('evidence.corpus',{n:coverage.corpus_documents??'—',pending:(jobs.pending||0)+(jobs.retry||0)+(jobs.waiting||0)+(jobs.building||0),failed:jobs.failed||0})),
    el('p.small.muted',s('evidence.coverage_basis')));
  if(doc.missing?.length)details.append(el('p.data-notice',s('evidence.missing')+' '+doc.missing.map(missingLabel).join(' · ')));
  if(doc.omitted)details.append(el('p.data-notice',s('evidence.omitted',{n:doc.omitted})));
  details.append(el('a.btn.btn-ghost.btn-sm',{href:'#/research/'+doc.ticker},s('evidence.records')));view.append(details);
  return view;
}

export async function mount(root,route={}){
  root.classList.add('evidence-view');
  const ctl=new AbortController(),epoch=store.epoch();let alive=true,request=0;
  const valid=id=>alive&&!ctl.signal.aborted&&epoch===store.epoch()&&(id==null||id===request);
  let ticker=String(route.ticker||'').toUpperCase();
  if(!tickerOK(ticker))ticker=(store.get('watchlist')||[]).find(tickerOK)||'';
  root.append(el('div.view-head',el('h1',s('evidence.title'))),el('p.view-intro',s('evidence.intro')));
  const input=el('input.input',{type:'search',value:ticker,placeholder:'AVGO / ORCL','aria-label':s('evidence.ticker'),maxlength:10});
  root.append(el('form.add-row.evidence-ticker',{onsubmit:e=>{e.preventDefault();const t=input.value.trim().toUpperCase().replace(/^\$/,'');if(tickerOK(t))location.hash='#/evidence/'+t;}},input,
    el('button.btn.btn-ghost',{type:'submit'},s('evidence.load'))));
  const favorites=el('div.evidence-watchlist');
  for(const t of (store.get('watchlist')||[]).filter(tickerOK).slice(0,20))favorites.append(el('a.chip',{href:'#/evidence/'+t,'aria-current':t===ticker?'page':null},t));
  root.append(favorites);
  const host=el('div');root.append(host);
  async function load(version=null){
    const id=++request;closeModal();clear(host);
    if(!store.isPro()){
      host.append(el('section.card',el('h2',s('evidence.pro_title')),el('p',s('evidence.pro_note')),
        el('a.btn.btn-primary',{href:'#/billing'},s('radar.access_upgrade'))));return;
    }
    if(!ticker){host.append(el('p.empty',s('evidence.choose')));return;}
    host.append(spinner());
    try{
      const doc=await api.get('/evidence/'+ticker+(version?'?version='+encodeURIComponent(version):''),{signal:ctl.signal,silent402:true});
      if(!valid(id)||!store.isPro())return;
      if(!doc||doc.ticker!==ticker||!Array.isArray(doc.nodes))throw Error('invalid_response');
      clear(host);host.append(mapView(doc,{archive:!!version}));
      const historyPanel=el('div.evidence-history');let cursor=null;
      const historyButton=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:async()=>{
        historyButton.disabled=true;
        try{
          const q=new URLSearchParams({limit:'10'});if(cursor)q.set('before',cursor);
          const archive=await api.get('/evidence/'+ticker+'/history?'+q,{signal:ctl.signal,silent402:true});
          if(!valid(id)||!store.isPro())return;
          for(const row of archive.items||[])historyPanel.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load(row.id)},time(row.recorded_at)));
          cursor=archive.next_cursor;historyButton.hidden=!cursor;historyButton.textContent=s('evidence.more');
        }catch(error){if(valid(id))historyPanel.append(errorBox(error));}
        finally{historyButton.disabled=false;}
      }},s('evidence.history'));
      host.append(el('div.evidence-links',el('a.btn.btn-ghost.btn-sm',{href:'#/briefing?ticker='+ticker},s('nav.briefing')),
        el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+ticker},s('radar.chart')),historyButton,
        version?el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load()},s('evidence.latest')):null),historyPanel);
    }catch(error){if(valid(id)){clear(host);host.append(errorBox(error,()=>load(version)));}}
  }
  const unsubs=[store.subscribe('me',()=>load())];
  const cleanup=()=>{alive=false;request++;ctl.abort();unsubs.forEach(fn=>fn());closeModal();};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  if(route.signal?.aborted)cleanup();else await load();
  return cleanup;
}
