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

/** Apply an auth response {token, user, tier, expires} then hydrate /me. */
export async function establish(resp) {
  if (!resp || !resp.token) throw new Error("no token");
  saveToken(resp.token);
  store.set("token", resp.token);
  const me = await api.me();
  store.set("me", me);
  return me;
}

export function logout() {
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
    try { await refreshMe(); return true; } catch (e) { clearToken(); store.set("token", null); }
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
      try {
        const r = await api.auth.poll(nonce);
        if (r && r.token) { await establish(r); handlers.onDone(); return; }
      } catch (e) {
        if (e.status && e.status !== 204 && e.status !== 404 && e.status !== 0) { handlers.onError(e); return; }
      }
      handlers.onTick(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
      timer = setTimeout(tick, 5000);
    };
    timer = setTimeout(tick, 5000);
  })();
  return ctl;
}
