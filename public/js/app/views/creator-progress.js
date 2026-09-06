// One request at a time; background tabs pause reads and failures back off.
export function progressPoll({read,onValue,onError=()=>{},active,interval=4000}) {
  let stopped=false,running=false,timer=null,failures=0;
  function schedule() {
    clearTimeout(timer);
    if(!stopped && active()) timer=setTimeout(refresh,Math.min(30000,interval*2**Math.min(failures,3)));
  }
  async function refresh() {
    clearTimeout(timer);
    if(stopped || running || !active())return;
    if(document.visibilityState==='hidden'){schedule();return;}
    running=true;
    try {const value=await read();failures=0;if(!stopped&&active())onValue(value);}
    catch(error){failures++;if(!stopped&&active())onError(error);}
    finally{running=false;schedule();}
  }
  const visible=()=>{if(document.visibilityState!=='hidden')refresh();};
  document.addEventListener('visibilitychange',visible);
  return {refresh,schedule,stop(){stopped=true;clearTimeout(timer);document.removeEventListener('visibilitychange',visible);}};
}
