import * as store from './store.js';
import * as auth from './auth.js';
import * as cache from './read-cache.js';
import {el,clear,closeModal,dateTime} from './ui.js';
import {s} from './strings.js';

export function startEntitlements(){
  let timer=null,refreshing=null,previous=null,clockKey=null,clockStart=0;
  const banner=el('div.trial-banner',{role:'status',hidden:true});
  (document.querySelector('.app-main')||document.body).prepend(banner);
  function expired(){
    const me=store.get('me');if(!me||me.access?.mode!=='trial')return;
    cache.clear();store.set('snapshots',{});closeModal();
    store.set('me',{...me,tier:'free',entitlement:{...me.entitlement,tier:'free',state:'expired',source:'none',
      capabilities:{...me.entitlement.capabilities,research:false,pro:false}}});
    void import('./router.js').then(router=>router.render());
  }
  function update(me){
    clearTimeout(timer);clear(banner);banner.hidden=me?.access?.mode!=='trial';
    const identity=JSON.stringify([me?.user_id,me?.tier,me?.entitlement?.capabilities]);
    if(previous&&identity!==previous){cache.clear();store.set('snapshots',{});closeModal();}
    previous=identity;
    if(banner.hidden)return;
    const ent=me.entitlement;
    if(!ent)return;
    const key=me.user_id+'|'+ent.server_time;
    if(clockKey!==key){clockKey=key;clockStart=performance.now();}
    const date=ent.valid_until||ent.trial?.expires_at;
    banner.append(el('span',s(ent.source==='trial'?'trial.active':ent.capabilities?.research?'trial.member':'trial.ended',
      {date:date?dateTime(date):''})),el('a',{href:'#/billing'},s('trial.manage')));
    if(ent.capabilities?.research&&ent.valid_until){
      const delay=Date.parse(ent.next_change_at||ent.valid_until)-Date.parse(ent.server_time)-(performance.now()-clockStart);
      if(Number.isFinite(delay))timer=setTimeout(()=>refresh(),Math.max(0,Math.min(delay,86400000)));
    }
  }
  async function refresh(){
    if(refreshing||store.get('me')?.access?.mode!=='trial')return refreshing;
    const view=document.getElementById('view');if(view)view.style.visibility='hidden';
    refreshing=auth.refreshMe().then(()=>import('./router.js')).then(router=>router.render()).catch(()=>{
      cache.clear();store.set('snapshots',{});closeModal();
      if(view)view.replaceChildren(el('div.errbox',el('p',s('trial.verify_failed')),
        el('button.btn',{type:'button',onclick:refresh},s('common.retry'))));
    }).finally(()=>{if(view)view.style.visibility='';refreshing=null;});
    return refreshing;
  }
  const visible=()=>{if(document.visibilityState==='visible')void refresh();};
  const off=store.subscribe('me',update);
  document.addEventListener('visibilitychange',visible);window.addEventListener('pageshow',visible);
  document.addEventListener('ducky:access-denied',expired);
  update(store.get('me'));
  return ()=>{off();clearTimeout(timer);banner.remove();document.removeEventListener('visibilitychange',visible);window.removeEventListener('pageshow',visible);document.removeEventListener('ducky:access-denied',expired);};
}
