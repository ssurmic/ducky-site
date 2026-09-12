import * as api from './api.js';
import * as store from './store.js';
import {el,clear,dateTime} from './ui.js';
import {s} from './strings.js';

export const CHAPTERS=[['add','map','node','chart'],['opinion','source','video'],['calendar'],['insider','finish']];
const targets={add:'watchlist.add',map:'stock.map',node:'node.open',chart:'chart.controls',
  opinion:'opinion.open',source:'source.original',video:'video.open',calendar:'calendar.day',insider:'insider.open',finish:'watchlist.home'};
const chapterOf=step=>CHAPTERS.findIndex(items=>items.includes(step));
// Keep the real control visible, including when a phone keyboard reduces the viewport.
export function tourPlacement(rect, viewport, naturalHeight){
  const {left=0,top=0,width,height}=viewport,pad=12,gap=18;
  const w=Math.min(360,width-2*pad),bottom=top+height;
  if(width>=700&&left+width-rect.right>=w+gap+pad)return {left:rect.right+gap,top:Math.max(top+pad,Math.min(rect.top,bottom-naturalHeight-pad)),width:w,maxHeight:height-2*pad};
  const above=Math.max(0,rect.top-top-gap-pad),below=Math.max(0,bottom-rect.bottom-gap-pad);
  const after=below>=above,h=Math.min(naturalHeight,Math.max(48,after?below:above));
  return {left:left+Math.max(pad,(width-w)/2),top:after?rect.bottom+gap:Math.max(top+pad,rect.top-gap-h),width:w,maxHeight:h};
}
export function stepRoute(progress){
  const tk=encodeURIComponent(progress.ticker||'NVDA'),step=progress.step;
  if(['add','map','finish'].includes(step))return '#/watchlist';
  if(step==='node')return '#/evidence/'+tk;
  if(step==='chart')return '#/chart/'+tk;
  if(['opinion','source'].includes(step))return '#/evidence/NVDA'+(progress.examples?.graph_id?'?tour_snapshot='+encodeURIComponent(progress.examples.graph_id):'');
  if(step==='video'){
    const ref=progress.examples?.opinion;
    const q=new URLSearchParams({ticker:'NVDA',scope:'discover'});
    if(ref?.creator_id)q.set('creator',ref.creator_id);
    if(ref?.post_id)q.set('post',ref.post_id);
    if(ref?.point_id)q.set('point',ref.point_id);
    return '#/creators?'+q;
  }
  if(step==='calendar')return '#/calendar'+(progress.examples?.calendar?.date?'?date='+encodeURIComponent(progress.examples.calendar.date):'');
  if(step==='insider'&&progress.examples?.insider?.record_id)return '#/record/'+encodeURIComponent(progress.examples.insider.record_id);
  return '#/boards?board=insider&mode=archive&purchases=open_market';
}

export function matchesProgress(progress, event){
  if(!progress||progress.status!=='active'||progress.step!==event.step)return false;
  if(['add','map','node','chart'].includes(event.step)&&event.ticker!==progress.ticker&&event.step!=='add')return false;
  if(event.step==='opinion'&&event.ticker!=='NVDA')return false;
  const ref=progress.examples?.opinion;
  if(event.step==='opinion'&&ref?.node_id&&event.source!==ref.node_id)return false;
  if(['source','video'].includes(event.step)){
    if(!ref||event.post!==ref.post_id||event.sourceHash!==ref.source_hash)return false;
  }
  if(event.step==='calendar'&&progress.examples?.calendar?.date&&event.date!==progress.examples.calendar.date)return false;
  if(event.step==='calendar'&&progress.examples?.calendar?.id&&!event.ids?.includes(progress.examples.calendar.id))return false;
  if(event.step==='insider'&&progress.examples?.insider?.record_id&&event.record!==progress.examples.insider.record_id)return false;
  if(event.step==='chart'&&(!event.changed||!(event.bars>0)))return false;
  if(event.step==='video'&&!['external_link_opened','video_played'].includes(event.outcome))return false;
  return true;
}

export function startOnboarding(){
  let progress=null,uid=null,busy=false,visible=false,stopped=false,frame=null,target=null,timeout=null,loading=0,described=null,pendingPause=null;
  const card=el('aside.tour-card',{role:'region','aria-label':s('tour.title'),hidden:true});
  const ring=el('div.tour-ring',{'aria-hidden':'true',hidden:true});
  const help=el('button.tour-help',{type:'button',hidden:true,onclick:()=>show()},s('tour.help'));
  document.body.append(card,ring,help);
  const button=(key,fn,primary=false)=>el('button.btn',{type:'button','data-tour-action':key,class:primary?'btn-primary':'btn-ghost',disabled:key==='tour.exit'?false:busy,onclick:fn},s(key));
  function releaseTarget(){if(target){if(described===null)target.removeAttribute('aria-describedby');else target.setAttribute('aria-describedby',described);}target=null;described=null;}
  function hide(){visible=false;card.hidden=true;ring.hidden=true;releaseTarget();clearTimeout(timeout);document.body.classList.remove('tour-visible');}
  function failure(error){
    if(error?.status===409){progress=error.body?.current||progress;render(s('tour.changed_elsewhere'));return;}
    if(error?.status===402){hide();return;}
    render(s('tour.save_failed'));
  }
  async function save(action,extra={}){
    if(action==='pause')hide();
    if(busy){if(action==='pause')pendingPause=uid;return;}
    if(!progress||stopped)return;
    busy=true;const account=uid,epoch=store.epoch();
    card.querySelectorAll('button').forEach(button=>{if(button.dataset.tourAction!=='tour.exit')button.disabled=true;});
    try{
      const value=await api.request('PATCH','/me/onboarding',{body:{revision:progress.revision,action,...extra},silent402:true});
      if(stopped||uid!==account||store.epoch()!==epoch)return;
      progress=value;
      try{window.localStorage?.setItem('ducky-tour-change',String(Date.now()));}catch{}
      if(action==='pause')hide();else render();
    }catch(error){if(uid===account&&!stopped)failure(error);}
    finally{
      busy=false;if(visible)card.querySelectorAll('button').forEach(b=>b.disabled=false);
      const pauseFor=pendingPause;pendingPause=null;
      if(pauseFor!==null&&pauseFor===uid&&!stopped)void save('pause');
    }
  }
  async function load(){
    const me=store.get('me'),id=++loading;
    if(!me){uid=null;progress=null;help.hidden=true;hide();return;}
    // Older backends do not advertise the tour; no unsolicited request on them.
    if(!me.onboarding_enabled){help.hidden=true;hide();return;}
    uid=me.user_id;const account=uid;
    try{
      const value=await api.get('/me/onboarding',{silent402:true});
      if(stopped||id!==loading||account!==store.get('me')?.user_id)return;
      progress=value;help.hidden=!value.enabled;
      if(value.enabled&&value.eligible&&value.status==='new'&&store.canResearch())show();
      else if(visible)render();
    }catch{help.hidden=false;}
  }
  function show(){if(!progress){void load();return;}visible=true;render();}
  function render(note=''){
    if(!visible||!progress)return;
    if(!card.isConnected)document.body.append(card);
    document.body.classList.add('tour-visible');card.hidden=false;card.removeAttribute('style');clear(card);ring.hidden=true;releaseTarget();clearTimeout(timeout);
    const step=progress.step,chapter=chapterOf(step);
    card.append(el('div.tour-heading',el('img',{src:'/duck-head-cutout-v1.png',alt:'',width:36,height:36}),
      el('strong',s('tour.title')),button('tour.exit',()=>save('pause'))));
    if(progress.trial_ends_at)card.append(el('p.tour-expiry',s('tour.until',{date:dateTime(progress.trial_ends_at)})));
    if(!store.canResearch()){
      card.append(el('p',s('tour.expired')),el('a.btn.btn-primary',{href:'#/billing',onclick:hide},s('tour.pro')));return;
    }
    if(note)card.append(el('p.tour-notice',{role:'status'},note));
    if(progress.status==='new'){
      card.append(el('h2',s('tour.welcome')),el('p',s('tour.welcome_body')),
        button('tour.start',()=>{void save('start');},true),button('tour.later',()=>save('pause')));return;
    }
    if(['chapter_done','finished','paused'].includes(progress.status)){
      card.append(el('h2',s(progress.status==='finished'?'tour.finished':'tour.chapters')),
        el('p',s('tour.count',{done:progress.completed.length,total:CHAPTERS.flat().length})));
      CHAPTERS.forEach((steps,index)=>{
        const done=steps.every(step=>progress.completed.includes(step));
        card.append(button('tour.chapter_'+index,()=>save('chapter',{chapter:index}),!done&&index===chapter));
      });
      if(progress.status==='paused')card.append(button('tour.resume',()=>save('resume'),true));
      card.append(el('a.btn.btn-ghost',{href:'#/watchlist',onclick:hide},s('tour.return')),button('tour.restart',()=>save('restart')));return;
    }
    card.append(el('p.tour-chapter',s('tour.chapter_'+chapter)),el('h2',s('tour.step_'+step)),el('p',s('tour.body_'+step)));
    if(step==='opinion'&&progress.ticker!=='NVDA')card.append(el('p.tour-notice',s('tour.nvda_example')));
    if(progress.examples?.opinion?.published_at&&['opinion','source','video'].includes(step))card.append(el('p.tour-notice',s('tour.example_date',{date:dateTime(progress.examples.opinion.published_at)})));
    const route=stepRoute(progress);
    card.append(el('a.btn.btn-primary.tour-route',{href:route},s('tour.open_section')));
    const actions=el('div.tour-actions',button('tour.back',()=>save('back')),
      button('tour.skip',()=>save('skip',{step,outcome:'user_skipped'})));
    // Explanatory chapter ending is a real return to the saved list.
    if(step==='finish')actions.append(button('tour.done',()=>{
      if(location.hash.startsWith('#/watchlist'))void save('complete',{step});
      else location.hash='#/watchlist';
    },true));
    if(step==='add'&&(store.get('watchlist')||[]).includes(progress.ticker))actions.append(button('tour.use_saved',()=>save('complete',{step:'add'}),true));
    card.append(actions,el('p.tour-hint',{role:'status'},s('tour.wait_for_action')));
    timeout=setTimeout(()=>{
      const hint=card.querySelector('.tour-hint');if(!visible||!hint)return;
      if(findTarget())return; // A user reading the visible control is not a failed request.
      void api.post('/events',{events:[{name:'onboarding_step_unavailable',payload:{version:progress.version,step,reason:'target_not_ready'}}]},{silent402:true}).catch(()=>{});
      hint.textContent=s('tour.unavailable');
      hint.append(button('tour.retry',()=>{render();void import('./router.js').then(router=>router.go(stepRoute(progress)));}),
        button('tour.use_nvda',()=>save('example',{ticker:'NVDA'})));
    },15000);
    schedule();
  }
  function findTarget(){
    const nodes=[...document.querySelectorAll('[data-tour]')].filter(n=>n.dataset.tour.split(' ').includes(targets[progress.step]));
    const ref=progress.examples?.opinion;
    return nodes.find(n=>{
      if(n.disabled||n.closest('[hidden]')||n.closest('[inert]'))return false;
      if(n.dataset.ticker&&['map','node','chart'].includes(progress.step)&&n.dataset.ticker!==progress.ticker)return false;
      if(['opinion','source'].includes(progress.step)&&ref?.node_id&&n.dataset.source&&n.dataset.source!==ref.node_id)return false;
      if(progress.step==='source'&&ref?.post_id&&n.dataset.post!==ref.post_id)return false;
      if(progress.step==='video'&&ref?.post_id&&n.dataset.post!==ref.post_id)return false;
      if(progress.step==='calendar'&&progress.examples?.calendar?.date&&n.dataset.date!==progress.examples.calendar.date)return false;
      return n.getBoundingClientRect().width>0;
    });
  }
  function position(){
    frame=null;if(!visible)return;
    if(!card.isConnected)document.body.append(card);
    if(progress?.status!=='active')return;
    if(progress.step==='map'&&!busy&&document.querySelector('[data-tour="map.ready"][data-ticker="'+progress.ticker+'"]')){
      void save('complete',{step:'map'});return;
    }
    const next=findTarget();ring.hidden=!next;
    const modal=document.querySelector('#modal:not([hidden]) .modal-box');
    const parent=modal||document.body;if(card.parentElement!==parent)parent.append(card);
    if(!next)return;
    const changed=target!==next;
    if(changed){
      releaseTarget();target=next;described=next.getAttribute('aria-describedby');
      next.scrollIntoView?.({block:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      next.setAttribute('aria-describedby',((described||'')+' tour-instruction').trim());
    }
    card.querySelector('h2')?.setAttribute('id','tour-instruction');
    const r=next.getBoundingClientRect(),v=window.visualViewport;
    const left=v?.offsetLeft||0,top=v?.offsetTop||0,width=v?.width||window.innerWidth,height=v?.height||window.innerHeight;
    Object.assign(ring.style,{left:r.left-5+'px',top:r.top-5+'px',width:r.width+10+'px',height:r.height+10+'px'});
    const placement=tourPlacement(r,{left,top,width,height},card.scrollHeight+2);
    Object.assign(card.style,Object.fromEntries(Object.entries(placement).map(([k,v])=>[k,v+'px'])),{bottom:'auto'});
  }
  function schedule(){if(frame==null)frame=requestAnimationFrame(position);}
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
  const event=ev=>{
    if(visible&&matchesProgress(progress,ev.detail)&&!busy){
      clearTimeout(timeout);
      void save('complete',{step:progress.step,ticker:progress.step==='add'?ev.detail.ticker:progress.ticker,outcome:ev.detail.outcome||'view_confirmed'});
    }
  };
  const escape=event=>{if(event.key==='Escape'&&visible){event.preventDefault();void save('pause');}};
  const off=store.subscribe('me',me=>{
    if(!me||me.user_id!==uid||!me.onboarding_enabled)void load();
    else if(!store.canResearch()){hide();}
    else if(me.onboarding_enabled&&!progress)void load();
  });
  const storage=event=>{if(event.key==='ducky-tour-change')void load();};
  const navigate=()=>{
    if(!visible||progress?.status!=='active')return;
    const name=location.hash.split(/[/?]/)[1]||'';
    const allowed={add:['watchlist'],map:['watchlist','evidence'],node:['evidence'],chart:['evidence','chart'],
      opinion:['evidence'],source:['evidence','creators'],video:['creators'],calendar:['calendar'],insider:['boards','record'],finish:['boards','record','watchlist']};
    if(!allowed[progress.step]?.includes(name))void save('pause');
    else schedule();
  };
  document.addEventListener('ducky:tour-progress',event);
  document.addEventListener('keydown',escape);
  window.addEventListener('storage',storage);window.addEventListener('resize',schedule);
  window.addEventListener('hashchange',navigate);
  document.addEventListener('scroll',schedule,true);
  window.visualViewport?.addEventListener('resize',schedule);window.visualViewport?.addEventListener('scroll',schedule);
  void load();
  return ()=>{stopped=true;off();observer.disconnect();clearTimeout(timeout);if(frame!=null)cancelAnimationFrame(frame);
    document.removeEventListener('ducky:tour-progress',event);document.removeEventListener('keydown',escape);
    window.removeEventListener('storage',storage);window.removeEventListener('resize',schedule);window.removeEventListener('hashchange',navigate);document.removeEventListener('scroll',schedule,true);
    window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
    releaseTarget();card.remove();ring.remove();help.remove();document.body.classList.remove('tour-visible');};
}
