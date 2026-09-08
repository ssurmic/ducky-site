// Revalidate only already-read, explicitly allowed shared cache endpoints. No
// source acquisition, POSTs, account settings, searches or history are replayed.
// A changed page is labelled; the reader chooses when to replace its open work.
import * as api from './api.js';
import * as store from './store.js';
import {el} from './ui.js';
import {s} from './strings.js';

export function refreshable(path){
  if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//'))return false;
  const [base,raw='']=path.split('?'),query=new URLSearchParams(raw);
  if(['before','before_id','version','offset','cursor'].some(k=>query.has(k)))return false;
  return /^(?:\/(?:evidence|snapshot|bars)\/[A-Z][A-Z0-9.-]{0,9}|\/briefing(?:\/stocks)?|\/research\/(?:context\/[A-Z][A-Z0-9.-]{0,9}|events\/[A-Z][A-Z0-9.-]{0,9}|changes)|\/market\/context|\/radar\/[a-z-]+\.json|\/kol\/(?:feed|[A-Za-z0-9_-]+\/page|[A-Za-z0-9_-]+\/posts\/[A-Za-z0-9_-]+)|\/public\/(?:calendar|market-preview|kol-feed|signals\/recent)\.json|\/watchlist)$/.test(base);
}

export function material(value,path=''){
  const evidence=/^\/evidence\/[A-Z][A-Z0-9.-]{0,9}(?:\?|$)/.test(path);
  function content(v,depth=0){
    if(Array.isArray(v))return v.map(item=>content(item,depth+1));
    if(!v||typeof v!=='object')return v;
    if(evidence&&depth===0){
      // Queued/retrying/building all render the same saved-analysis placeholder.
      // Only a change in the displayed state constitutes new information.
      const state=['ready','refresh_pending','failed','insufficient','source_changed','withdrawn'].includes(v.analysis_status)?v.analysis_status:'pending';
      v={...v,analysis_status:state};
    }
    return Object.fromEntries(Object.keys(v).sort().filter(key=>{
      if(['age_seconds','ttl_seconds','server_time','retry_after'].includes(key))return false;
      if(!evidence)return true;
      // Reprojection/check clocks and cross-ticker queue progress do not change
      // the research being read. Never rely on graph ID alone: read-time source
      // withdrawal can change nodes/analysis without a new stored graph ID.
      if(['checked_at','recorded_at'].includes(key)||key.startsWith('_'))return false;
      return depth!==0||!['id','coverage','ticker_coverage','summary_status'].includes(key);
    }).map(key=>[key,content(v[key],depth+1)]));
  }
  // Keep source publication/observation, revisions, quote session/freshness,
  // missing/withheld evidence and saved analysis content/status/version.
  return JSON.stringify(content(value));
}

export function sharedReadRefresh(root,{signal,reload,interval=60000}={}){
  delete root.dataset.freshness;
  const epoch=store.epoch(),entries=new Map();let alive=true,running=false,timer=null,cursor=0,failures=0,changed=false;
  const active=()=>alive&&!signal?.aborted&&epoch===store.epoch()&&!!store.get('me');
  const notice=el('aside.shared-read-update',{hidden:true,role:'status'},el('p',s('refresh.changed')),
    el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:()=>{if(active())reload();}},s('refresh.load')));
  root.prepend(notice);
  const off=api.observeReads((path,value,options)=>{
    if(!active()||!refreshable(path))return;
    if(!entries.has(path)&&entries.size>=12)return;
    entries.set(path,{signature:material(value,path),options});
  });
  function schedule(){clearTimeout(timer);if(active()&&!changed){timer=setTimeout(check,Math.min(300000,interval*2**Math.min(failures,3)));timer.unref?.();}}
  async function check(){
    clearTimeout(timer);if(!active()||running||changed)return;
    if(document.visibilityState==='hidden'||!entries.size){schedule();return;}
    running=true;
    const [path,prior]=[...entries][cursor++%entries.size];
    try{
      const value=await api.get(path,{...prior.options,signal,silent402:true,observe:false});
      if(!active())return;
      // A view's own polling may already have adopted a newer response.
      if(material(value,path)!==entries.get(path)?.signature){changed=true;notice.hidden=false;root.dataset.freshness='earlier-version';}
      failures=0;
    }catch(error){
      failures++;
      if(active()&&[401,402].includes(error.status)){
        changed=true;notice.hidden=false;notice.querySelector('p').textContent=s('refresh.access_changed');
        root.dataset.freshness='access-changed';root.querySelector('.route-page')?.setAttribute('hidden','');
      }
    }finally{running=false;schedule();}
  }
  const visible=()=>{if(document.visibilityState!=='hidden')schedule();};
  document.addEventListener('visibilitychange',visible);
  const stop=()=>{alive=false;clearTimeout(timer);off();document.removeEventListener('visibilitychange',visible);};
  signal?.addEventListener('abort',stop,{once:true});
  schedule();return {check,stop};
}
