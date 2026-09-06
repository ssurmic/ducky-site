import {s} from '../strings.js';
import {el,clear} from '../ui.js';
import * as api from '../api.js';
import * as store from '../store.js';
import {safeSource,dateTime} from './creator-research.js';
import {progressPoll} from './creator-progress.js';

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

export function mountSetup(root,{onFollow,initial='',state={}}) {
  const epoch=store.epoch();let stopped=false,busy=false,generation=0,suggestVersion=0,debounce=null,activeIndex=-1,choices=[];
  const ctl=new AbortController();
  const wrap=el('section.creator-onboarding');root.append(wrap);
  const listId='creator-suggestions';
  const field=el('input.input',{type:'text',maxlength:240,value:state.input ?? initial,placeholder:s('creatorflow.placeholder'),
    'aria-label':s('creatorflow.input'),role:'combobox','aria-autocomplete':'list','aria-expanded':'false','aria-controls':listId,autocomplete:'off',required:true});
  const submit=el('button.btn.btn-primary',{type:'submit'},s('creatorflow.find'));
  const suggestions=el('div.creator-suggestions',{id:listId,role:'listbox','aria-label':s('creatorflow.suggestions'),hidden:true});
  const hint=el('p.small.muted',s('creatorflow.directory_hint'));
  const results=el('div.creator-find-results',{'aria-live':'polite'});
  const form=el('form.creator-find-form',el('label',el('span',s('creatorflow.input')),field),submit);
  const examples=[['Ticker Symbol: YOU','ai'],['Joseph Carlson','portfolio'],['投资TALK君','macro'],['商浩金','macro']];
  const picks=el('div.creator-example-grid',...examples.map(([name,topic])=>el('button.creator-pick',{type:'button',onclick:()=>{
    field.value=name;field.dispatchEvent(new field.ownerDocument.defaultView.Event('input'));field.focus();
  }},el('strong',name),el('span',s('creatorflow.topic_'+topic)))));
  wrap.append(el('div.creator-setup-heading',el('div',el('h2',s('creatorflow.add')),el('p.muted.small',s('creatorflow.find_hint')))),
    picks,form,suggestions,hint,results);
  function live(){return !stopped && epoch===store.epoch() && root.isConnected;}
  function failure(err){clear(results);results.append(el('p.err',{role:'alert'},s('creatorflow.error_'+err.message)===('creatorflow.error_'+err.message)?s('creatorflow.error'):s('creatorflow.error_'+err.message)));}
  const poll=progressPoll({active:()=>live()&&['queued','running'].includes(state.doc?.status),
    read:async()=>{const version=generation;const doc=await api.get('/kol/resolve/'+state.doc.id,{signal:ctl.signal});return {version,doc};},
    onValue:({version,doc})=>{if(version===generation)show(doc);},
    onError:()=>{const note=results.querySelector('.creator-progress-note');if(note)note.textContent=s('creatorflow.reconnecting');}});
  function closeSuggestions(){suggestions.hidden=true;field.setAttribute('aria-expanded','false');field.removeAttribute('aria-activedescendant');activeIndex=-1;}
  async function search() {
    const version=++suggestVersion;const value=field.value.trim();
    if(!store.isPro()||value.length>100){closeSuggestions();return;}
    try {
      const doc=await api.get('/kol/suggest?q='+encodeURIComponent(value),{signal:ctl.signal});
      if(!live()||version!==suggestVersion)return;
      choices=doc.items||[];activeIndex=-1;clear(suggestions);
      for(const [i,c] of choices.entries())suggestions.append(el('button.creator-suggestion',{id:listId+'-'+i,type:'button',role:'option','aria-selected':'false',tabindex:-1,
        onmousedown:e=>e.preventDefault(),onclick:()=>pick(c)},avatar(c),el('span',el('strong',c.name),el('small.muted',c.handle||c.channel_id))));
      suggestions.hidden=!choices.length;field.setAttribute('aria-expanded',String(!!choices.length));
    }catch {if(live()&&version===suggestVersion)closeSuggestions();}
  }
  function pick(c){closeSuggestions();field.value=c.name;state.input=c.name;begin(c.channel_id,c.channel_id);}
  field.addEventListener('input',()=>{state.input=field.value;state.doc=null;generation++;suggestVersion++;clear(results);closeSuggestions();clearTimeout(debounce);debounce=setTimeout(search,200);});
  field.addEventListener('focus',search);
  field.addEventListener('blur',()=>{setTimeout(()=>{if(!suggestions.contains(document.activeElement))closeSuggestions();},0);});
  field.addEventListener('keydown',e=>{
    if(e.key==='Escape'){closeSuggestions();return;}
    if(suggestions.hidden||!choices.length)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();activeIndex=(activeIndex+(e.key==='ArrowDown'?1:-1)+choices.length)%choices.length;
      for(const [i,node] of [...suggestions.children].entries())node.setAttribute('aria-selected',String(i===activeIndex));
      field.setAttribute('aria-activedescendant',listId+'-'+activeIndex);
    }else if(e.key==='Enter'&&activeIndex>=0){e.preventDefault();pick(choices[activeIndex]);}
  });
  function confirmed(response){state.doc=null;state.input='';onFollow(response);}
  function choose(c,lookupId){confirmCreator(c,()=>api.post('/kol/resolve/'+lookupId+'/confirm',{channel_id:c.channel_id}),confirmed,live);}
  function show(doc) {
    state.doc=doc;clear(results);
    if(doc.status==='ready') {
      results.append(el('p.small',{role:'status'},s('creatorflow.choose')));
      for(const c of doc.candidates||[])results.append(el('button.creator-candidate',{type:'button',onclick:()=>choose(c,doc.id)},avatar(c),el('span',el('strong',c.name),el('small.muted',c.handle||c.channel_id)),el('span','→')));
    }else if(['queued','running'].includes(doc.status)) {
      results.append(el('p',{role:'status'},s('creatorflow.lookup_'+doc.status)),el('p.creator-progress-note.small.muted',s('creatorflow.auto_update')),
        el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:poll.refresh},s('creatorflow.check')));poll.schedule();
    }else results.append(el('p.muted',{role:'status'},s(doc.status==='needs_url'?'creatorflow.needs_url':'creatorflow.unavailable')));
  }
  async function begin(input,chooseId=null){
    if(busy||!live())return;
    if(!store.isPro()){clear(results);results.append(el('a.btn.btn-primary',{href:'#/billing'},s('creators.upgrade')));return;}
    const version=++generation;state.initialized=true;state.input=field.value;state.doc=null;suggestVersion++;closeSuggestions();busy=true;submit.disabled=true;
    clear(results);results.append(el('p',{role:'status'},s('common.loading')));
    try {const doc=await api.post('/kol/resolve',{input},{signal:ctl.signal});if(live()&&version===generation){show(doc);const c=doc.candidates?.find(c=>c.channel_id===chooseId);if(c)choose(c,doc.id);}}
    catch(err){if(live()&&version===generation)failure(err);}
    finally{busy=false;submit.disabled=false;}
  }
  form.addEventListener('submit',e=>{e.preventDefault();begin(field.value);});
  if(state.doc)show(state.doc);
  else if(!state.initialized&&store.isPro()){
    state.initialized=true;const version=generation;
    api.get('/kol/lookups',{signal:ctl.signal}).then(({items=[]})=>{if(live()&&version===generation&&items.length){field.value=state.input=items[0].input||'';show(items[0]);}}).catch(()=>{});
  }
  return ()=>{stopped=true;ctl.abort();poll.stop();clearTimeout(debounce);};
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
    try {const response=await follow();if(response?.subscribed!==true)throw new Error('follow_not_saved');action.disabled=false;if(live())onFollow(response);close();}
    catch {error.textContent=s('creatorflow.follow_error');action.disabled=false;dialog.querySelector('button.btn-ghost').disabled=false;}
  });
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  document.body.append(dialog);dialog.showModal();
}
