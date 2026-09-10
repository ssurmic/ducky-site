import { el, clear } from "./ui.js";
import { s } from "./strings.js";

export function moduleVersion(url = import.meta.url) {
  return /\/app-assets\/([a-f0-9]{20})\//.exec(url)?.[1] || null;
}

// Recovery never automatically reloads a tab: a release must not discard a form the
// user is editing. The button refreshes the exact URL; stored auth and route queries
// remain in place. Normal updates work through the retained complete module graphs.
export function showModuleRecovery(root, {
  signal, currentVersion = moduleVersion(),
  fetchRelease = (...args) => fetch(...args),
  refresh = () => location.reload(),
} = {}) {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const message = el("p", s(offline ? "release.offline" : "release.failed"));
  const button = el("button.btn.btn-primary", { type: "button" }, s("release.refresh"));
  const box = el("section.card", { role: "alert" },
    el("h2", s("release.title")), message, button);
  let refreshing = false;
  button.addEventListener("click", () => {
    if (refreshing || signal?.aborted) return;
    refreshing = true;
    button.disabled = true;
    refresh();
  });
  clear(root); root.append(box);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 5000);
  const ready = (async () => {
    if (offline || !currentVersion || controller.signal.aborted) return;
    try {
      const response = await fetchRelease("/app-release.json", { cache: "no-store", signal: controller.signal });
      if (!response.ok) return;
      const latest = await response.json();
      if (!controller.signal.aborted && /^[a-f0-9]{20}$/.test(latest.version) && latest.version !== currentVersion) {
        message.textContent = s("release.updated");
      }
    } catch (_) { /* Keep the useful refresh action when the release check is unavailable. */ }
  })().finally(() => { clearTimeout(timer); signal?.removeEventListener("abort", abort); });
  return { ready, dispose: () => { abort(); clearTimeout(timer); signal?.removeEventListener("abort", abort); } };
}

// A healthy long-open tab can still be running yesterday's UI. Check on return
// and periodically; offer one explicit reload without discarding forms or auth.
export function watchRelease(host, {currentVersion=moduleVersion(),fetchRelease=(...args)=>fetch(...args),
  refresh=()=>location.reload(),now=()=>Date.now(),interval=300000}={}) {
  let stopped=false,running=false,last=-Infinity,found=false,timer=null,controller=null;
  const button=el('button.btn.btn-ghost.btn-sm',{type:'button'},s('release.open_latest'));
  const notice=el('aside.app-release-update',{role:'status',hidden:true},el('span',s('release.available')),button);
  host.prepend(notice);
  button.addEventListener('click',()=>{if(!stopped&&!button.disabled){button.disabled=true;refresh();}});
  async function check(){
    if(stopped||running||found||!currentVersion||document.visibilityState==='hidden'||window.navigator?.onLine===false||now()-last<60000)return;
    running=true;last=now();controller=new AbortController();const deadline=setTimeout(()=>controller.abort(),5000);
    try{
      const response=await fetchRelease('/app-release.json',{cache:'no-store',signal:controller.signal});
      if(!response.ok)return;
      const value=await response.json();
      if(!stopped&&!controller.signal.aborted&&/^[a-f0-9]{20}$/.test(value.version)&&value.version!==currentVersion){found=true;notice.hidden=false;}
    }catch{}finally{clearTimeout(deadline);running=false;}
  }
  const returned=()=>{check();};
  document.addEventListener('visibilitychange',returned);window.addEventListener('pageshow',returned);window.addEventListener('online',returned);
  timer=setInterval(returned,interval);timer.unref?.();
  const ready=check();
  return {ready,check,stop(){stopped=true;clearInterval(timer);controller?.abort();notice.remove();document.removeEventListener('visibilitychange',returned);window.removeEventListener('pageshow',returned);window.removeEventListener('online',returned);}};
}
