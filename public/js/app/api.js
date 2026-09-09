import { calendarEventKey } from './calendar-model.js';
// api.js — fetch wrapper: CFG.API_BASE + bearer + JSON; 202 retry helper; 401 → logout hook;
// 402 → upsell hook. Views never call fetch() directly.
import { CFG, LANG } from "./strings.js";
import * as store from "./store.js";

export class ApiError extends Error {
  constructor(status, body, url) {
    super((body && (body.detail || body.error || body.message)) || ("HTTP " + status));
    this.status = status; this.body = body || {}; this.url = url;
  }
}

let onUnauthorized = null, onPaymentRequired = null;
const readObservers=new Set();
export function observeReads(fn){readObservers.add(fn);return()=>readObservers.delete(fn);}
export function setUnauthorizedHandler(fn) { onUnauthorized = fn; }
export function setPaymentRequiredHandler(fn) { onPaymentRequired = fn; }

export function base() { return (CFG.API_BASE || "").replace(/\/+$/, ""); }

async function parse(res) {
  const ct = res.headers.get("content-type") || "";
  if (res.status === 204) return null;
  if (ct.includes("application/json")) { try { return await res.json(); } catch (e) { return null; } }
  const text = await res.text();
  return text ? { detail: text } : null;
}

/** request(method, path, {body, raw, auth=true}) → parsed JSON (or Response when raw). */
export async function request(method, path, opts) {
  opts = opts || {};
  const headers = { Accept: "application/json" };
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;
  const token = store.get("token");
  const epoch = store.epoch();
  // Bind reads to the page that started them, never the next route's observer.
  const observers=method==='GET'&&opts.observe!==false?[...readObservers]:[];
  const observed=value=>{for(const fn of observers){try{fn(path,value,{auth:opts.auth!==false});}catch{}}return value;};
  const sessionChanged = () => (opts.auth !== false || opts.bindSession) && (token !== store.get("token") || epoch !== store.epoch());
  if (opts.auth !== false && token) headers.Authorization = "Bearer " + token;
  let body;
  if (opts.body !== undefined) { headers["Content-Type"] = "application/json"; body = JSON.stringify(opts.body); }
  // finding api.js:37 — fetch had no timeout: a black-holed request (tunnel flap; CF 524 hangs ~100s) leaves
  // the view's mount promise pending forever, so router.render never runs the old view's cleanup and its store
  // subscriptions leak while the user stares at a spinner. Bound every request with a 15s AbortController;
  // abort maps to ApiError(0,{detail:'network'}) so the existing offline handling + errorBox retry engage. An
  // optional opts.signal lets a caller (router cleanup) abort in-flight requests on view switch.
  const ctl = new AbortController();
  const to = setTimeout(() => { try { ctl.abort(); } catch (e) { /* ignore */ } }, opts.timeout || 15000);
  if (opts.signal) {
    if (opts.signal.aborted) { try { ctl.abort(); } catch (e) { /* ignore */ } }
    else opts.signal.addEventListener("abort", () => { try { ctl.abort(); } catch (e) { /* ignore */ } }, { once: true });
  }
  let res;
  try {
    res = await fetch(base() + path, { method, headers, body, credentials: opts.credentials || "omit", cache: "no-store", signal: ctl.signal });
  } catch (e) {
    throw new ApiError(0, { detail: "network" }, path);
  } finally {
    clearTimeout(to);
  }
  if (sessionChanged()) throw new ApiError(0, { detail: "session_changed" }, path);
  if (opts.raw) return res;
  const data = await parse(res);
  if (sessionChanged()) throw new ApiError(0, { detail: "session_changed" }, path);
  if (res.status === 401 && opts.auth !== false) {
    if (onUnauthorized && !opts.skipUnauthorized && !(opts.preserveBadTelegram && data?.error === 'bad_telegram')) {
      const recovered = await onUnauthorized({token,epoch,retry:!opts.sessionRetried});
      if (recovered) return request(method,path,{...opts,sessionRetried:true});
    }
    throw new ApiError(401, data, path);
  }
  if (res.status === 402) {
    if (onPaymentRequired && !opts.silent402) onPaymentRequired(data || {});
    throw new ApiError(402, data, path);
  }
  if (res.status === 202) {
    const r = data || {};
    return observed({ __accepted: true, retry_after: Number(r.retry_after || res.headers.get("Retry-After") || 5), body: r });
  }
  if (!res.ok) throw new ApiError(res.status, data, path);
  return observed(data);
}

export const get = (p, o) => request("GET", p, o);
export const post = (p, body, o) => request("POST", p, Object.assign({ body: body || {} }, o || {}));
export const del = (p, o) => request("DELETE", p, o);

export function isAccepted(x) { return !!(x && x.__accepted); }

/** GET that follows 202 {retry_after}: waits and retries up to `tries` times; resolves to the final
 *  payload or the last 202 marker. `onWait(seconds, attempt)` lets a view show "building…". */
export async function getWithRetry(path, opts) {
  opts = opts || {};
  const tries = opts.tries || 4;
  let last = null;
  for (let i = 0; i < tries; i++) {
    last = await get(path, opts);
    if (!isAccepted(last)) return last;
    const wait = Math.min(Math.max(last.retry_after || 5, 1), 30);
    if (opts.onWait) opts.onWait(wait, i + 1);
    if (i === tries - 1) break;
    await sleep(wait * 1000);
  }
  return last;
}

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Authenticated binary fetch → data: URI (CSP img-src allows data:, not blob:). */
export async function getDataUri(path, sessionRetried=false) {
  const session={token:store.get('token'),epoch:store.epoch()};
  const res = await request("GET", path, { raw: true });
  if (res.status === 401) {
    if (onUnauthorized && await onUnauthorized({...session,retry:!sessionRetried}))return getDataUri(path,true);
    throw new ApiError(401, null, path);
  }
  if (!res.ok) throw new ApiError(res.status, await parse(res), path);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(new Error("read failed"));
    fr.readAsDataURL(blob);
  });
}

// ---- typed endpoints (contract: SYSTEMDESIGN.md §4.2, backend pack M3) ------------------------
export const auth = {
  providers: (opts) => get("/auth/providers", { ...opts, auth: false }),
  googleSession: (provider="google") => post("/auth/session" + (provider === "x" ? "?provider=x" : ""), {}, { auth: false, bindSession:true, credentials: "include" }),
  refresh: () => post("/auth/refresh", {}, { credentials:"include", skipUnauthorized:true }),
  xLink: () => post("/auth/x/link", { lang:LANG }, {credentials:"include"}),
  googleLink: () => post("/auth/google/link", { lang: LANG }, { credentials: "include" }),
  miniapp: (initData) => post("/auth/miniapp", { initData }, { auth: false, bindSession:true, credentials:"include" }),
  widget: (user) => post("/auth/widget", user, { auth: false, bindSession:true, credentials:"include" }),
  linkTelegram: (user, opts) => post('/auth/link/telegram', user, {...opts, preserveBadTelegram:true}),
  telegramLinkNonce: (opts) => post('/auth/link/telegram/nonce', {}, opts),
  telegramLinkPoll: (nonce, opts) => get('/auth/link/telegram/poll?nonce='+encodeURIComponent(nonce), opts),
  telegramLinkConfirm: (nonce, opts) => post('/auth/link/telegram/confirm', {nonce}, opts),
  telegramLinkCancel: (nonce, opts) => post('/auth/link/telegram/cancel', {nonce}, opts),
  nonce: (opts) => post("/auth/nonce", {}, { ...opts, auth: false }),
  password: (email, password) => post("/auth/password", { email, password }, { auth: false, bindSession:true, credentials:"include" }),
  poll: (nonce, opts) => get("/auth/poll?nonce=" + encodeURIComponent(nonce), { ...opts, auth: false, bindSession:true, credentials:"include" }),
  register: (email, password) => post("/auth/register", { email, password, lang: LANG }, { auth: false, bindSession:true, credentials:"include" }),
  redeem: (code, username, password) => post("/auth/redeem", { code, username, password, lang: LANG }, { auth: false, bindSession:true, credentials:"include" }),
  requestReset: (email) => post("/auth/password-reset/request", { email, lang: LANG }, { auth: false }),
  confirmReset: (token, password) => post("/auth/password-reset/confirm", { token, password }, { auth: false }),
};
export const me = (opts) => get("/me", opts);
export const symbols = (q, opts) => get("/public/symbols?q=" + encodeURIComponent(q), { ...opts, auth:false });
export const watchlist = {
  list: () => get("/watchlist"),
  add: (t) => post("/watchlist", { ticker: t }),
  remove: (t) => del("/watchlist/" + encodeURIComponent(t)),
};
export const snapshot = (t, o) => getWithRetry("/snapshot/" + encodeURIComponent(t), o);
export const bars = (t, period) => get("/bars/" + encodeURIComponent(t) + "?period=" + encodeURIComponent(period || "6mo"));
export const alerts = {
  list: () => get("/alerts"),
  add: (ticker, condition) => post("/alerts", { ticker, condition }),
  remove: (id) => del("/alerts/" + encodeURIComponent(id)),
};
export const profile = {
  get: (opts) => get("/me/profile", opts),
  save: (body, opts) => post("/me/profile", body, opts),
  verify: (code, opts) => post("/me/profile/verify", { code }, opts),
  resend: (opts) => post("/me/profile/resend", {}, opts),
  setPassword: (body) => post("/me/profile/password", body),
  remove: () => post("/me/delete", {}),
};
export const notifications = {
  get: (opts) => get('/me/notifications', opts),
  save: (body, opts) => request('PATCH', '/me/notifications', {...opts, body}),
  test: (channels, opts) => post('/me/notifications/test', {channels}, opts),
  delivery: (id, opts) => get('/me/notifications/deliveries/' + encodeURIComponent(id), opts),
};
export const billing = {
  plans: () => get("/billing/plans?catalog=pro-20260906", { auth: false }),
  order: (tier, months, rail) => post("/billing/order", { tier, months, rail }),
  orders: () => get("/billing/orders"),
  qr: (rail) => getDataUri("/billing/qr/" + encodeURIComponent(rail)),
};
export const kol = {
  // No public fallback for a denied/expired Pro session.
  feed: () => store.isPro() ? get('/kol/feed') : get('/kol/trial-feed'),
  mine: () => get("/me/kols"),
  sub: (id) => post("/kol/" + encodeURIComponent(id) + "/sub", {}),
  unsub: (id) => del("/kol/" + encodeURIComponent(id) + "/sub"),
};
export const signals = {
  // shared firehose boards (Radar) — public, compliance-scrubbed, filterable by kind CSV
  board: (kinds, opts) => get("/public/signals/recent.json?kind=" + encodeURIComponent(kinds)
    + "&days=" + ((opts && opts.days) || 7) + "&limit=" + ((opts && opts.limit) || 12), { auth: false }),
};
export const calendar = {
  links: () => get("/calendar/links", {timeout:3000, silent402:true}),
  context: (params, opts) => get("/calendar/context?" + new URLSearchParams(params), {...opts, silent402:true}),
  // Live from the API (enriched with grounded history server-side); if the API is down
  // or hasn't shipped the route yet, fall back to the static file built into the site so the
  // calendar NEVER goes blank. Never throws — worst case an empty (but valid) doc.
  feed: async () => {
    // Fetch BOTH the live API and the static fallback, then MERGE — neither alone is complete:
    // the API has live earnings (and, once fully deployed, everything), the static fallback carries the
    // verified macro schedule (FOMC/CPI/NFP/PCE). Merging is correct whether the API is stale or fresh.
    let apiEv = [], staticEv = [], apiDoc = null, staticDoc = null;
    try { apiDoc = await get("/public/calendar.json", { auth: false }); if (apiDoc && Array.isArray(apiDoc.events)) apiEv = apiDoc.events; } catch (e) { /* API down */ }
    try { const r = await fetch("/calendar.json", { cache: "no-store" }); if (r.ok) { const j = await r.json(); if (j && Array.isArray(j.events)) { staticDoc=j; staticEv = j.events; } } } catch (e) { /* ignore */ }
    // Retain source acquisition clocks through the event merge. The current
    // API envelope wins even when its valid event set is empty or has recovered.
    const sourceDoc=Array.isArray(apiDoc?.events)?apiDoc:staticDoc;
    const sourceState={earnings_source_status:sourceDoc?.earnings_source_status,
      earnings_source_coverage:sourceDoc?.earnings_source_coverage};
    if (!apiEv.length && !staticEv.length) return { ...sourceState, events: [], partial: true, source: "empty" };
    if (!staticEv.length) return apiDoc;
    if (!apiEv.length) return { ...sourceState, events: staticEv, partial: true, source: "static-fallback" };
    const out = [], seen = new Set();
    for (const e of [...apiEv, ...staticEv]) {
      const key = calendarEventKey(e);
      if (!seen.has(key)) { out.push(e); seen.add(key); }
    }
    out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { ...sourceState, events: out, as_of: (apiDoc && apiDoc.as_of) || undefined, source: "merged", partial: !!apiDoc?.partial };
  },
  _raw: () => get("/public/calendar.json", { auth: false }),
};
export const push = {
  config: (opts) => get("/push/config", { ...opts, auth: false }),   // {enabled, vapid_public} — public key isn't secret
  subscribe: (subscription, opts) => post("/push/subscribe", { subscription }, opts),
  unsubscribe: (endpoint) => del("/push/subscribe", { body: { endpoint } }),
  test: () => post("/push/test", {}),
};

export const creatorNotifications = {
  options: opts => get('/creator-notifications/options', {...opts, silent402:true}),
  topics: opts => get('/creator-notifications/topics', {...opts, silent402:true}),
  save: (topic, opts) => request('PUT', '/creator-notifications/topics', {...opts, silent402:true, body:topic}),
  remove: (type, key, opts) => del('/creator-notifications/topics/'+encodeURIComponent(type)+'/'+encodeURIComponent(key), {...opts, silent402:true}),
  inbox: (before, opts) => get('/creator-notifications/inbox?limit=30'+(before?'&before_id='+encodeURIComponent(before):''), {...opts, silent402:true}),
  item: (id, opts) => get('/creator-notifications/inbox/'+encodeURIComponent(id), {...opts, silent402:true}),
  read: (id, opts) => post('/creator-notifications/inbox/'+encodeURIComponent(id)+'/read', {}, {...opts, silent402:true}),
  preview: (id, endpoint, opts) => post('/creator-notifications/inbox/'+encodeURIComponent(id)+'/test-push', {endpoint}, {...opts, silent402:true}),
};

export const company = (t,o) => get("/public/company/" + encodeURIComponent(t),o);
