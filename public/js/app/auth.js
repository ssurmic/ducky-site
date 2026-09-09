// auth.js — session bootstrap. inTG → POST /auth/miniapp; else Login-Widget redirect return → POST /auth/widget;
// else stored token → GET /me; else login view. Token storage: sessionStorage inside Telegram, localStorage on the
// web (SYSTEMDESIGN.md §4.1). The Login Widget runs in REDIRECT mode (data-auth-url): the CSP has no 'unsafe-eval',
// which the widget's data-onauth callback needs, so a callback-mode login would silently never complete.
import * as api from "./api.js";
import * as store from "./store.js";
import * as tg from "./tg.js";
import { CFG } from "./strings.js";
import {readTelegramLinkReturn, finishTelegramLink, failTelegramLink} from './telegram-link.js';
import {startNonceFlow} from './nonce-flow.js';

const KEY = "ducky.token";
let freshBootstrapLogin = false;
let renewal = null;
const REFRESH_LOCK_WAIT_MS = 5000;
const LOGGED_OUT = "ducky.logged-out";
export const didAuthenticateOnBoot = () => freshBootstrapLogin;
const storage = () => { try { return tg.inTG ? window.sessionStorage : window.localStorage; } catch (e) { return null; } };

export function loadToken() { try { const st = storage(); return st ? st.getItem(KEY) : null; } catch (e) { return null; } }
export function saveToken(token) { try { window.localStorage.removeItem(LOGGED_OUT); } catch {} try { const st = storage(); if (st) st.setItem(KEY, token); } catch (e) { /* private mode */ } }
export function clearToken() { try { const st = storage(); if (st) st.removeItem(KEY); } catch (e) { /* ignore */ } }

/** Retry a request on TRANSIENT failure only (network status 0, 5xx, or 429) with backoff; a definitive
 *  4xx (bad/expired/forbidden) throws immediately. Used so a tunnel/CF blip doesn't dead-end the login. */
export async function retryTransient(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const st = e && e.status;
      const transient = st === 0 || st === 429 || (st >= 500 && st < 600);
      if (!transient || i === tries - 1) throw e;
      const ra = Number((e.body && e.body.retry_after) || 0);
      const wait = ra > 0 ? Math.min(Math.max(ra, 1), 10) * 1000 : Math.min(1000 * 2 ** i, 4000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

/** Apply an auth response {token, user, tier, expires} then hydrate the session. */
export async function establish(resp) {
  if (!resp || !resp.token) throw new Error("no token");
  saveToken(resp.token);
  store.set("token", resp.token);
  // Keep the issued token for recovery, but do not claim success without a profile:
  // the router requires it and would otherwise silently return to the login screen.
  try { await retryTransient(hydrate); }
  catch (e) { console.warn("Session profile unavailable", Number(e?.status) || 0); throw e; }
  return true;
}

/** finding auth.js:22 — collapse the boot waterfall: /me and /watchlist are independent after auth, so fire
 *  them together instead of serially, then prefetch every watchlist snapshot in parallel (L2 hits, §18.2.4)
 *  so the dashboard paints from the warmed store instead of a 4-deep serial chain. */
async function hydrate() {
  const epoch = store.epoch(), token = store.get("token");
  const [me, wl] = await Promise.all([
    api.me(),
    api.watchlist.list().catch(() => null),   // non-fatal: the watchlist view re-fetches on mount
  ]);
  if (!me || typeof me !== 'object' || Array.isArray(me)) throw new api.ApiError(502,{error:'session_unavailable'});
  if (epoch !== store.epoch() || token !== store.get("token")) throw new api.ApiError(0,{detail:"session_changed"});
  store.set("me", me);
  if (wl) {
    const tickers = normalizeWatch(wl);
    store.set("watchlist", tickers);
    prefetchSnapshots(tickers);               // fire-and-forget, all in parallel
  }
  return me;
}

/** Extract [TICKER] from a /watchlist payload without importing a view module (keeps boot lean). */
function normalizeWatch(resp) {
  const arr = Array.isArray(resp) ? resp : (resp && (resp.items || resp.watchlist || resp.tickers)) || [];
  return arr.map((x) => (typeof x === "string" ? x : x && (x.ticker || x.symbol))).filter(Boolean).map((t) => String(t).toUpperCase());
}

/** §18.2.4 prefetch: warm store.snapshots for every watchlist ticker in parallel (L2 hits). Unwraps the
 *  {ticker, snapshot:{…}} envelope like the views do; guarded by the session epoch so a logout mid-flight drops it. */
function prefetchSnapshots(tickers) {
  const epoch = store.epoch();
  for (const t of tickers || []) {
    api.snapshot(t, { tries: 1, silent402: true }).then((r) => {
      if (store.epoch() !== epoch || api.isAccepted(r)) return;
      const snap = r && r.snapshot ? r.snapshot : r;
      store.patch("snapshots", { [t]: snap });
    }).catch(() => { /* non-fatal: the view fetches on mount */ });
  }
}

export function logout() {
  const tok = store.get('token') || loadToken();
  // Capture before clearing; no cookie mutation is sent, so a late logout response
  // cannot overwrite a newer login in this or another tab.
  try {
    if (tok) fetch(api.base() + "/auth/logout", {method:"POST",keepalive:true,
      headers:{Authorization:"Bearer "+tok}}).catch(()=>{});
  } catch {}
  try { if(loadToken()===tok)window.localStorage.setItem(LOGGED_OUT,"1"); } catch {}
  forgetSession(tok);
}

function deviceToken(token) {
  try { return typeof JSON.parse(atob(token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/'))).d === 'string'; }
  catch { return false; }
}

function tokenAccount(token) {
  try {
    const data=JSON.parse(atob(token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/')));
    return Number.isSafeInteger(data.u) && Number.isSafeInteger(data.s) ? {user:data.u,epoch:data.s} : null;
  } catch { return null; }
}

// These claims are only a concurrency hint. The API still verifies the adopted
// credential before returning data; a different account is never used to retry
// an operation that started in the old account.
function adoptSharedToken(token,epoch) {
  if(tg.inTG || epoch!==store.epoch() || token!==store.get('token'))return false;
  const newer=loadToken(),before=tokenAccount(token),after=tokenAccount(newer);
  if(!newer || newer===token || !before || !after || before.user!==after.user || before.epoch!==after.epoch)return false;
  if(store.get('me')?.user_id!=null && Number(store.get('me').user_id)!==after.user)return false;
  store.set('token',newer);
  return true;
}

// Logout/account switches in another tab invalidate this tab's private UI.
// Same-account renewals are adopted lazily, avoiding reload/refresh ping-pong.
if(typeof window!=='undefined')window.addEventListener('storage',event=>{
  if(tg.inTG || event.key!==KEY || event.storageArea!==storage() || event.newValue!==loadToken())return;
  const token=store.get('token');
  if(!token || event.newValue===token)return;
  const before=tokenAccount(token),after=tokenAccount(event.newValue);
  if(before && after && before.user===after.user && before.epoch===after.epoch)return;
  forgetSession(token);
});

// One renewal per tab. State and shared storage guards prevent stale work from
// restoring an account after logout or replacing a newer sign-in.
export async function renewSession() {
  if(renewal)return renewal;
  const token=store.get('token'),epoch=store.epoch(),saved=loadToken();
  const refresh=async()=>{
    if(adoptSharedToken(token,epoch))return true;
    if(epoch!==store.epoch() || token!==store.get('token') || saved!==loadToken())
      throw new api.ApiError(0,{detail:'session_changed'});
    let response;
    try { response=await api.auth.refresh(); }
    catch(error) { if(adoptSharedToken(token,epoch))return true; throw error; }
    if(adoptSharedToken(token,epoch))return true;
    if(epoch!==store.epoch() || token!==store.get('token') || saved!==loadToken())
      throw new api.ApiError(0,{detail:'session_changed'});
    if(!response?.token)throw new api.ApiError(502,{error:'session_unavailable'});
    saveToken(response.token);store.set('token',response.token);
    return true;
  };
  // A browser cookie is shared by tabs, so renewal must be serialized there too.
  // Older browsers retain the guarded fallback and the server's concurrency checks.
  const lockedRefresh=async()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),REFRESH_LOCK_WAIT_MS);
    try {
      return await window.navigator.locks.request('ducky-session-refresh',{signal:controller.signal},()=>{
        // Only bound the queue wait. Once granted, the API's own request timeout
        // applies, and the lock stays held until that request actually finishes.
        clearTimeout(timer);
        return refresh();
      });
    } catch(error) {
      if(!controller.signal.aborted)throw error;
      if(adoptSharedToken(token,epoch))return true;
      if(epoch!==store.epoch() || token!==store.get('token') || saved!==loadToken())
        throw new api.ApiError(0,{detail:'session_changed'});
      // A suspended tab can hold this lock indefinitely. Cancel our queued
      // request without stealing its lock, rotating cookies in parallel, or
      // treating contention as logout. A later user retry can acquire it anew.
      throw new api.ApiError(503,{detail:'session_busy'});
    } finally { clearTimeout(timer); }
  };
  const work=window.navigator?.locks?.request && !tg.inTG ? lockedRefresh() : refresh();
  renewal=work;
  try{return await work;}finally{if(renewal===work)renewal=null;}
}

export async function expireSession({token,epoch,retry=true} = {}) {
  if(token!==store.get('token') || epoch!==store.epoch())return false;
  if(retry && adoptSharedToken(token,epoch))return true;
  if(retry && deviceToken(token) && loadToken()===token) {
    try { return await renewSession(); }
    catch(error) {
      // Offline/server failure is not logout. Retain the session for retry.
      if(error.status!==401)throw error;
    }
  }
  if(token===store.get('token') && epoch===store.epoch())forgetSession(token);
  return false;
}

function forgetSession(token) {
  store.bumpEpoch();   // finding watchlist.js:123 — invalidate in-flight fetches before wiping the store
  if(loadToken()===token)clearToken();
  store.set("token", null);
  store.set("me", null);
  store.set("watchlist", []);
  store.set("alerts", []);
  store.set("snapshots", {});
  // An expired saved session must not discard the password-reset link being opened.
  if (!/^#\/(?:forgot|reset|register|oauth)(?:\?|$)/.test(location.hash) && location.hash !== "#/login") location.hash = "#/login";
}

export async function refreshMe(opts) {
  const epoch = store.epoch();
  const me = await api.me(opts);
  if(epoch!==store.epoch())throw new api.ApiError(0,{detail:"session_changed"});
  store.set("me", me);
  return me;
}

/** Boot: resolves true when a session exists, false when the login view must be shown. */
export async function boot() {
  freshBootstrapLogin = false;
  api.setUnauthorizedHandler(expireSession);
  const linking = readTelegramLinkReturn();
  if (linking) {
    const token = loadToken();
    if (!token) { failTelegramLink(); return false; }
    store.set('token', token);
    try { await hydrate(); await finishTelegramLink(linking); return !!store.get('me'); }
    catch (_) { failTelegramLink(); return false; }
  }
  // OAuth callback owns its cookie handoff; do not hydrate/revoke an old saved account first.
  if (location.hash.startsWith("#/oauth")) return false;
  if (tg.inTG && tg.initData) {
    try {
      await establish(await api.auth.miniapp(tg.initData));
      freshBootstrapLogin = true;
      return true;
    } catch (e) {
      console.warn("miniapp auth failed", e);
      // fall through: a stale sessionStorage token may still work
    }
  }
  if (!tg.inTG) {
    try { if (await consumeWidgetRedirect()) { freshBootstrapLogin = true; return true; } } catch (e) { console.warn("widget redirect auth failed", e); }
  }
  let token = loadToken(), renewalError = null;
  if(!tg.inTG) {
    let loggedOut=false;
    try { loggedOut=window.localStorage.getItem(LOGGED_OUT)==="1"; } catch {}
    if(token || !loggedOut) {
      if(token)store.set("token",token);
      try { await renewSession(); token=store.get("token"); }
      catch(error) {
        if(error.body?.detail==='session_changed')return false;
        if(error.body?.detail==='session_busy')renewalError=error;
        // Valid legacy/access tokens remain usable during a renewal outage.
      }
    }
  }
  if (token) {
    store.set("token", token);
    try { await hydrate(); return true; } catch (e) {
      if(e.body?.detail==='session_busy')throw e;
      if (e && e.status === 401) {
        if(loadToken()===token)clearToken();
        if(store.get('token')===token)store.set('token',null);
      } // transient (network/5xx) → keep the valid token
    }
  }
  // A usable access token can still hydrate above. Otherwise preserve the
  // session and let boot offer recovery, including cookie-only restoration.
  if(renewalError)throw renewalError;
  return false;
}

// ---- web login paths ------------------------------------------------------------------------
const WIDGET_FIELDS = ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"];

/** Where the redirect-mode widget sends the user back: this page with ?tglogin=1 (+ Telegram's signed fields). */
export function widgetReturnUrl() {
  return location.origin + location.pathname + "?tglogin=1";
}

/** Redirect-mode return: /app/?tglogin=1&id=…&auth_date=…&hash=… → POST /auth/widget, then strip the fields. */
export async function consumeWidgetRedirect() {
  let params;
  try { params = new URLSearchParams(location.search); } catch (e) { return false; }
  if (params.has('tglink')) return false;
  if (!params.get("id") || !params.get("auth_date") || !params.get("hash")) return false;
  const user = {};
  WIDGET_FIELDS.forEach((k) => { const v = params.get(k); if (v != null && v !== "") user[k] = v; });   // exactly what Telegram signed
  // Establish FIRST — only strip the signed credentials off the URL once the login succeeds, so a
  // transient network/5xx during /auth/widget doesn't permanently lose the one-time signed payload.
  await establish(await api.auth.widget(user));
  try { history.replaceState(null, "", location.pathname + (location.hash || "")); } catch (e) { /* ignore */ }
  return true;
}

/** Lazy-inject https://telegram.org/js/telegram-widget.js?22 (the only whitelisted third-party script), redirect mode. */
export function injectWidget(container) {
  return tg.injectLoginWidget(container, {bot:CFG.BOT, returnUrl:widgetReturnUrl()});
}

/** Nonce login: POST /auth/nonce → user opens t.me/<BOT>?start=login_<nonce>; the bot shows the same 4-char
 *  `code` and binds only when the user taps confirm; poll every 5 s for 2 min. */
export function startNonceLogin(handlers) {
  const epoch=store.epoch(),token=store.get('token'),route=location.hash;
  return startNonceFlow({
    isCurrent:()=>store.epoch()===epoch&&store.get('token')===token&&location.hash===route,
    create:async opts=>({...await retryTransient(()=>{opts.signal.throwIfAborted();return api.auth.nonce(opts);},3),ttl:120}),
    poll:async(nonce,opts)=>{const value=await api.auth.poll(nonce,opts);return {ready:!!value?.token,value};},
    onCreated:r=>handlers.onLink('https://t.me/'+CFG.BOT+'?start=login_'+r.nonce,r.nonce,r.code||''),
    onPending:handlers.onTick,onExpired:handlers.onExpired,onError:handlers.onError,
    onReady:async response=>{
      try {await establish(response);}
      catch(error){
        if(store.epoch()===epoch&&store.get('token')===response.token&&location.hash===route)handlers.onError(error);
        return;
      }
      if(store.epoch()===epoch&&store.get('token')===response.token&&location.hash===route)handlers.onDone();
    },
  });
}
