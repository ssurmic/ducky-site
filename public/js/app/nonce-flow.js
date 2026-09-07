// Shared polling lifecycle for Telegram sign-in and same-account connection.
// Adapters own their response contract and final action; this controller never sets a session.
export function startNonceFlow({create,poll,onCreated,onPending,onReady,onExpired,onError,isCurrent=()=>true}) {
  const ctl=new AbortController();let stopped=false,timer=null,nonce=null,deadline=0;
  const active=()=>!stopped&&!ctl.signal.aborted&&isCurrent();
  const stop=()=>{stopped=true;clearTimeout(timer);ctl.abort();};
  const fail=error=>{if(active())onError(error);stop();};
  const expire=()=>{if(active())onExpired();stop();};
  async function tick(){
    if(!active()){stop();return;}
    if(Date.now()>=deadline){expire();return;}
    let wait=5000;
    try {
      const result=await poll(nonce,{signal:ctl.signal});
      if(!active()){stop();return;}
      if(result.ready){await onReady(result.value);stop();return;}
      if(Number.isFinite(result.retryAfter))wait=Math.min(30000,Math.max(1000,result.retryAfter*1000));
    }catch(error){
      if(!active()){stop();return;}
      if(error?.status===410){expire();return;}
      if(error?.status!==0&&error?.status!==429&&!(error?.status>=500&&error?.status<600)){fail(error);return;}
      const retry=Number(error?.body?.retry_after);if(retry>0)wait=Math.min(30000,Math.max(1000,retry*1000));
    }
    if(!active()){stop();return;}
    onPending(Math.max(0,Math.ceil((deadline-Date.now())/1000)));
    timer=setTimeout(tick,Math.max(1,Math.min(wait,deadline-Date.now())));
  }
  (async()=>{
    try {
      const result=await create({signal:ctl.signal});
      if(!active()){stop();return;}
      if(typeof result?.nonce!=='string'||!/^[A-Za-z0-9_-]{12,128}$/.test(result.nonce)||!Number.isFinite(result.ttl)||result.ttl<=0||result.ttl>1800)throw new Error('invalid_nonce');
      nonce=result.nonce;deadline=Date.now()+result.ttl*1000;onCreated(result);
      if(active())timer=setTimeout(tick,Math.min(5000,result.ttl*1000));
    }catch(error){fail(error);}
  })();
  return {stop,get nonce(){return nonce;}};
}
