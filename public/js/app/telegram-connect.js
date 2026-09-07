import {s,CFG} from './strings.js';
import * as api from './api.js';
import * as store from './store.js';
import {el,clear} from './ui.js';
import {startNonceFlow} from './nonce-flow.js';

export function mountTelegramConnect(root,{signal,onLinked=()=>{}}={}) {
  const ctl=new AbortController(),uid=store.get('me')?.user_id??store.get('me')?.id;
  const token=store.get('token'),epoch=store.epoch(),route=location.hash;
  let disposed=false,flow=null,nonce=null,request=null,candidate=null,state='idle',error='',confirming=false;
  const session=()=>store.epoch()===epoch&&store.get('token')===token&&(store.get('me')?.user_id??store.get('me')?.id)===uid;
  const valid=()=>!disposed&&!ctl.signal.aborted&&root.isConnected&&session()&&location.hash===route;
  const opts={signal:ctl.signal,silent402:true};
  const unsubs=[];
  const cancel=()=>{
    flow?.stop();flow=null;
    if(nonce&&state!=='linked'&&session())api.auth.telegramLinkCancel(nonce,{silent402:true}).catch(()=>{});
    nonce=null;
  };
  const cleanup=()=>{if(disposed)return;cancel();disposed=true;ctl.abort();signal?.removeEventListener('abort',cleanup);unsubs.splice(0).forEach(fn=>fn());};
  signal?.addEventListener('abort',cleanup,{once:true});
  unsubs.push(store.subscribe('token',()=>{if(!session())cleanup();}),store.subscribe('me',()=>{if(!session())cleanup();}));
  if(signal?.aborted){cleanup();return cleanup;}
  const message=e=>e?.status===409&&e?.body?.error==='telegram_linked_elsewhere'?s('notify.link_result.elsewhere'):
    e?.status===410?s('notify.link_expired'):e?.status===429?s('notify.rate_limited'):s('notify.link_result.failed');
  const fail=e=>{if(valid()){state='error';error=message(e);render();}};

  function start(){
    if(!valid()||confirming||state==='starting'||state==='waiting')return;
    cancel();request=null;candidate=null;state='starting';error='';render();
    flow=startNonceFlow({isCurrent:valid,
      create:async flowOpts=>{
        const r=await api.auth.telegramLinkNonce({...opts,...flowOpts});
        const url=new URL(r?.url);
        if(!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(r?.code)||url.protocol!=='https:'||url.hostname!=='t.me'||url.username||url.password||
            url.pathname.toLowerCase()!=='/'+String(CFG.BOT).toLowerCase()||url.hash||url.searchParams.size!==1||
            url.searchParams.get('start')!=='link_'+r.nonce)throw new Error('invalid_link');
        return r;
      },
      poll:async(n,flowOpts)=>{
        const response=await api.auth.telegramLinkPoll(n,{...opts,...flowOpts});
        const r=api.isAccepted(response)?response.body:response;
        if(api.isAccepted(response)&&r?.status==='pending')return {ready:false,retryAfter:response.retry_after};
        if(r?.status!=='confirmed'||!Number.isSafeInteger(r.telegram?.id)||r.telegram.id<=0||
            !(typeof r.telegram.first_name==='string'&&r.telegram.first_name.trim()||typeof r.telegram.username==='string'&&/^[A-Za-z0-9_]{1,32}$/.test(r.telegram.username)))throw new Error('unconfirmed_identity');
        return {ready:true,value:r.telegram};
      },
      onCreated:r=>{if(valid()){nonce=r.nonce;request=r;state='waiting';render();}},
      onPending:left=>{if(valid()){const countdown=root.querySelector('[data-link-countdown]');if(countdown)countdown.textContent=s('notify.link_waiting',{seconds:left});}},
      onReady:identity=>{if(valid()){candidate=identity;state='confirmed';render();}},
      onExpired:()=>{if(valid()){state='expired';error=s('notify.link_expired');render();}},onError:fail,
    });
  }
  async function confirm(){
    if(!valid()||state!=='confirmed'||!nonce||confirming)return;
    confirming=true;error='';render();
    try {
      const response=await api.auth.telegramLinkConfirm(nonce,opts);
      if(!valid())return;
      if(api.isAccepted(response)){error=s('notify.link_waiting_confirm');return;}
      const identities=Array.isArray(response?.identities)?response.identities.filter(row=>row?.provider==='telegram'):[];
      if(response?.ok!==true||response.linked!=='telegram'||identities.length!==1||
          identities[0].provider_uid!==String(candidate.id))throw new Error('unconfirmed_link');
      const me=await api.me(opts);
      if(!valid())return;
      if((me?.user_id??me?.id)!==uid)throw new Error('wrong_account');
      store.set('me',me);state='linked';flow?.stop();render();onLinked();
    }catch(e){if(valid()){
      error=message(e);
      if(e?.status===410){state='expired';candidate=null;}
    }}
    finally{if(valid()){confirming=false;render();}}
  }
  function render(){
    if(!valid())return;clear(root);
    if(state==='idle'||state==='error'||state==='expired'){
      root.append(el('button.btn.btn-ghost.btn-sm',{type:'button',onclick:start},s('notify.link_telegram')),el('p.muted.small',s('notify.link_hint')));
    }else if(state==='starting')root.append(el('p',{role:'status'},s('common.loading')));
    else if(state==='waiting'){
      root.append(el('p',s('notify.link_code_hint')),el('strong.telegram-link-code.mono',request.code));
      const qr=el('div.telegram-link-qr',{role:'img','aria-label':s('notify.link_qr_label')});
      try{if(window.qrcode){const code=window.qrcode(0,'M');code.addData(request.url);code.make();qr.innerHTML=code.createSvgTag(4,8);}}catch(_){}
      if(qr.childNodes.length)root.append(qr);
      root.append(el('a.btn.btn-primary.btn-sm',{href:request.url,target:'_blank',rel:'noopener'},s('notify.open_bot')),
        el('p.muted.small',{'data-link-countdown':'',role:'status'},s('notify.link_waiting',{seconds:Math.ceil(request.ttl)})));
    }else if(state==='confirmed'){
      const name=String(candidate.first_name||'').trim(),handle=candidate.username?'@'+candidate.username:'';
      root.append(el('p',s('notify.link_confirm_hint')),el('strong.telegram-link-identity',name+(name&&handle?' · ':'')+handle),
        el('p.muted.small',s('notify.link_account_note')),
        el('button.btn.btn-primary.btn-sm',{type:'button',disabled:confirming,onclick:confirm},s('notify.link_confirm')));
    }else if(state==='linked')root.append(el('p.ok',{role:'status'},s('notify.link_result.linked')));
    if(error)root.append(el('p.err',{role:'status'},error));
    if(!['idle','linked'].includes(state))root.append(el('button.btn.btn-ghost.btn-sm',{type:'button',disabled:confirming,onclick:()=>{
      if(!valid()||confirming)return;cancel();state='idle';error='';render();
    }},s('notify.cancel_link')));
  }
  render();return cleanup;
}
