import {el,clear,spinner,errorBox,modal,closeModal} from '../ui.js';
import {s,LANG} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {factText} from './stock-briefs.js';
import {waterLevel,marketDetail,priceBadge} from '../evidence-context.js';
import {icon} from '../icons.js';

const pick=v=>v?.[LANG==='en'?'en':'zh']||'';
const original=v=>pick(v)||v?.en||v?.zh||'';
const tickerOK=v=>/^[A-Z][A-Z0-9.\-]{0,9}$/.test(v||'');
const time=v=>{const d=new Date(v);return v&&Number.isFinite(d.getTime())?d.toISOString().replace('T',' ').slice(0,16)+' UTC':'—';};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'—';
function source(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const position=v=>{const n=Math.floor(v);return Number.isFinite(n)?Math.floor(n/60)+':'+String(n%60).padStart(2,'0'):'';};
const factDescription=e=>e.topic==='price_gaps'?(e.data?.gaps?.length?e.data.gaps.map(g=>`${g.date} · $${g.lower}–$${g.upper}`).join(' / '):s('evidence.no_gaps')):factText(e);
const missingLabel=k=>k.startsWith('ytd_')?s('evidence.missing_ytd',{benchmark:k.slice(4)}):k==='price_gaps'?s('evidence.missing_gaps'):s('stockbrief.missing_'+k);

export function detail(node){
  const body=el('div.evidence-detail',node.priority?el('p.small.muted',s('evidence.priority_'+node.priority)):null,el('p.evidence-stance',{class:'is-'+node.stance},s('evidence.'+node.stance)),
    node.conditional?el('p.data-notice',s('evidence.conditional')):null,
    pick(node.reason)?el('p',pick(node.reason)):null);
  for(const e of node.evidence||[]){
    const explanation=e.kind==='fact'?factDescription(e):pick(e.reason)||pick(e.title);
    const item=el('article.evidence-source',el('h3',e.author||s('evidence.recorded_data')),
      original(e.original_title)?el('div.evidence-original',el('span.small.muted',s('evidence.original_only')),el('p',original(e.original_title))):null,
      explanation&&explanation!==pick(node.reason)?el('p',explanation):null,
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

// Layout is native CSS; the light SVG layer only connects the actual rendered nodes.
// Observe cards as well as the canvas so wrapping, search and font loading stay aligned.
export function connectMap(map,center,branches){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('class','evidence-connections');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  map.prepend(svg);
  function shape(tag,attrs){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));svg.append(n);}
  function draw(){
    clear(svg);if(!map.isConnected)return;
    const box=map.getBoundingClientRect(),root=center.getBoundingClientRect();
    if(!box.width||!box.height)return;
    svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    const layout=window.getComputedStyle(map).getPropertyValue('--evidence-layout').trim();
    const cards=[...branches.querySelectorAll('.evidence-node')];
    const groups=layout==='tree'?[...branches.querySelectorAll('.evidence-group')]:[];
    if(layout==='tree'&&cards.length){
      const x=10,y=root.bottom-box.top,rx=root.left-box.left+root.width/2;
      const last=groups.at(-1)?.querySelector('.evidence-group-heading')?.getBoundingClientRect()||cards.at(-1).getBoundingClientRect();
      shape('path',{class:'evidence-trunk',d:`M ${rx} ${y} C ${rx} ${y+12}, ${x} ${y+8}, ${x} ${y+24} V ${last.top-box.top+last.height/2}`});
      for(const group of groups){
        const h=group.querySelector('.evidence-group-heading').getBoundingClientRect(),end=group.querySelector('.evidence-node:last-child').getBoundingClientRect();
        const gy=h.top-box.top+h.height/2,gx=h.left-box.left,tone=['support','counter','context'].find(k=>group.classList.contains('is-'+k));
        shape('path',{class:'evidence-wire is-'+tone,d:`M ${x} ${gy} H ${gx}`});
        shape('path',{class:'evidence-wire evidence-leaf-trunk is-'+tone,d:`M ${gx+8} ${h.bottom-box.top} V ${end.top-box.top+end.height/2-8}`});
      }
    }
    for(const card of cards){
      const b=card.getBoundingClientRect();let x,y,rx,ry,d;
      if(layout==='radial'){
        const left=b.left<root.left;
        x=(left?b.right:b.left)-box.left;y=b.top-box.top+b.height/2;
        rx=(left?root.left:root.right)-box.left;ry=root.top-box.top+root.height/2;
        const mid=(rx+x)/2;d=`M ${rx} ${ry} C ${mid} ${ry}, ${mid} ${y}, ${x} ${y}`;
      }else if(layout==='tree'){
        x=b.left-box.left;y=b.top-box.top+b.height/2;
        const h=card.closest('.evidence-group')?.querySelector('.evidence-group-heading')?.getBoundingClientRect();
        rx=h?h.left-box.left+8:10;
        d=`M ${rx} ${y-8} Q ${rx} ${y}, ${rx+8} ${y} H ${x}`;
      }else{
        x=b.left-box.left+b.width/2;y=b.top-box.top;
        rx=root.left-box.left+root.width/2;ry=root.bottom-box.top;
        const mid=ry+(y-ry)/2;d=`M ${rx} ${ry} C ${rx} ${mid}, ${x} ${mid}, ${x} ${y}`;
      }
      const tone=['support','counter','context'].find(k=>card.classList.contains('is-'+k))||'context';
      shape('path',{class:'evidence-wire is-'+tone,d});
      shape('circle',{class:'evidence-port is-'+tone,cx:x,cy:y,r:3});
    }
  }
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(draw);
  return {
    refresh(){observer?.disconnect();observer?.observe(map);observer?.observe(center);branches.querySelectorAll('.evidence-node,.evidence-group-heading').forEach(n=>observer?.observe(n));draw();},
    dispose(){observer?.disconnect();clear(svg);}
  };
}

export function mapView(doc,{archive=false,onPickTicker}={}){
  const nodes=Array.isArray(doc.nodes)?doc.nodes:[],view=el('section.evidence-workspace');
  const sentence=el('p',pick(doc.summary)||s('evidence.summary_'+(doc.summary_status==='insufficient'?'insufficient':'pending')));
  const summary=el('div.evidence-takeaway',{class:doc.summary?'':'is-pending'},el('span.evidence-summary-icon',icon('briefing')),
    el('div.evidence-summary-copy',el('span.eyebrow',s('evidence.takeaway')),sentence));
  if(doc.summary){
    for(const ref of doc.summary.citations||[]){
      const index=nodes.findIndex(n=>n.id===ref);if(index<0)continue;
      sentence.append(el('button.brief-citation',{type:'button',onclick:()=>detail(nodes[index]),'aria-label':s('evidence.citation',{n:index+1})},String(index+1)));
    }
  }
  view.append(summary);
  if(archive)view.append(el('p.data-notice',s('evidence.archive',{at:time(doc.recorded_at)})));
  if(doc.status==='stale')view.append(el('p.data-notice',s('evidence.stale')));
  if(doc.withdrawn)view.append(el('p.data-notice',s('evidence.withdrawn',{n:doc.withdrawn})));
  if(!nodes.length){view.append(el('p.empty',s('evidence.empty')),el('a.btn.btn-ghost',{href:'#/research/'+doc.ticker},s('evidence.records')));return view;}
  let scope='all',limit=6;
  const filters=el('div.evidence-filters',{'aria-label':s('evidence.filter')});
  const controls=[];
  const filterSelect=el('select.input.evidence-filter-select',{'aria-label':s('evidence.filter'),onchange:()=>{scope=filterSelect.value;limit=6;paint();}});
  for(const key of ['all','support','counter','context']){
    const count=key==='all'?nodes.length:nodes.filter(n=>n.stance===key).length;
    const button=el('button.btn.btn-ghost.btn-sm',{type:'button',class:'is-'+key,'aria-pressed':key==='all'?'true':'false',onclick:()=>{scope=key;limit=6;paint();}},el('span',s('evidence.filter_'+key)),el('span.evidence-filter-count',String(count)));
    controls.push([key,button]);filters.append(button);
    filterSelect.append(el('option',{value:key},s('evidence.filter_'+key)+' · '+count));
  }
  view.append(el('div.evidence-tools',filterSelect,filters));
  const reset=el('button.evidence-reset-filter',{type:'button',onclick:()=>{scope='all';limit=6;paint();}},s('evidence.clear_filter'));view.append(reset);
  const branches=el('div.evidence-branches');
  const level=waterLevel(doc),pending=Object.entries(doc.ticker_coverage?.jobs||{}).filter(([k])=>['pending','retry','waiting','building'].includes(k)).reduce((n,[,v])=>n+v,0);
  const center=el('div.evidence-center',{class:level===null?'is-unmetered':'has-water',style:level===null?{}:{'--water-height':String(Math.round(level*100))+'%','--water-color':`hsl(${Math.round(35+level*125)} 40% 48%)`}},el('span.evidence-water',{'aria-hidden':'true'}),el('span.mono',doc.ticker),
    onPickTicker?el('button.evidence-stock-trigger',{type:'button',onclick:onPickTicker,'aria-label':s('evidence.change_ticker',{ticker:doc.ticker})},doc.ticker,el('span',{'aria-hidden':'true'},'⌄')):null,
    priceBadge(doc),el('button.evidence-water-caption',{type:'button',onclick:()=>marketDetail(doc)},s('evidence.water_short')),
    el('div.evidence-center-info',el('span.small.muted',s(nodes.length===1?'evidence.recorded_single':'evidence.recorded_count',{n:nodes.length})),
      pending?el('span.evidence-mobile-state',s('evidence.queue_short',{n:pending})):!doc.summary?el('span.evidence-mobile-state',sentence.textContent):null));
  if(level!==null){center.style.setProperty('--water-height',Math.round(level*100)+'%');center.style.setProperty('--water-color',`hsl(${Math.round(35+level*125)} 40% 48%)`);}
  const map=el('div.evidence-map',center,branches);view.append(map);
  const connections=connectMap(map,center,branches);view.dispose=()=>connections.dispose();
  const total=el('p.small.muted',{'aria-live':'polite'});
  const more=el('button.btn.btn-ghost',{type:'button',onclick:()=>{limit=nodes.length;paint();}},s('evidence.show_all'));
  view.append(el('div.evidence-map-footer',total,more));
  function paint(){
    controls.forEach(([key,b])=>b.setAttribute('aria-pressed',String(key===scope)));filterSelect.value=scope;
    const filtered=nodes.filter(n=>scope==='all'||n.stance===scope);
    // Balanced first screen; selecting All never silently buries opposition.
    const first=[];
    if(scope==='all'){for(const stance of ['support','counter','context'])first.push(...filtered.filter(n=>n.stance===stance).slice(0,2));}
    const ordered=[...first,...filtered.filter(n=>!first.includes(n))];
    clear(branches);
    const groups=new Map();
    for(const stance of ['support','counter','context']){
      const count=filtered.filter(n=>n.stance===stance).length;if(!count)continue;
      const list=el('div.evidence-group-nodes');
      const group=el('section.evidence-group',{class:'is-'+stance},el('h2.evidence-group-heading',el('span',s('evidence.'+stance)),el('span.evidence-group-count',String(count))),list);
      groups.set(stance,{group,list});
    }
    const visible=ordered.slice(0,limit);
    center.style.gridRow='1 / '+(Math.min(3,Math.ceil(visible.length/2))+1);
    map.classList.toggle('is-empty',!visible.length);
    for(const [i,node] of visible.entries()){
      const authors=[...new Set((node.evidence||[]).map(e=>e.author).filter(Boolean))];
      const card=el('button.evidence-node',{type:'button',class:'is-'+node.stance,style:{gridColumn:i%2===0?'1':'3',gridRow:String(Math.floor(i/2)+1)},onclick:()=>detail(node)},
        el('span.evidence-node-label',el('span.evidence-category',s('evidence.'+node.stance)),
          node.priority?el('span.evidence-priority',s('evidence.priority_'+node.priority)):null,
          node.conditional?el('span.evidence-condition',s('evidence.condition_tag')):null,
          el('span.evidence-node-number',{'aria-hidden':'true'},String(nodes.indexOf(node)+1).padStart(2,'0'))),
        el('strong',pick(node.title)),
        original(node.original_title)?el('span.evidence-original-title',original(node.original_title)):null,
        el('span.evidence-node-author',icon(authors.length?'creators':'briefing'),el('span',authors.join(' · ')||s('evidence.recorded_data'))),
        el('span.evidence-node-mobile-meta',authors.length?el('span.evidence-mobile-author',authors.join(' · ')):null,el('span',date(node.published_at||node.observed_at)),!authors.length?el('span.evidence-mobile-count',s((node.evidence||[]).length===1?'evidence.source_single':'evidence.sources',{n:(node.evidence||[]).length})):null,node.conditional?el('span.evidence-condition',s('evidence.condition_tag')):null),
        el('span.evidence-node-footer',el('span',date(node.published_at||node.observed_at)),
          el('span',s((node.evidence||[]).length===1?'evidence.source_single':'evidence.sources',{n:(node.evidence||[]).length})+' ↗')));
      groups.get(node.stance)?.list.append(card);
    }
    for(const {group,list}of groups.values()){if(list.childElementCount)branches.append(group);}
    reset.hidden=scope==='all';
    if(!filtered.length)branches.append(el('p.empty',s('evidence.no_match')));
    total.textContent=s('evidence.showing',{shown:Math.min(limit,filtered.length),total:filtered.length});
    more.hidden=filtered.length<=limit;connections.refresh();
  }
  paint();
  const coverage=doc.coverage||{},jobs=coverage.jobs||{};
  if(pending)view.append(el('p.evidence-queue-note.small.muted',s('evidence.queue_short',{n:pending})+' · '+s('evidence.queue_note')));
  view.append(el('button.evidence-ordering',{type:'button',onclick:()=>modal(s('evidence.ordering'),el('p',s('evidence.ordering_note')))},s('evidence.ordering')));
  const details=el('details.evidence-coverage',el('summary',s('evidence.coverage')),
    el('p',s('evidence.count_basis')),el('p.small.muted',s('evidence.checked',{at:time(doc.checked_at)})),
    el('p',s('evidence.corpus',{n:coverage.corpus_documents??'—',pending:(jobs.pending||0)+(jobs.retry||0)+(jobs.waiting||0)+(jobs.building||0),failed:jobs.failed||0})),
    el('p.small.muted',s('evidence.coverage_basis')));
  for(const author of doc.ticker_coverage?.authors||[]){if(author.pending||author.failed)details.append(el('p.small',s('evidence.queue_author',author)));}
  if(doc.missing?.length)details.append(el('p.data-notice',s('evidence.missing')+' '+doc.missing.map(missingLabel).join(' · ')));
  if(doc.omitted)details.append(el('p.data-notice',s('evidence.omitted',{n:doc.omitted})));
  details.append(el('a.btn.btn-ghost.btn-sm',{href:'#/research/'+doc.ticker},s('evidence.records')));view.append(details);
  return view;
}

export async function mount(root,route={}){
  root.classList.add('evidence-view');
  const ctl=new AbortController(),epoch=store.epoch();let alive=true,request=0,currentMap=null;
  const valid=id=>alive&&!ctl.signal.aborted&&epoch===store.epoch()&&(id==null||id===request);
  let ticker=String(route.ticker||'').toUpperCase();
  if(!tickerOK(ticker))ticker=(store.get('watchlist')||[]).find(tickerOK)||'';
  function picker(){
    const field=el('input.input',{type:'search',value:ticker,placeholder:'AVGO / ORCL',maxlength:10,'aria-label':s('evidence.ticker')});
    const form=el('form.add-row.evidence-picker-form',{onsubmit:e=>{e.preventDefault();const t=field.value.trim().toUpperCase().replace(/^\$/,'');if(tickerOK(t)){closeModal();location.hash='#/evidence/'+t;}}},field,el('button.btn.btn-primary',{type:'submit'},s('evidence.load')));
    const list=el('div.evidence-picker-list');
    for(const t of(store.get('watchlist')||[]).filter(tickerOK))list.append(el('a.chip',{href:'#/evidence/'+t,'aria-current':t===ticker?'page':null,onclick:()=>closeModal()},t));
    modal(s('evidence.select_stock'),el('div',form,list));
  }
  const heading=el('header.evidence-heading',el('div.view-head',el('h1',s('evidence.title'))),
    el('div.evidence-mobile-actions',el('button.evidence-empty-picker',{type:'button',onclick:picker},ticker||s('evidence.select_stock'),' ⌄')));root.append(heading);
  const input=el('input.input',{type:'search',value:ticker,placeholder:'AVGO / ORCL','aria-label':s('evidence.ticker'),maxlength:10});
  heading.append(el('form.add-row.evidence-ticker',{onsubmit:e=>{e.preventDefault();const t=input.value.trim().toUpperCase().replace(/^\$/,'');if(tickerOK(t))location.hash='#/evidence/'+t;}},input,
    el('button.btn.btn-ghost',{type:'submit'},s('evidence.load'))));
  const favorites=el('div.evidence-watchlist');
  for(const t of (store.get('watchlist')||[]).filter(tickerOK))favorites.append(el('a.chip',{href:'#/evidence/'+t,'aria-current':t===ticker?'page':null},t));
  root.append(favorites);
  const host=el('div');root.append(host);
  async function load(version=null){
    const id=++request;closeModal();currentMap?.dispose?.();currentMap=null;clear(host);
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
      clear(host);currentMap=mapView(doc,{archive:!!version,onPickTicker:picker});host.append(currentMap);
      const historyPanel=el('div.evidence-history');let cursor=null;
      const historyButton=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:async()=>{
        historyButton.disabled=true;
        try{
          const q=new URLSearchParams({limit:'10'});if(cursor)q.set('before',cursor);
          const archive=await api.get('/evidence/'+ticker+'/history?'+q,{signal:ctl.signal,silent402:true});
          if(!valid(id)||!store.isPro())return;
          for(const row of archive.items||[])historyPanel.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load(row.id)},time(row.recorded_at)));
          cursor=archive.next_cursor;historyButton.hidden=!cursor;historyButton.textContent=s('evidence.show_all');
        }catch(error){if(valid(id))historyPanel.append(errorBox(error));}
        finally{historyButton.disabled=false;}
      }},s('evidence.history'));
      host.append(el('div.evidence-links',el('a.btn.btn-ghost.btn-sm',{href:'#/briefing?ticker='+ticker},s('nav.briefing')),
        el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+ticker},s('radar.chart')),historyButton,
        version?el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load()},s('evidence.latest')):null),historyPanel);
    }catch(error){if(valid(id)){clear(host);host.append(errorBox(error,()=>load(version)));}}
  }
  const unsubs=[store.subscribe('me',()=>load())];
  const cleanup=()=>{alive=false;request++;currentMap?.dispose?.();currentMap=null;ctl.abort();unsubs.forEach(fn=>fn());closeModal();};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  if(route.signal?.aborted)cleanup();else await load();
  return cleanup;
}
