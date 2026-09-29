// today-creators.js — the day's macro takes from the creators this site follows: who said what about yields,
// the Fed, inflation, tariffs or liquidity in the last day and a half, attributed and linked to the original
// video. A record of what was said, never this site's view; a video whose analysis is still pending shows its
// title and link, so a take published five hours ago is on the page five hours later, not after the analysis.
import {el} from './ui.js';
import {s,LANG} from './strings.js';
import * as api from './api.js';
import * as store from './store.js';

const HOURS=36,LIMIT=4;
const parse=v=>{if(!v)return null;if(typeof v==='object')return v;try{return JSON.parse(v);}catch{return {zh:String(v),en:String(v)};}};
const text=o=>LANG==='zh'?(o?.zh||o?.en||''):(o?.en||o?.zh||'');
const pending=o=>!text(o)||['discovered','processing'].includes(o?.source?.status);

export function macroPosts(feed,{now=Date.now(),hours=HOURS,limit=LIMIT}={}){
  return (feed?.posts||[]).filter(p=>p&&p.macro&&Number.isFinite(Date.parse(p.published_at))&&now-Date.parse(p.published_at)<=hours*3600e3&&now-Date.parse(p.published_at)>=-3600e3)
    .sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at)).slice(0,limit);
}

export function creatorMacroBlock(feed,opts={}){
  const posts=macroPosts(feed,opts);if(!posts.length)return null;
  const when=iso=>new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(Date.parse(iso));
  const box=el('section.today-creators',{'aria-label':s('today.creators_title')},el('h2.today-section-title',s('today.creators_title')));
  const list=el('ul.today-creators-list');
  for(const p of posts){
    const o=parse(p.summary);
    const take=['bull','bear'].includes(p.take)?el('span.cr-take',{class:p.take==='bull'?'cr-bull':'cr-bear'},s('creators.take_'+p.take)):null;
    const title=/^https:/.test(p.url||'')?el('a',{href:p.url,target:'_blank',rel:'noopener noreferrer'},p.title||p.url):el('span',p.title||'');
    list.append(el('li',{'data-post':String(p.id??'')},el('div.today-creators-head',el('b',p.kol_name||''),el('span.small.muted',when(p.published_at)+' ET'),take),
      el('p.today-creators-title',title),pending(o)?el('p.small.muted',s('today.creators_pending')):el('p',text(o)),
      p.tickers?.length?el('div.today-creators-tickers',...p.tickers.slice(0,6).map(t=>el('span.pill.mono',el('span.ticker-symbol',String(t))))):null));
  }
  box.append(list,el('p.small.muted',s('today.creators_note')));
  return box;
}

// Preserve the transcript feed while the additive video-point stream is unavailable.
export function mountCreatorMacro(host,{signal,nativePoints=false}={}){
  const epoch=store.epoch(),token=store.get('token'),ctl=new AbortController();
  let disposed=false,feed=null;
  const current=()=>!disposed&&!signal?.aborted&&epoch===store.epoch()&&token===store.get('token');
  function render(){
    if(!current()||!feed)return;
    const posts=(feed.posts||[]).filter(post=>{
      const meta=parse(post.summary);
      // Native points have their own revision and withdrawal boundary. An older
      // aggregate feed must not restore them after that stream removes a view.
      return !nativePoints||meta?.source?.kind!=='native_video';
    });
    const block=creatorMacroBlock({...feed,posts});host.hidden=!block;host.replaceChildren(...(block?[block]:[]));
  }
  const off=store.subscribe('*',()=>{if(epoch!==store.epoch()||token!==store.get('token')){dispose();host.replaceChildren();}});
  function dispose(){if(disposed)return;disposed=true;ctl.abort();off();signal?.removeEventListener('abort',dispose);}
  signal?.addEventListener('abort',dispose,{once:true});
  const ready=signal?.aborted?(dispose(),Promise.resolve()):api.kol.feed({signal:ctl.signal}).then(value=>{if(!current())return;feed=value;render();})
    .catch(()=>{if(current())host.hidden=true;});
  return {ready,dispose};
}
