import {tourEvent,tourTarget} from '../tour-events.js';
import {openCardShare} from '../card-share.js';
import {exampleTickers,exampleMap} from '../evidence-examples.js';
import {quotaNote} from '../experience.js';
import {el,clear,spinner,errorBox,modal,closeModal,dateTime as time} from '../ui.js';
import {s,LANG,has} from '../strings.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {factText} from './stock-briefs.js';
import {waterLevel,marketDetail,priceBadge} from '../evidence-context.js';
import {icon} from '../icons.js';
import {evidenceTarget,creatorTarget} from '../creator-route.js';
import {groupAuthors,sourceOccurrences,originalSourceKey,authorIdentity} from '../evidence-grouping.js';
import {topicGroups} from '../evidence-topics.js';
import {comparisonBadge,comparisonDetails} from '../comparison-context.js';
import {sourceIdentity,nodeSourceIdentity,sourceBadge,sourceMark} from '../evidence-source.js';
import {claimQualifications,sourceAt} from './creator-claim.js';
import {ownershipEvent,eventLabel,eventDate} from '../evidence-event.js';
import {material} from '../shared-read-refresh.js';
import {readingOrder} from '../reading-order.js';

const pick=v=>v?.[LANG==='en'?'en':'zh']||'';
const original=v=>pick(v)||v?.en||v?.zh||'';
const tickerOK=v=>/^[A-Z][A-Z0-9.\-]{0,9}$/.test(v||'');
// A channel may be named "Ticker Symbol: YOU"; author identity is not a stock.
const authorLabel=e=>e.author?(e.kind==='creator'?s('evidence.creator_author',{name:e.author}):e.author):'';
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10):'—';
function source(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
const position=v=>{const n=Math.floor(v);return Number.isFinite(n)?Math.floor(n/60)+':'+String(n%60).padStart(2,'0'):'';};
const factDescription=e=>e.topic==='price_gaps'?(e.data?.gaps?.length?e.data.gaps.map(g=>`${g.date} · $${g.lower}–$${g.upper}`).join(' / '):s('evidence.no_gaps')):factText(e);
const TOPIC_PREVIEW=3;
const isMention=n=>n.intent==='mention'||n.basis==='verified_mention_no_direction';
const missingLabel=k=>k.startsWith('ytd_')?s('evidence.missing_ytd',{benchmark:k.slice(4)}):k==='price_gaps'?s('evidence.missing_gaps'):has('stockbrief.missing_'+k)?s('stockbrief.missing_'+k):s('evidence.missing_other');

export function detail(node,{analysisAt,shareContext,readingTicker,compact=window.DUCKY?.PRODUCT_FOCUS_ENABLED===true}={}){
  const body=el('div.evidence-detail',{'data-reading-ticker':readingTicker||'', 'data-reading-source':node.id||'',
    'data-reading-proof':material(node,'/evidence/SOURCE')},el('p.evidence-stance',{class:'is-'+node.stance},eventLabel(node)),
    analysisAt?el('p.data-notice',s('evidence.analysis_snapshot_source',{at:time(analysisAt)})):null,
    node.conditional?el('p.data-notice',s('evidence.conditional')):null,
    pick(node.reason)&&pick(node.reason)!==pick(node.title)?el('p',pick(node.reason)):null);
  for(const e of node.evidence||[]){
    const event=ownershipEvent(e);
    const explanation=e.kind==='fact'?factDescription(e):pick(e.reason)||pick(e.title);
    const item=el('article.evidence-source',sourceBadge(sourceIdentity(e)),el('h3',authorLabel(e)||s('evidence.recorded_data')),
      original(e.original_title)?el('div.evidence-original',el('span.small.muted',s('evidence.original_only')),el('p',original(e.original_title))):null,
      explanation&&![pick(node.reason),pick(node.title)].includes(explanation)?el('p',explanation):null,
      e.kind==='creator'?claimQualifications(e):null,
      e.kind==='fact'?comparisonDetails(e):null,
      event?el('p.evidence-event-basis',s('evidence.event_basis')):null,
      event?.event_date?el('p.small.muted',s('evidence.event_date',{at:date(event.event_date)})):null,
      event?.filing_date?el('p.small.muted',s('evidence.filing_date',{at:date(event.filing_date)})):
        e.published_at?el('p.small.muted',s('evidence.published',{at:date(e.published_at)})):null,
      el('p.small.muted',compact?s('focus.first_observed',{date:time(e.observed_at)}):s('evidence.observed',{at:time(e.observed_at)})),
      e.retrieved_at?el('p.small.muted',s('evidence.retrieved',{at:Array.isArray(e.retrieved_at)?e.retrieved_at.map(time).join(' / '):time(e.retrieved_at)})):null,
      Number.isFinite(e.start_seconds)?el('p.small.muted',s('evidence.segment',{start:position(e.start_seconds),end:position(e.end_seconds)})):null);
    if(e.freshness==='stale')item.append(el('p.data-notice',s(event?'evidence.historical_event':'evidence.stale_source')));
    const href=source(e.source_url);
    const internal=evidenceTarget(e,{ticker:readingTicker});
    const creatorLink=internal?el('a.btn.btn-sm',{'data-tour':'source.original','data-post':e.post_id,'data-source':node.id,class:compact?'btn-ghost':'btn-primary',href:internal,onclick:()=>closeModal()},s('evidence.creator_context')):null;
    const actions=compact?el('div'):item;
    if(!compact&&creatorLink)actions.append(creatorLink);
    if(href)actions.append(el('a.btn.btn-sm',{class:compact?'btn-primary':'btn-ghost',href:compact?(sourceAt(href,e.start_seconds)||href):href,target:'_blank',rel:'noopener noreferrer'},s('evidence.open_source')+' ↗'));
    else actions.append(el('p.small.muted',s(e.kind==='fact'?'evidence.saved_calculation':'evidence.no_source_link')));
    if(compact){
      if(creatorLink)actions.append(creatorLink);
      // Put the source action beside its identity, before long qualifications
      // and acquisition dates push it below a short phone viewport.
      item.querySelector('h3').after(actions);
    }
    const audit=el('details',el('summary',s('evidence.record_details')),
      el('p.small.muted',s('evidence.linked',{at:time(node.recorded_at)})),
      !compact&&e.source_hash?el('p.evidence-hash.mono',e.source_hash):null);
    if(!compact&&e.kind==='fact')audit.append(el('pre.evidence-facts',JSON.stringify(e.data,null,2)));
    item.append(audit);body.append(item);
  }
  if(node.evidence_omitted)body.append(el('p.small.muted',s('evidence.more_sources',{n:node.evidence_omitted})));
  if(shareContext)body.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>openCardShare(node,shareContext)},s('share.title')));
  modal(pick(node.title),body);
  if(body.textContent.trim()&&(node.evidence||[]).length){
    tourEvent('node',{ticker:readingTicker,source:node.id});
    if(readingTicker==='NVDA'&&node.evidence.some(e=>e.kind==='creator'&&e.post_id))tourEvent('opinion',{ticker:readingTicker,source:node.id});
  }
}

export function analysisPanel(doc,{formatTime=time}={}){
  // A read of the saved snapshot: opening its reasons never requests inference.
  const previous=doc.analysis_status==='refresh_pending';
  // Never resolve an earlier analysis against the latest values for the same IDs.
  const nodes=previous?(Array.isArray(doc.analysis_nodes)?doc.analysis_nodes:[]):doc.nodes||[];
  const bound=!previous||(doc.analysis_snapshot_id&&doc.analysis_generated_at&&nodes.length&&
    [doc.analysis?.overview,...(doc.analysis?.sections||[])].every(part=>
      part?.citations?.length&&part.citations.every(id=>nodes.some(n=>n.id===id))));
  const data=(doc.analysis_status==='ready'||previous&&bound)&&pick(doc.analysis?.overview)?doc.analysis:null;
  const summary=!['source_changed','withdrawn','refresh_pending'].includes(doc.analysis_status)&&pick(doc.summary)?doc.summary:null;
  const panel=el('section.evidence-analysis',{class:data||summary?'':'is-pending','aria-label':s('evidence.analysis_title')});
  const heading=el('header.evidence-analysis-heading',el('h2',icon('briefing'),s('evidence.analysis_title')));
  if(data&&doc.analysis_generated_at)heading.append(el('p.evidence-analysis-time',s(previous?'evidence.analysis_previous_as_of':'evidence.analysis_as_of',{at:formatTime(doc.analysis_generated_at)})));
  panel.append(heading);
  const refs=part=>el('span.evidence-analysis-citations',...(part?.citations||[]).flatMap(id=>{
    const i=nodes.findIndex(n=>n.id===id);return i<0?[]:[el('button.brief-citation',{type:'button',
      'data-reading-key':`${doc.ticker}:analysis:${part.kind||'overview'}:${id}`,
      onclick:()=>detail(nodes[i],{readingTicker:doc.ticker,...(previous?{analysisAt:doc.analysis_generated_at}:{})}),'aria-label':s(previous?'evidence.analysis_snapshot_citation':'evidence.citation',{n:i+1})},String(i+1))];
  }));
  if(data){
    if(previous)panel.append(el('p.evidence-analysis-status',{role:'status'},s('evidence.analysis_refresh_pending')));
    panel.append(el('p.evidence-analysis-overview',pick(data.overview),refs(data.overview)));
    const body=el('div.evidence-analysis-body');
    for(const part of data.sections||[]){
      if(['key_points','risks','watch'].includes(part.kind)&&pick(part))body.append(el('section',{class:'is-'+part.kind},el('h3',s('evidence.analysis_'+part.kind)),el('p',pick(part),refs(part))));
    }
    if(body.childElementCount)panel.append(el('details.evidence-analysis-details',{'data-reading-key':`${doc.ticker}:reasons`},
      el('summary',{'data-reading-key':`${doc.ticker}:reasons-toggle`},s('evidence.analysis_button')),body));
  }else{
    if(summary)panel.append(el('p.evidence-analysis-overview',pick(summary),refs(summary)));
    const state=['failed','insufficient','source_changed','withdrawn'].includes(doc.analysis_status)?doc.analysis_status:'pending';
    panel.append(el('p.evidence-analysis-status',{role:'status'},s('evidence.analysis_'+state)));
  }
  return panel;
}

// Layout is native CSS; the light SVG layer only connects the actual rendered nodes.
// Observe cards as well as the canvas so wrapping, search and font loading stay aligned.
export function connectMap(map,center,branches){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  svg.setAttribute('class','evidence-connections');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
  map.prepend(svg);
  let relation={origin:null,targets:[]};
  function shape(tag,attrs){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));svg.append(n);}
  // Dashed links between the focused card and records from the same source or author.
  function drawRelations(box){
    const origin=relation.origin;if(!origin?.isConnected)return;
    const a=origin.getBoundingClientRect();if(!a.width||!a.height)return;
    for(const target of relation.targets){
      const b=target.getBoundingClientRect();if(!b.width||!b.height)continue;
      const ax=a.left-box.left+a.width/2,ay=a.top-box.top+a.height/2,bx=b.left-box.left+b.width/2,by=b.top-box.top+b.height/2,mx=(ax+bx)/2;
      shape('path',{class:'evidence-relation',d:`M ${ax} ${ay} C ${mx} ${ay}, ${mx} ${by}, ${bx} ${by}`});
    }
  }
  function draw(){
    clear(svg);if(!map.isConnected)return;
    const box=map.getBoundingClientRect(),root=center.getBoundingClientRect();
    if(!box.width||!box.height)return;
    svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    const layout=window.getComputedStyle(map).getPropertyValue('--evidence-layout').trim();
    const cards=[...branches.querySelectorAll('.evidence-node')];
    const groups=layout==='tree'?[...branches.querySelectorAll('.evidence-group')]:[];
    if(layout==='lanes'){
      for(const group of branches.querySelectorAll('.evidence-group')){
        const heading=group.querySelector('.evidence-group-heading');if(!heading)continue;
        const h=heading.getBoundingClientRect();if(!h.width&&!h.height)continue;
        const x=h.left-box.left+h.width/2,y=h.top-box.top;
        const rx=root.left-box.left+root.width/2,ry=root.bottom-box.top;
        const tone=['support','counter','context'].find(k=>group.classList.contains('is-'+k));
        shape('path',{class:'evidence-wire is-'+tone,d:`M ${rx} ${ry} C ${rx} ${ry+16}, ${x} ${y-16}, ${x} ${y}`});
        // One spine per lane; every displayed card hangs from it with a stub and a port.
        const shown=[...group.querySelectorAll('.evidence-node')].map(card=>card.getBoundingClientRect()).filter(b=>b.width&&b.height);
        if(!shown.length)continue;
        const sx=h.left-box.left+5,last=shown.at(-1);
        shape('path',{class:'evidence-wire evidence-leaf-trunk is-'+tone,d:`M ${sx} ${h.bottom-box.top} V ${last.top-box.top+Math.min(26,last.height/2)}`});
        for(const b of shown){
          const cy=b.top-box.top+Math.min(26,b.height/2),cx=b.left-box.left;
          shape('path',{class:'evidence-wire evidence-stub is-'+tone,d:`M ${sx} ${cy} H ${cx}`});
          shape('circle',{class:'evidence-port is-'+tone,cx,cy,r:3});
        }
      }
      drawRelations(box);
      return;
    }
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
    dispose(){observer?.disconnect();relation={origin:null,targets:[]};clear(svg);},
    relate(origin,targets){relation={origin:origin||null,targets:Array.isArray(targets)?targets:[]};draw();}
  };
}

// Three retained-record counts side by side. Widths compare counts only, never confidence or odds.
function balanceBar(nodes){
  const lanes=['support','context','counter'],counts=Object.fromEntries(lanes.map(k=>[k,nodes.filter(n=>n.stance===k).length]));
  return el('div.evidence-balance',{role:'img','aria-label':s('evidence.balance_label')+' · '+lanes.map(k=>s('evidence.'+k)+' '+counts[k]).join(' · ')},
    el('span.evidence-balance-bar',...lanes.map(k=>el('span',{class:'is-'+k,style:{flexGrow:String(counts[k]||0.02)}}))),
    el('span.evidence-balance-legend',...lanes.map(k=>el('span',{class:'is-'+k},String(counts[k])))));
}

export function mapView(doc,{archive=false,onPickTicker,example=false,showAnalysis=true,state}={}){
  const nodes=Array.isArray(doc.nodes)?doc.nodes:[],view=el('section.evidence-workspace');
  if(archive)view.append(el('p.data-notice',s('evidence.archive',{at:time(doc.recorded_at)})));
  if(doc.status==='stale')view.append(el('p.data-notice',s('evidence.stale')));
  if(doc.withdrawn)view.append(el('p.data-notice',s('evidence.withdrawn',{n:doc.withdrawn})));
  if(!example&&showAnalysis)view.append(analysisPanel(doc));
  else if(example)view.append(el('p',s('experience.sample_overview')));
  if(!nodes.length){view.append(el('p.empty',s('evidence.empty')),el('a.btn.btn-ghost',{href:'#/research/'+doc.ticker},s('evidence.records')));return view;}
  let scope=['support','counter','context'].includes(state?.scope)?state.scope:'all',limit=state?.expanded?nodes.length:6;
  view.readingState=()=>({scope,expanded:limit>6});
  const occurrences=sourceOccurrences(nodes);
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
    example?el('span.small',s('experience.historical')):priceBadge(doc),example?null:el('button.evidence-water-caption',{type:'button',onclick:()=>marketDetail(doc)},s('evidence.water_short')),
    el('div.evidence-center-info',el('span.small.muted',s(nodes.length===1?'evidence.recorded_single':'evidence.recorded_count',{n:nodes.length})),
      balanceBar(nodes),
      pending?el('span.evidence-mobile-state',s('evidence.queue_short',{n:pending})):null));
  if(level!==null){center.style.setProperty('--water-height',Math.round(level*100)+'%');center.style.setProperty('--water-color',`hsl(${Math.round(35+level*125)} 40% 48%)`);}
  const map=el('div.evidence-map.evidence-lanes',center,branches);view.append(map);
  const connections=connectMap(map,center,branches);view.dispose=()=>connections.dispose();view.refresh=()=>connections.refresh();
  const total=el('p.small.muted',{'aria-live':'polite'}),STEP=12;
  // Expansion is gradual: a step of records first, everything on request. Both keep every viewpoint.
  const step=el('button.btn.btn-ghost',{type:'button','data-reading-key':doc.ticker+':show-more',onclick:()=>{limit=Math.min(nodes.length,limit+STEP);paint();}},s('evidence.show_more',{n:STEP}));
  const more=el('button.btn.btn-ghost',{type:'button','data-reading-key':doc.ticker+':show-all',onclick:()=>{limit=nodes.length;paint();}},s('evidence.show_all'));
  view.append(el('div.evidence-map-footer',total,el('div.evidence-map-actions',step,more)));
  let cards=new Map();
  // Hovering or focusing a card lights up records from the same original source or author.
  function relate(id){
    const origin=id?cards.get(id):null,key=origin?.dataset.sourceKey||'',author=origin?.dataset.author||'';
    const related=[];
    for(const card of cards.values()){
      const same=!!origin&&card!==origin&&((!!key&&card.dataset.sourceKey===key)||(!!author&&card.dataset.author===author));
      card.classList.toggle('is-related',same);card.classList.toggle('is-origin',card===origin);
      if(same)related.push(card);
    }
    map.classList.toggle('has-focus',related.length>0);
    connections.relate(related.length?origin:null,related);
  }
  function paint(){
    controls.forEach(([key,b])=>b.setAttribute('aria-pressed',String(key===scope)));filterSelect.value=scope;
    const filtered=readingOrder(nodes.filter(n=>scope==='all'||n.stance===scope));
    // Balanced first screen; selecting All never silently buries opposition.
    const first=[];
    if(scope==='all'){for(const stance of ['support','counter','context'])first.push(...filtered.filter(n=>n.stance===stance).slice(0,2));}
    const ordered=[...first,...filtered.filter(n=>!first.includes(n))];
    clear(branches);
    const groups=new Map();
    for(const stance of ['support','context','counter']){
      const count=filtered.filter(n=>n.stance===stance).length;if(scope!=='all'&&!count)continue;
      const list=el('div.evidence-group-nodes');
      const group=el('section.evidence-group',{class:'is-'+stance},el('h2.evidence-group-heading',el('span',s('evidence.'+stance)),el('span.evidence-group-count',String(count))),list);
      groups.set(stance,{group,list});
    }
    const visible=ordered.slice(0,limit);
    center.style.gridRow='1 / '+(Math.min(3,Math.ceil(visible.length/2))+1);
    map.classList.toggle('is-empty',!visible.length);
    cards=new Map();
    for(const node of visible){
      const identity=nodeSourceIdentity(node);
      const eventAt=eventDate(node),shownDate=eventAt?s('evidence.event_short',{at:eventAt}):date(node.published_at||node.observed_at);
      const authors=[...new Set((node.evidence||[]).map(authorLabel).filter(Boolean))];
      const linked=node.kind==='creator'&&node.evidence?.length===1?evidenceTarget(node.evidence[0]):null;
      const shareContext={ticker:doc.ticker,recorded_at:doc.recorded_at,archive,example,status:doc.status};
      const repeats=node.kind==='creator'?Math.max(0,...(node.evidence||[]).map(e=>occurrences.get(originalSourceKey(e))||0)):0;
      const sourceKey=(node.evidence||[]).map(originalSourceKey).find(Boolean)||'',authorId=authorIdentity(node)?.id||'';
      const card=el('article.evidence-node',{class:'is-'+node.stance+' source-'+identity,'data-source':identity,'data-reading-anchor':node.id,
        ...(sourceKey?{'data-source-key':sourceKey}:{}),...(authorId?{'data-author':authorId}:{}),
        onpointerenter:()=>relate(node.id),onpointerleave:()=>relate(null),onfocusin:()=>relate(node.id),onfocusout:()=>relate(null),onclick:()=>{
        // Keep the stock and reading position while checking a source. The
        // dialog and author heading retain explicit routes to creator history.
        if(linked&&window.DUCKY?.PRODUCT_FOCUS_ENABLED!==true)location.hash=linked;
        else detail(node,{shareContext,readingTicker:doc.ticker});
      }},
        ['youtube','x','macro'].includes(identity)?el('span.evidence-source-watermark',{'aria-hidden':'true'},sourceMark(identity)):null,
        el('span.evidence-node-label',sourceBadge(identity),el('span.evidence-category',eventLabel(node))),
        el('strong',pick(node.title)),
        repeats>1?el('span.evidence-repeat',s('evidence.repeated_source',{n:repeats})):null,
        node.conditional?el('span.evidence-node-flags',el('span.evidence-condition',s('evidence.condition_tag'))):null,
        ...(node.evidence||[]).filter(e=>e.kind==='fact').map(comparisonBadge).filter(Boolean).slice(0,1),
        original(node.original_title)?el('span.evidence-original-title',original(node.original_title)):null,
        el('span.evidence-node-author',icon(authors.length?'creators':'briefing'),el('span',authors.join(' · ')||s('evidence.recorded_data'))),
        el('span.evidence-node-mobile-meta',authors.length?el('span.evidence-mobile-author',authors.join(' · ')):null,el('span',shownDate),!authors.length?el('span.evidence-mobile-count',s((node.evidence||[]).length===1?'evidence.source_single':'evidence.sources',{n:(node.evidence||[]).length})):null,node.conditional?el('span.evidence-condition',s('evidence.condition_tag')):null),
        el('span.evidence-node-footer',el('span',shownDate),
          el('span.evidence-node-number',{'aria-hidden':'true'},String(nodes.indexOf(node)+1).padStart(2,'0')),
          el('span',s((node.evidence||[]).length===1?'evidence.source_single':'evidence.sources',{n:(node.evidence||[]).length})+' ↗')));
      card.append(el('button.evidence-node-open',{type:'button','aria-label':pick(node.title),'data-reading-key':doc.ticker+':node:'+node.id,'data-tour':doc.ticker==='NVDA'&&(node.evidence||[]).some(e=>e.kind==='creator'&&e.post_id)?'node.open opinion.open':'node.open','data-source':node.id,'data-ticker':doc.ticker}),
        el('button.evidence-share-trigger',{type:'button','aria-label':s('share.card_label',{title:pick(node.title)}),onclick:event=>{event.stopPropagation();openCardShare(node,shareContext);}},s('share.action')));
      cards.set(node.id,card);
    }
    const authorBlock=(bucket,stance)=>{
      const block=el('section.evidence-author-group',{'data-author':bucket.author.id},
        el('header.evidence-author-heading',el('a',{href:creatorTarget({selected:bucket.author.id,mine:false,ticker:doc.ticker}),'aria-label':bucket.author.name+' · '+s('evidence.author_archive')},bucket.author.name),
          el('span.small.muted',s(bucket.nodes.length===1?'evidence.author_points_single':'evidence.author_points',{n:bucket.nodes.length})+(bucket.sources.size?' · '+s(bucket.sources.size===1?'evidence.author_sources_single':'evidence.author_sources',{n:bucket.sources.size}):''))));
      for(const node of bucket.nodes.slice(0,2))block.append(cards.get(node.id));
      if(bucket.nodes.length>2){
        const rest=el('details.evidence-author-more',{'data-reading-key':doc.ticker+':author:'+stance+':'+bucket.author.id},
          el('summary',s(bucket.nodes.length===3?'evidence.author_more_single':'evidence.author_more',{n:bucket.nodes.length-2})),...bucket.nodes.slice(2).map(n=>cards.get(n.id)));
        rest.addEventListener('toggle',()=>connections.refresh());block.append(rest);
      }
      return block;
    };
    for(const [stance,{group,list}]of groups){
      const records=[],authors=[],mentions=[];
      for(const bucket of groupAuthors(visible.filter(n=>n.stance===stance))){
        if(!bucket.author){records.push(...bucket.nodes);continue;}
        // Once the reader expands, authors who only mention the stock fold together.
        // Their records, dates and repeat-source labels are all still inside.
        (limit>6&&bucket.nodes.every(isMention)?mentions:authors).push(bucket);
      }
      if(mentions.length<2)authors.push(...mentions);
      for(const bucket of authors)list.append(authorBlock(bucket,stance));
      if(mentions.length>=2){
        const count=mentions.reduce((n,b)=>n+b.nodes.length,0);
        const fold=el('details.evidence-mentions',{'data-reading-key':doc.ticker+':mentions:'+stance},
          el('summary',s('evidence.mentions_fold',{n:count,authors:mentions.length})),...mentions.map(b=>authorBlock(b,stance)));
        fold.addEventListener('toggle',()=>connections.refresh());list.append(fold);
      }
      // Recorded facts and events fold by topic; a lone record in a lane needs no heading.
      const topics=topicGroups(records);
      for(const topic of topics){
        if(topics.length===1&&topic.nodes.length===1){list.append(cards.get(topic.nodes[0].id));continue;}
        const block=el('section.evidence-topic-group',{'data-topic':topic.key},
          el('header.evidence-topic-heading',el('span',s('evidence.topic_'+topic.key)),el('span.evidence-topic-count',String(topic.nodes.length))));
        for(const node of topic.nodes.slice(0,TOPIC_PREVIEW))block.append(cards.get(node.id));
        if(topic.nodes.length>TOPIC_PREVIEW){
          const rest=el('details.evidence-topic-more',{'data-reading-key':doc.ticker+':topic:'+stance+':'+topic.key},
            el('summary',s(topic.nodes.length===TOPIC_PREVIEW+1?'evidence.topic_more_single':'evidence.topic_more',{n:topic.nodes.length-TOPIC_PREVIEW})),...topic.nodes.slice(TOPIC_PREVIEW).map(n=>cards.get(n.id)));
          rest.addEventListener('toggle',()=>connections.refresh());block.append(rest);
        }
        list.append(block);
      }
      if(!list.childElementCount)list.append(el('p.small.muted',s('evidence.no_stance_records')));
      branches.append(group);
    }
    reset.hidden=scope==='all';
    if(!filtered.length)branches.append(el('p.empty',s('evidence.no_match')));
    total.textContent=s('evidence.showing',{shown:Math.min(limit,filtered.length),total:filtered.length});
    const remaining=filtered.length-limit;
    step.hidden=remaining<=STEP;more.hidden=remaining<=0;
    relate(null);connections.refresh();
  }
  paint();
  view.append(el('p.small.muted',s('evidence.group_note')));
  if(example)return view;
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
  let chosen=store.get('me')?.experience?.evidence?.selected||[];
  let example=exampleTickers.includes(route.query?.get('example'))?route.query.get('example'):null;
  const tourSnapshot=route.query?.get('tour_snapshot')||null;
  let ticker=example||String(route.ticker||chosen[0]||'').toUpperCase();
  if(!tickerOK(ticker))ticker=(store.get('watchlist')||[]).find(tickerOK)||'';
  function picker(){
    const field=el('input.input',{type:'search',value:ticker,placeholder:'AVGO / ORCL',maxlength:10,'aria-label':s('evidence.ticker')});
    const form=el('form.add-row.evidence-picker-form',{onsubmit:e=>{e.preventDefault();const t=field.value.trim().toUpperCase().replace(/^\$/,'');if(tickerOK(t)){closeModal();if(t===ticker&&!example)load();else location.hash='#/evidence/'+t;}}},field,el('button.btn.btn-primary',{type:'submit'},s('evidence.load')));
    const stocks=[...new Set((store.get('watchlist')||[]).filter(tickerOK))].sort();
    const list=el('div.evidence-picker-list',{'aria-label':s('watch.title')});
    for(const t of stocks)list.append(el('a.chip',{href:'#/evidence/'+t,'aria-current':t===ticker?'page':null,onclick:e=>{closeModal();if(t===ticker&&!example){e.preventDefault();load();}}},t));
    modal(s('evidence.select_stock'),el('div.evidence-stock-picker',
      el('p.evidence-picker-caption',s('evidence.all_watchlist',{n:stocks.length})),list,
      el('p.evidence-picker-caption',s('evidence.other_stock')),form));
  }
  const heading=el('header.evidence-heading',el('div.view-head',el('h1',s('evidence.title'))),
    el('button.evidence-switch-stock',{type:'button',onclick:picker,'aria-haspopup':'dialog'},
      el('strong.mono',ticker),el('span',s('evidence.switch_stock')),el('span',{'aria-hidden':'true'},'⌄')));root.append(heading);
  const favorites=el('div.evidence-watchlist');
  const stocks=[...new Set((store.get('watchlist')||[]).filter(tickerOK))].sort();
  const preview=[...(stocks.includes(ticker)?[ticker]:[]),...stocks.filter(t=>t!==ticker)].slice(0,7);
  for(const t of preview)favorites.append(el('a.chip',{href:'#/evidence/'+t,'aria-current':t===ticker?'page':null},t));
  if(stocks.length)favorites.append(el('button.evidence-all-stocks',{type:'button',onclick:picker,'aria-haspopup':'dialog'},s('evidence.all_watchlist',{n:stocks.length}),' ⌄'));
  root.append(favorites);
  const trial=el('div.evidence-trial');root.append(trial);
  let syncing=false;
  function syncSelection(){
    const me=store.get('me');if(!me)return;
    // The account store echoes the selection this page already holds; the mount below and the
    // removal handler decide themselves whether a reload is needed.
    syncing=true;
    try{store.set('me',{...me,experience:{...me.experience,evidence:{...me.experience?.evidence,selected:chosen}}});}
    finally{syncing=false;}
  }
  function trialControls(){
    clear(trial);
    if(store.isPro()&&!example)return;
    trial.append(el('details.evidence-examples',el('summary',s('experience.examples')),
      ...exampleTickers.map(t=>el('a.chip',{href:'#/evidence?example='+t,'aria-current':example===t?'page':null},t))));
    if(!store.isPro()){
      trial.append(quotaNote('evidence',chosen.length,store.get('me')?.experience?.evidence?.cap??3));
      const personal=el('div.evidence-selections');
      for(const t of chosen)personal.append(el('div.evidence-selection',el('a',{href:'#/evidence/'+t},t),
        el('button',{type:'button','aria-label':s('experience.remove_map',{ticker:t}),onclick:async e=>{
          e.currentTarget.disabled=true;
          try{const r=await api.del('/me/evidence/'+t,{signal:ctl.signal});if(!valid())return;chosen=r.selected;syncSelection();trialControls();load();}
          catch(error){if(valid())host.prepend(errorBox(error));}
        }},'×')));
      trial.append(personal);
    }
  }
  trialControls();
  const host=el('div');root.append(host);let displayed=null,archived=false;
  const updatePrice=event=>{
    const update=event.detail;
    if(!valid()||archived||example||!displayed||update?.path!=='/evidence/'+ticker)return;
    const unchanged=material({...displayed,display_price:null},update.path)===material({...update.value,display_price:null},update.path);
    if(!unchanged)return; // Changed research keeps the explicit update notice.
    displayed.display_price=update.value.display_price;
    currentMap?.querySelector('.evidence-price')?.replaceWith(priceBadge(displayed));
    update.accepted=true;
  };
  root.addEventListener('ducky:shared-read',updatePrice);
  async function load(version=tourSnapshot){
    displayed=null;archived=!!version;
    const id=++request;closeModal();currentMap?.dispose?.();currentMap=null;clear(host);
    if(!store.get('me')){host.append(el('a.btn.btn-primary',{href:'#/login'},s('login.pw_btn')));return;}
    if(example){
      host.append(el('p.data-notice',s('experience.sample_label')));
      currentMap=mapView(exampleMap(example),{example:true});host.append(currentMap);
      host.append(el('p.small.muted',s('experience.sample_basis')),
        el('div.evidence-links',el('button.btn.btn-primary',{type:'button',onclick:picker},s('experience.try_own')),
          el('a.btn.btn-ghost',{href:'/media/ducky-demo-cases-2026-09-07.json',target:'_blank',rel:'noopener'},s('experience.sample_full'))));return;
    }
    if(!store.isPro()&&!chosen.includes(ticker)){
      const action=el('button.btn.btn-primary',{type:'button',disabled:!ticker,onclick:async()=>{
        action.disabled=true;
        try{
          const r=await api.post('/me/evidence/'+ticker,{}, {signal:ctl.signal});if(!valid(id))return;
          if(r.status!=='ready'){note.textContent=s('experience.map_unavailable');return;}
          chosen=r.selected||chosen;syncSelection();trialControls();load();
        }catch(error){if(valid(id)&&error.status!==402)host.append(errorBox(error));}
        finally{action.disabled=false;}
      }},s('experience.add_map',{ticker}));
      const note=el('p',s('experience.map_choose'));
      host.append(el('section.card',el('h2',s('experience.personal_map')),note,action,
        el('button.btn.btn-ghost',{type:'button',onclick:picker},s('evidence.switch_stock'))));return;
    }
    if(!ticker){host.append(el('p.empty',s('evidence.choose')));return;}
    const saved=version?null:api.peek('/evidence/'+ticker);
    if(saved){displayed=saved;currentMap=mapView(saved,{onPickTicker:picker});host.append(currentMap);}
    else host.append(spinner());
    try{
      const doc=await api.get('/evidence/'+ticker+(version?'?version='+encodeURIComponent(version):''),{signal:ctl.signal,silent402:true});
      if(!valid(id))return;
      if(!doc||doc.ticker!==ticker||!Array.isArray(doc.nodes))throw Error('invalid_response');
      const state=currentMap?.readingState?.();
      if(displayed&&material(displayed,'/evidence/'+ticker)!==material(doc,'/evidence/'+ticker))closeModal();
      currentMap?.dispose?.();displayed=doc;clear(host);currentMap=mapView(doc,{archive:!!version,onPickTicker:picker,state});host.append(currentMap);
      if(doc.nodes.length){tourTarget(currentMap,'map.ready',{ticker:doc.ticker});tourEvent('map',{ticker:doc.ticker});}
      const sourceId=!version?route.query?.get('source'):null;
      if(sourceId){
        const target=doc.nodes.find(n=>n.id===sourceId||(n.evidence||[]).some(e=>[e.id,e.point_id,e.legacy_claim_id,e.source_record_id].includes(sourceId)));
        if(target)detail(target,{readingTicker:doc.ticker});else host.prepend(el('p.data-notice',s('evidence.linked_missing')));
      }
      const historyPanel=el('div.evidence-history');let cursor=null;
      const historyButton=el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:async()=>{
        historyButton.disabled=true;
        try{
          const q=new URLSearchParams({limit:'10'});if(cursor)q.set('before',cursor);
          const archive=await api.get('/evidence/'+ticker+'/history?'+q,{signal:ctl.signal,silent402:true});
          if(!valid(id))return;
          for(const row of archive.items||[])historyPanel.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load(row.id)},time(row.recorded_at)));
          cursor=archive.next_cursor;historyButton.hidden=!cursor;historyButton.textContent=s('evidence.show_all');
        }catch(error){if(valid(id))historyPanel.append(errorBox(error));}
        finally{historyButton.disabled=false;}
      }},s('evidence.history'));
      host.append(el('div.evidence-links',el('a.btn.btn-ghost.btn-sm',{href:'#/briefing?ticker='+ticker},s('nav.briefing')),
        el('a.btn.btn-ghost.btn-sm',{href:'#/chart/'+ticker,'data-tour':'chart.controls','data-ticker':ticker},s('radar.chart')),historyButton,
        version?el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load()},s('evidence.latest')):null),historyPanel);
    }catch(error){if(valid(id)){
      if(!displayed||[401,402,403,404,410].includes(error.status)){currentMap?.dispose?.();currentMap=null;displayed=null;clear(host);}
      host.prepend(errorBox(error,()=>load(version)));
    }}
  }
  const unsubs=[store.subscribe('me',()=>{if(syncing)return;chosen=store.get('me')?.experience?.evidence?.selected||[];trialControls();load();})];
  const cleanup=()=>{root.removeEventListener('ducky:shared-read',updatePrice);alive=false;request++;currentMap?.dispose?.();currentMap=null;ctl.abort();unsubs.forEach(fn=>fn());closeModal();};
  route.signal?.addEventListener('abort',cleanup,{once:true});
  if(route.signal?.aborted)cleanup();else {
    if(store.get('me')&&!store.isPro())try{const r=await api.get('/me/evidence',{signal:ctl.signal});if(valid()){chosen=r.selected||[];if(JSON.stringify(chosen)!==JSON.stringify(store.get('me')?.experience?.evidence?.selected||[]))syncSelection();if(!example&&!route.ticker&&chosen.length){ticker=chosen[0];const name=heading.querySelector('strong.mono');if(name)name.textContent=ticker;}trialControls();}}catch(error){if(valid())trial.append(errorBox(error));}
    if(valid())await load(route.query?.get('tour_snapshot')||null);
  }
  return cleanup;
}
