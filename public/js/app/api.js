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
  const token = store.get("token");
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
    res = await fetch(base() + path, { method, headers, body, credentials: "omit", cache: "no-store", signal: ctl.signal });
  } catch (e) {
    throw new ApiError(0, { detail: "network" }, path);
  } finally {
    clearTimeout(to);
  }
  if (opts.raw) return res;
  const data = await parse(res);
  if (res.status === 401 && opts.auth !== false) {
    if (onUnauthorized) onUnauthorized();
    throw new ApiError(401, data, path);
  }
  if (res.status === 402) {
    if (onPaymentRequired && !opts.silent402) onPaymentRequired(data || {});
    throw new ApiError(402, data, path);
  }
  if (res.status === 202) {
    const r = data || {};
    return { __accepted: true, retry_after: Number(r.retry_after || res.headers.get("Retry-After") || 5), body: r };
  }
  if (!res.ok) throw new ApiError(res.status, data, path);
  return data;
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
export async function getDataUri(path) {
  const res = await request("GET", path, { raw: true });
  if (res.status === 401) { if (onUnauthorized) onUnauthorized(); throw new ApiError(401, null, path); }
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
  miniapp: (initData) => post("/auth/miniapp", { initData }, { auth: false }),
  widget: (user) => post("/auth/widget", user, { auth: false }),
  nonce: () => post("/auth/nonce", {}, { auth: false }),
  password: (email, password) => post("/auth/password", { email, password }, { auth: false }),
  poll: (nonce) => get("/auth/poll?nonce=" + encodeURIComponent(nonce), { auth: false }),
  register: (email, password) => post("/auth/register", { email, password, lang: LANG }, { auth: false }),
  redeem: (code, username) => post("/auth/redeem", { code, username, lang: LANG }, { auth: false }),
};
export const me = () => get("/me");
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
  get: () => get("/me/profile"),
  save: (body) => post("/me/profile", body),
  verify: (code) => post("/me/profile/verify", { code }),
  resend: () => post("/me/profile/resend", {}),
  setPassword: (body) => post("/me/profile/password", body),
  remove: () => post("/me/delete", {}),
};
export const billing = {
  plans: () => get("/billing/plans", { auth: false }),
  order: (tier, months, rail) => post("/billing/order", { tier, months, rail }),
  orders: () => get("/billing/orders"),
  qr: (rail) => getDataUri("/billing/qr/" + encodeURIComponent(rail)),
};
export const kol = {
  feed: () => get("/public/kol-feed.json", { auth: false }),
  mine: () => get("/me/kols"),
  sub: (id) => post("/kol/" + encodeURIComponent(id) + "/sub", {}),
  unsub: (id) => del("/kol/" + encodeURIComponent(id) + "/sub"),
};
export const calendar = {
  // Live from the API (enriched with grounded history server-side); if the API is down
  // or hasn't shipped the route yet, fall back to the static file built into the site so the
  // calendar NEVER goes blank. Never throws — worst case an empty (but valid) doc.
  feed: async () => {
    // Fetch BOTH the live API and the static fallback, then MERGE — neither alone is complete:
    // the API has live earnings (and, once fully deployed, everything), the static fallback carries the
    // verified macro schedule (FOMC/CPI/NFP/PCE). Merging is correct whether the API is stale or fresh.
    let apiEv = [], staticEv = [], apiDoc = null;
    try { apiDoc = await get("/public/calendar.json", { auth: false }); if (apiDoc && Array.isArray(apiDoc.events)) apiEv = apiDoc.events; } catch (e) { /* API down */ }
    try { const r = await fetch("/calendar.json", { cache: "no-store" }); if (r.ok) { const j = await r.json(); if (j && Array.isArray(j.events)) staticEv = j.events; } } catch (e) { /* ignore */ }
    if (!apiEv.length && !staticEv.length) return { events: [], partial: true, source: "empty" };
    if (!staticEv.length) return apiDoc;
    if (!apiEv.length) return { events: staticEv, partial: true, source: "static-fallback" };
    const STRUCT = new Set(["opex", "witching", "rebal"]);
    const out = apiEv.slice();
    const seen = new Set(apiEv.map((e) => e.date + "|" + e.type + "|" + (e.title || "")));
    const seenStruct = new Set(apiEv.filter((e) => STRUCT.has(e.type)).map((e) => e.date + "|" + e.type));
    for (const e of staticEv) {
      if (STRUCT.has(e.type)) { const k = e.date + "|" + e.type; if (!seenStruct.has(k)) { out.push(e); seenStruct.add(k); } }
      else { const k = e.date + "|" + e.type + "|" + (e.title || ""); if (!seen.has(k)) { out.push(e); seen.add(k); } }
    }
    out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { events: out, as_of: (apiDoc && apiDoc.as_of) || undefined, source: "merged" };
  },
  _raw: () => get("/public/calendar.json", { auth: false }),
};
export const push = {
  config: () => get("/push/config", { auth: false }),   // {enabled, vapid_public} — public key isn't secret
  subscribe: (subscription) => post("/push/subscribe", { subscription }),
  unsubscribe: (endpoint) => del("/push/subscribe", { body: { endpoint } }),
  test: () => post("/push/test", {}),
};
