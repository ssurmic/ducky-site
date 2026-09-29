// One attributed, reviewed video view on every surface. Reads never follow an author or generate content.
import {el,clear,spinner} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';
import * as store from './store.js';
import {replaceReading,stockHref} from './stock-reading.js';

const SCHEMA='creator-opinions/1',PAGE_SIZE=30,REFRESH_MS=30000;
const topics=['macro','sector','company','other'],stances=['bull','bear','neutral','unclear'];
const intents=['opinion','conditional','historical','self_reported','factual','unclear'];
const clock=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
const bilingual=value=>value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.zh==='string'&&typeof value.en==='string';
const text=value=>value?.[LANG==='en'?'en':'zh']||'';
const account=()=>JSON.stringify([store.epoch(),store.get('token'),store.get('me')?.user_id,store.get('me')?.entitlement,store.get('me')?.access]);
let newest={scope:null,revision:null,at:-Infinity};
const controls=new Map();
let controlScope=null;
export function opinionTime(value){
  return clock(value)?new Intl.DateTimeFormat(LANG==='en'?'en-US':'zh-CN',{timeZone:'America/New_York',year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value))+' ET':'—';
}
export function sourceURL(record){
  if(!/^[A-Za-z0-9_-]{11}$/.test(record?.video_id||''))return null;
  const seconds=record.navigation_seconds;
  if(seconds!==null&&(!Number.isFinite(seconds)||seconds<0))return null;
  const url='https://www.youtube.com/watch?v='+record.video_id+(seconds===null?'':'&t='+Math.floor(seconds)+'s');
  return record.original_source_url===url?url:null;
}
function validRecord(row){
  return row&&typeof row==='object'&&typeof row.id==='string'&&typeof row.title==='string'&&sourceURL(row)
    &&['published_at','observed_at','qualified_at','published_to_product_at'].every(key=>row[key]===null||clock(row[key]));
}
export function validOpinions(doc,{topic='all',ticker=null}={}){
  return doc?.schema===SCHEMA&&['ready','empty'].includes(doc.status)&&/^[a-f0-9]{64}$/.test(doc.revision||'')
    &&clock(doc.generated_at)&&Array.isArray(doc.items)&&doc.items.length<=PAGE_SIZE
    &&(doc.next_cursor===null||typeof doc.next_cursor==='string')&&doc.access==='reviewed_preview'
    &&doc.items.every(row=>validRecord(row)&&typeof row.display_group_id==='string'&&typeof row.author==='string'
      &&/^[a-z0-9][a-z0-9_.-]{0,127}$/.test(row.creator_id||'')&&topics.includes(row.topic)&&stances.includes(row.stance)
      &&intents.includes(row.intent)&&bilingual(row.subject)&&bilingual(row.claim)
      &&(row.conditions===null||bilingual(row.conditions))&&(row.horizon===null||bilingual(row.horizon))
      &&['creator','guest','quoted_person','unclear'].includes(row.speaker?.kind)
      &&(row.speaker.name===null||typeof row.speaker.name==='string')
      &&row.source_kind==='native_video'&&row.capability==='reviewed_video_summary'&&row.status==='qualified'
      &&row.support_eligible===false&&row.research_evidence_ready===false
      &&typeof row.stock_navigation_eligible==='boolean'
      &&(row.stock_navigation_eligible?row.topic==='company'&&row.relation==='subject'&&/^[A-Z][A-Z0-9.-]{0,9}$/.test(row.ticker||''):row.ticker===null)
      &&(topic==='all'||row.topic===topic)&&(!ticker||row.ticker===ticker&&row.stock_navigation_eligible)
      &&Array.isArray(row.records)&&row.records.length===row.record_count&&row.records.length>0&&row.records.every(validRecord));
}
function original(record,key){
  const seconds=record.navigation_seconds,time=seconds===null?null:Math.floor(seconds/60)+':'+String(Math.floor(seconds)%60).padStart(2,'0');
  return el('a.opinion-original',{href:sourceURL(record),target:'_blank',rel:'noopener noreferrer','data-reading-key':key},
    s(time===null?'opinions.original':'opinions.original_at',{time}));
}
function sourceRecord(record,key){
  const clocks=[['observed_at','observed'],['qualified_at','reviewed'],['published_to_product_at','readable']].map(([field,label])=>
    el('div',el('dt',s('opinions.'+label)),el('dd',opinionTime(record[field]))));
  return el('li',el('p.opinion-record-title',record.title),el('time',{datetime:record.published_at},s('opinions.published',{date:opinionTime(record.published_at)})),
    original(record,key+':original'),el('dl.opinion-clocks',...clocks));
}
export function opinionRow(row,{from='explore'}={}){
  const key='opinion:'+row.display_group_id;
  const byline=el('div.opinion-byline',el('a.opinion-author',{href:'#/creators?creator='+encodeURIComponent(row.creator_id),'data-reading-key':key+':author'},row.author),
    el('time',{datetime:row.published_at},opinionTime(row.published_at)),el('span.opinion-stance',{class:'is-'+row.stance},s('opinions.stance_'+row.stance)));
  const body=el('article.creator-opinion',{class:'is-'+row.stance,'data-reading-anchor':key,'data-opinion-id':row.id},byline,
    el('p.opinion-subject',row.stock_navigation_eligible?el('a',{href:stockHref(row.ticker,from),'data-reading-key':key+':stock'},row.ticker):null,
      el('span',text(row.subject)),row.intent!=='opinion'?el('span.opinion-intent',s('opinions.intent_'+row.intent)):null),
    row.speaker.kind!=='creator'?el('p.opinion-speaker',s('opinions.speaker_'+row.speaker.kind,{name:row.speaker.name||s('opinions.unnamed')})):null,
    el('p.opinion-claim',text(row.claim)));
  for(const [field,label]of [['conditions','conditions'],['horizon','horizon']])if(text(row[field]))body.append(
    el('p.opinion-qualification',el('span',s('opinions.'+label)+': '),text(row[field])));
  body.append(el('div.opinion-actions',original(row,key+':original'),
    el('details.opinion-records',{'data-reading-key':key+':records'},el('summary',{'data-reading-key':key+':records-toggle'},
      s(row.records.length===1?'opinions.source_details':'opinions.records',{n:row.records.length})),
      row.records.length>1?el('p.small.muted',s('opinions.repeat_note')):null,
      el('ul',...row.records.map(record=>sourceRecord(record,key+':'+record.id))))));
  return body;
}

export function mountCreatorOpinions(host,{signal,topic='all',ticker=null,from='explore',initial=3}={}){
  const epoch=store.epoch(),scope=account(),stateKey=topic+'|'+(ticker||'');
  if(controlScope!==scope){controls.clear();controlScope=scope;}
  if(newest.scope!==scope)newest={scope,revision:null,at:-Infinity};
  const saved=controls.get(stateKey),ctl=new AbortController();
  let disposed=false,loading=false,seq=0,rows=[],doc=null,pages=0,showAll=!!saved?.showAll,restoreSaved=true;
  const current=()=>!disposed&&!signal?.aborted&&epoch===store.epoch()&&account()===scope;
  const visible=()=>document.visibilityState!=='hidden'&&window.navigator?.onLine!==false&&!host.closest('[hidden]');
  const title=s(ticker?'opinions.stock_title':topic==='macro'?'opinions.macro_title':'opinions.latest_title',{ticker});
  const list=el('div.creator-opinions-list'),notice=el('div.opinions-notice',{role:'status'}),heading=el('h2',{tabindex:'-1'},title);
  const refresh=el('button.btn.btn-ghost.btn-sm',{type:'button','data-reading-key':'opinions:refresh',onclick:()=>load()},s('opinions.refresh'));
  const more=el('button.btn.btn-ghost.opinions-more',{type:'button',hidden:true,'data-reading-key':'opinions:more',onclick:()=>{
    if(!showAll&&rows.length>initial){showAll=true;render();remember();}else {showAll=true;load(true);}
  }},s('opinions.more'));
  const fewer=el('button.btn.btn-ghost.opinions-more',{type:'button',hidden:true,'data-reading-key':'opinions:fewer',onclick:()=>{showAll=false;render();remember();}},s('opinions.fewer'));
  const section=el('section.creator-opinions',{'aria-label':title},el('header.creator-opinions-heading',heading,refresh),
    el('p.opinions-note',s('opinions.note')),notice,list,el('div.opinions-pagination',more,fewer));
  host.append(section);list.append(spinner());
  function remember(){if(current())controls.set(stateKey,{showAll,opened:[...list.querySelectorAll('details[open][data-reading-key]')].map(n=>n.dataset.readingKey)});}
  function render(){
    const focus=list.contains(document.activeElement);
    replaceReading(list,...(showAll?rows:rows.slice(0,initial)).map(row=>opinionRow(row,{from})));
    if(restoreSaved){for(const node of list.querySelectorAll('details[data-reading-key]'))if(saved?.opened?.includes(node.dataset.readingKey))node.open=true;restoreSaved=false;}
    if(focus&&!list.contains(document.activeElement))heading.focus({preventScroll:true});
    if(!rows.length)list.append(el('p.opinions-empty',s('opinions.empty')));
    more.hidden=!(rows.length>initial&&!showAll||doc?.next_cursor);
    more.textContent=s(!showAll&&rows.length>initial?'opinions.show_more':'opinions.more',{n:rows.length-initial});
    fewer.hidden=!showAll||rows.length<=initial;
    if(doc)section.dataset.revision=doc.revision;
  }
  async function load(append=false){
    if(!current()||loading)return;
    loading=true;const mine=++seq;refresh.disabled=true;more.disabled=true;refresh.setAttribute('aria-busy','true');
    if(!append)clear(notice);
    try{
      const next=await api.kol.opinions({topic,scope:'discover',limit:PAGE_SIZE,...(ticker?{ticker}:{}),...(append&&doc?.next_cursor?{before:doc.next_cursor}:{})},
        {signal:ctl.signal,observe:false,silent402:true});
      if(!current()||mine!==seq)return;
      if(!validOpinions(next,{topic,ticker}))throw new api.ApiError(502,{error:'invalid_opinions_response'});
      const at=Date.parse(next.generated_at);
      if(at<newest.at||at===newest.at&&newest.revision&&newest.revision!==next.revision)throw new api.ApiError(409,{error:'opinion_revision_changed'});
      if(append&&doc&&doc.revision!==next.revision)throw new api.ApiError(409,{error:'opinion_revision_changed'});
      newest={scope,revision:next.revision,at};clear(notice);
      if(next.coverage?.truncated)notice.append(el('p',s('opinions.partial')));
      if(!append&&doc?.revision===next.revision&&pages>1){doc={...doc,generated_at:next.generated_at};return;}
      rows=append?[...new Map([...rows,...next.items].map(row=>[row.display_group_id,row])).values()]:next.items;
      pages=append?pages+1:1;doc=next;render();
    }catch(error){
      if(!current()||mine!==seq)return;
      if(append&&[400,409].includes(error.status)){loading=false;return load();}
      const denied=[401,402,403,404,410].includes(error.status);
      if(denied){rows=[];doc=null;pages=0;clear(list);more.hidden=true;fewer.hidden=true;delete section.dataset.revision;}
      else if(!doc)clear(list);
      clear(notice).append(el('p',s(doc?'opinions.refresh_failed':'opinions.unavailable')),
        el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>load()},s('common.retry')));
    }finally{if(current()&&mine===seq){loading=false;refresh.disabled=false;more.disabled=false;refresh.removeAttribute('aria-busy');}}
  }
  const timer=setInterval(()=>{if(current()&&visible())load();},REFRESH_MS);timer?.unref?.();
  const wake=()=>{if(current()&&visible())load();};
  document.addEventListener('visibilitychange',wake);window.addEventListener('online',wake);
  const off=store.subscribe('*',()=>{if(account()!==scope){dispose();clear(host);}});
  function dispose(){if(disposed)return;remember();disposed=true;seq++;ctl.abort();clearInterval(timer);off();
    document.removeEventListener('visibilitychange',wake);window.removeEventListener('online',wake);signal?.removeEventListener('abort',dispose);}
  signal?.addEventListener('abort',dispose,{once:true});
  const ready=signal?.aborted?(dispose(),Promise.resolve()):visible()?load():Promise.resolve();
  return {ready,dispose,refresh:()=>load()};
}
