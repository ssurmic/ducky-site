import {s} from '../strings.js';
import {el,clear} from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {safeSource,dateTime} from './creator-research.js';

export function avatar(creator) {
  const src=creator.profile?.avatar || creator.avatar;
  const fallback=el('span.creator-monogram',{'aria-hidden':'true'},(creator.name || '?').slice(0,1));
  try {
    const u=new URL(src);
    if(u.protocol==='https:' && ['yt3.googleusercontent.com','yt3.ggpht.com'].includes(u.hostname)) {
      const img=el('img.creator-avatar',{src:u.href,alt:'',loading:'lazy',referrerpolicy:'no-referrer',width:44,height:44});
      img.addEventListener('error',()=>img.replaceWith(fallback),{once:true});return img;
    }
  } catch { /* public identity can still be confirmed without an image */ }
  return fallback;
}

export function mountSetup(root,{onFollow,initial=''}) {
  const epoch=store.epoch();let stopped=false,lookupId='',busy=false;
  const wrap=el('section.creator-onboarding');root.append(wrap);
  const field=el('input.input',{type:'text',maxlength:240,value:initial,placeholder:s('creatorflow.placeholder'),'aria-label':s('creatorflow.input'),required:true});
  const submit=el('button.btn.btn-primary',{type:'submit'},s('creatorflow.find'));
  const results=el('div.creator-find-results',{'aria-live':'polite'});
  const form=el('form.creator-find-form',el('label',el('span',s('creatorflow.input')),field),submit);
  wrap.append(el('div.creator-setup-heading',el('div',el('p.eyebrow',s('creatorflow.step1')),el('h2',s('creatorflow.add')),el('p.muted.small',s('creatorflow.find_hint')))),form,
    el('button.creator-example',{type:'button',onclick:()=>{field.value='https://www.youtube.com/@TickerSymbolYOU';field.focus();}},s('creatorflow.example')+' youtube.com/@TickerSymbolYOU'),results);
  function live(){return !stopped && epoch===store.epoch() && root.isConnected;}
  function failure(err){clear(results);results.append(el('p.err',{role:'alert'},s('creatorflow.error_'+err.message)===('creatorflow.error_'+err.message)?s('creatorflow.error'):s('creatorflow.error_'+err.message)));}
  async function check() {
    if(busy || !live())return;busy=true;
    try {const doc=await api.get('/kol/resolve/'+lookupId);if(live())show(doc);}catch(e){if(live())failure(e);}finally{busy=false;}
  }
  function show(doc) {
    clear(results);lookupId=doc.id;
    if(doc.status==='ready') {
      results.append(el('p.small',s('creatorflow.choose')));
      for(const c of doc.candidates || []) results.append(el('button.creator-candidate',{type:'button',onclick:()=>confirmCreator(c,()=>api.post('/kol/resolve/'+lookupId+'/confirm',{channel_id:c.channel_id}),onFollow,live)},avatar(c),el('span',el('strong',c.name),el('small.muted',c.handle || c.channel_id)),el('span','→')));
    } else if(['queued','running'].includes(doc.status)) {
      results.append(el('p',s('creatorflow.lookup_'+doc.status)),el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:check},s('creatorflow.check')));
    } else results.append(el('p.muted',s(doc.status==='needs_url'?'creatorflow.needs_url':'creatorflow.unavailable')));
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;
    if(!store.isPro()){clear(results);results.append(el('a.btn.btn-primary',{href:'#/billing'},s('creators.upgrade')));return;}
    busy=true;submit.disabled=true;clear(results);results.append(el('p',{role:'status'},s('common.loading')));
    try {const doc=await api.post('/kol/resolve',{input:field.value});if(live())show(doc);}catch(err){if(live())failure(err);}finally{busy=false;submit.disabled=false;}
  });
  const timer=setInterval(()=>{if(live() && lookupId && results.querySelector('button.btn'))check();},12000);
  return ()=>{stopped=true;clearInterval(timer);};
}

export function confirmCreator(creator,follow,onFollow,live=()=>true) {
  const opener=document.activeElement;
  const dialog=el('dialog.creator-confirm',{'aria-labelledby':'creator-confirm-title'});
  const action=el('button.btn.btn-primary',{type:'button'},s('creatorflow.confirm'));
  const error=el('p.err',{role:'alert'});
  const close=()=>{if(action.disabled)return;dialog.close();dialog.remove();if(opener?.isConnected)opener.focus();};
  const description=creator.profile?.description || creator.description || creator.descr || s('creators.profile_pending');
  dialog.append(el('p.eyebrow',s('creatorflow.step2')),el('h2#creator-confirm-title',s('creatorflow.is_this')),
    el('div.creator-identity',avatar(creator),el('div',el('h3',creator.name),el('p.muted.small',creator.profile?.handle || creator.handle || creator.channel_id || 'YouTube'))),
    el('p.small',description.length>220?description.slice(0,220)+'…':description));
  if(description.length>220)dialog.append(el('details',el('summary',s('creators.about')),el('p.small',description)));
  if(creator.profile?.as_of)dialog.append(el('p.small.muted',s('creators.profile_asof')+' '+dateTime(creator.profile.as_of)));
  const url=safeSource(creator.url);
  if(url)dialog.append(el('a',{href:url,target:'_blank',rel:'noopener noreferrer'},s('creators.channel')+' ↗'));
  const recent=creator.recent || [];
  if(recent.length)dialog.append(el('h4',s('creatorflow.recent')),...recent.slice(0,3).map(p=>el('p.small',p.title,el('br'),el('span.muted',dateTime(p.published_at)))));
  dialog.append(el('p.creator-confirm-note',s('creatorflow.after_confirm')),error,
    el('div.evidence-controls',el('button.btn.btn-ghost',{type:'button',onclick:close},s('creatorflow.not_this')),action));
  action.addEventListener('click',async()=>{
    if(!live()){close();return;}action.disabled=true;dialog.querySelector('button.btn-ghost').disabled=true;
    try {const response=await follow();action.disabled=false;if(live())onFollow(response);close();}
    catch {error.textContent=s('creatorflow.follow_error');action.disabled=false;dialog.querySelector('button.btn-ghost').disabled=false;}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  document.body.append(dialog);dialog.showModal();
}
