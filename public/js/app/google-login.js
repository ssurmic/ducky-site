// Public provider discovery is independent of a user's session and membership.
// Unavailable discovery must remain recoverable, not look like a disabled provider.
import {s, LANG} from './strings.js';
import * as api from './api.js';
import {el} from './ui.js';

export function googleLogin({signal}={}) {
  const link=el('a.btn.google-login',{href:api.base()+'/auth/google/start?lang='+LANG},s('google.continue'));
  const retry=el('button.btn.google-login',{type:'button','data-google-retry':''},s('google.loading'));
  const status=el('p.muted.small',{'role':'status'},s('google.scope'));
  const element=el('div.google-login-block',link,retry,status);
  let disposed=false,busy=false,cancelAttempt=null;
  link.hidden=true;

  function dispose() {
    disposed=true;cancelAttempt?.();signal?.removeEventListener('abort',dispose);
  }
  async function load() {
    if(disposed || busy)return;
    busy=true;retry.disabled=true;retry.textContent=s('google.loading');
    status.textContent=s('google.scope');
    const controller=new AbortController();let timer;
    // Bound the whole operation, including a stalled JSON body after headers.
    // Each retry owns a fresh controller; late results cannot replace its state.
    const deadline=new Promise((_,reject)=>{
      cancelAttempt=()=>{controller.abort();reject(new Error('provider_load_cancelled'));};
      timer=setTimeout(cancelAttempt,5000);
    });
    try {
      const config=await Promise.race([api.auth.providers({signal:controller.signal,timeout:5000}),deadline]);
      if(disposed)return;
      if(typeof config?.google!=='boolean')throw new Error('invalid_provider_response');
      element.hidden=!config.google;
      link.hidden=!config.google;retry.hidden=true;
    } catch (_) {
      if(disposed)return;
      element.hidden=false;link.hidden=true;retry.hidden=false;
      retry.textContent=s('google.retry');status.textContent=s('google.load_failed');
    } finally {
      clearTimeout(timer);cancelAttempt=null;busy=false;
      if(!disposed)retry.disabled=false;
    }
  }
  retry.addEventListener('click',load);
  if(signal?.aborted)dispose();
  else {signal?.addEventListener('abort',dispose,{once:true});load();}
  return {element,dispose};
}
