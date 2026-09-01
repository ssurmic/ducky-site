// auth.js — session bootstrap. inTG → POST /auth/miniapp; else Login-Widget redirect return → POST /auth/widget;
// else stored token → GET /me; else login view. Token storage: sessionStorage inside Telegram, localStorage on the
// web (SYSTEMDESIGN.md §4.1). The Login Widget runs in REDIRECT mode (data-auth-url): the CSP has no 'unsafe-eval',
// which the widget's data-onauth callback needs, so a callback-mode login would silently never complete.
import * as api from "./api.js";
import * as store from "./store.js";
import * as tg from "./tg.js";
import { CFG } from "./strings.js";

const KEY = "ducky.token";
const storage = () => { try { return tg.inTG ? window.sessionStorage : window.localStorage; } catch (e) { return null; } };

export function loadToken() { try { const st = storage(); return st ? st.getItem(KEY) : null; } catch (e) { return null; } }
export function saveToken(token) { try { const st = storage(); if (st) st.setItem(KEY, token); } catch (e) { /* private mode */ } }
export function clearToken() { try { const st = storage(); if (st) st.removeItem(KEY); } catch (e) { /* ignore */ } }

/** Apply an auth response {token, user, tier, expires} then hydrate the session. */
export async function establish(resp) {
  if (!resp || !resp.token) throw new Error("no token");
  saveToken(resp.token);
  store.set("token", resp.token);
  return hydrate();
}

/** finding auth.js:22 — collapse the boot waterfall: /me and /watchlist are independent after auth, so fire
 *  them together instead of serially, then prefetch every watchlist snapshot in parallel (L2 hits, §18.2.4)
 *  so the dashboard paints from the warmed store instead of a 4-deep serial chain. */
async function hydrate() {
  const [me, wl] = await Promise.all([
    api.me(),
    api.watchlist.list().catch(() => null),   // non-fatal: the watchlist view re-fetches on mount
  ]);
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
  // Best-effort SERVER-SIDE revocation: bump users.session_epoch so a token copied before this
  // logout dies NOW, not at its 24h expiry. Direct keepalive fetch with the still-present token
  // (bypasses the api wrapper's 401→logout handler to avoid recursion); never blocks the UI.
  try {
    const tok = loadToken();
    if (tok) fetch(api.base() + "/auth/logout", { method: "POST", keepalive: true,
      headers: { Authorization: "Bearer " + tok } }).catch(() => {});
  } catch (e) { /* ignore */ }
  store.bumpEpoch();   // finding watchlist.js:123 — invalidate in-flight fetches before wiping the store
  clearToken();
  store.set("token", null);
  store.set("me", null);
  store.set("watchlist", []);
  store.set("alerts", []);
  store.set("snapshots", {});
  if (location.hash !== "#/login") location.hash = "#/login";
}

export async function refreshMe() {
  const me = await api.me();
  store.set("me", me);
  return me;
}

/** Boot: resolves true when a session exists, false when the login view must be shown. */
export async function boot() {
  api.setUnauthorizedHandler(logout);
  if (tg.inTG && tg.initData) {
    try {
      await establish(await api.auth.miniapp(tg.initData));
      return true;
    } catch (e) {
      console.warn("miniapp auth failed", e);
      // fall through: a stale sessionStorage token may still work
    }
  }
  if (!tg.inTG) {
    try { if (await consumeWidgetRedirect()) return true; } catch (e) { console.warn("widget redirect auth failed", e); }
  }
  const token = loadToken();
  if (token) {
    store.set("token", token);
    try { await hydrate(); return true; } catch (e) { if (e && e.status === 401) { clearToken(); store.set("token", null); } /* transient (network/5xx) → keep the valid token */ }
  }
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
  if (!params.get("id") || !params.get("auth_date") || !params.get("hash")) return false;
  const user = {};
  WIDGET_FIELDS.forEach((k) => { const v = params.get(k); if (v != null && v !== "") user[k] = v; });   // exactly what Telegram signed
  try { history.replaceState(null, "", location.pathname + (location.hash || "")); } catch (e) { /* ignore */ }   // credentials off the URL first
  await establish(await api.auth.widget(user));
  return true;
}

/** Lazy-inject https://telegram.org/js/telegram-widget.js?22 (the only whitelisted third-party script), redirect mode. */
export function injectWidget(container) {
  const sc = document.createElement("script");
  sc.async = true;
  sc.src = "https://telegram.org/js/telegram-widget.js?22";
  sc.setAttribute("data-telegram-login", CFG.BOT);
  sc.setAttribute("data-size", "large");
  sc.setAttribute("data-radius", "10");
  sc.setAttribute("data-request-access", "write");
  sc.setAttribute("data-auth-url", widgetReturnUrl());   // never data-onauth: CSP script-src has no 'unsafe-eval'
  container.appendChild(sc);
  return sc;
}

/** Nonce login: POST /auth/nonce → user opens t.me/<BOT>?start=login_<nonce>; the bot shows the same 4-char
 *  `code` and binds only when the user taps confirm; poll every 5 s for 2 min. */
export function startNonceLogin(handlers) {
  let stopped = false, timer = null;
  const ctl = { stop() { stopped = true; if (timer) clearTimeout(timer); } };
  (async () => {
    let nonce, code;
    try { const r = await api.auth.nonce(); nonce = r.nonce; code = r.code || ""; } catch (e) { handlers.onError(e); return; }
    const link = "https://t.me/" + CFG.BOT + "?start=login_" + nonce;
    handlers.onLink(link, nonce, code);
    const deadline = Date.now() + 120000;
    const tick = async () => {
      if (stopped) return;
      if (Date.now() > deadline) { handlers.onExpired(); return; }
      let wait = 5000;
      try {
        const r = await api.auth.poll(nonce);
        if (r && r.token) { await establish(r); handlers.onDone(); return; }
      } catch (e) {
        // finding auth.js:118 — abort ONLY on a definitive error (bad/expired/forbidden nonce). A shared-IP
        // 429, a 5xx tunnel blip, or a network hiccup (status 0) is transient: keep polling within the
        // deadline, honoring Retry-After. This is the flow the mainland path relies on.
        const st = e.status;
        if (st === 400 || st === 401 || st === 403) { handlers.onError(e); return; }
        const ra = Number((e.body && e.body.retry_after) || 0);
        if (ra > 0) wait = Math.min(Math.max(ra, 1), 30) * 1000;
      }
      handlers.onTick(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
      timer = setTimeout(tick, wait);
    };
    timer = setTimeout(tick, 5000);
  })();
  return ctl;
}
