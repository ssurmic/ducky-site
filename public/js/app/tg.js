// tg.js — the ONLY file that touches window.Telegram (SYSTEMDESIGN.md §5).
// inTG detection · ready/expand · theme → data-theme + --tg-theme-* · start_param → hash route ·
// MainButton/BackButton helpers · openInvoice wrapper · optional haptics.
const WA = (window.Telegram && window.Telegram.WebApp) || null;

/** True only when launched by a Telegram client (initData present). A plain browser that merely
 *  loaded telegram-web-app.js has WebApp.platform === 'unknown' and empty initData. */
export const inTG = !!(WA && typeof WA.initData === "string" && WA.initData.length > 0);
export const initData = inTG ? WA.initData : "";
export const startParam = inTG ? ((WA.initDataUnsafe && WA.initDataUnsafe.start_param) || "") : "";
export const platform = WA ? WA.platform : "web";

function ver(v) { try { return !!(WA && WA.isVersionAtLeast && WA.isVersionAtLeast(v)); } catch (e) { return false; } }

function applyTheme() {
  const root = document.documentElement;
  if (!inTG) return;
  const tp = WA.themeParams || {};
  for (const k of Object.keys(tp)) {
    // bg_color -> --tg-theme-bg-color
    root.style.setProperty("--tg-theme-" + k.replace(/_/g, "-"), tp[k]);
  }
  root.setAttribute("data-theme", WA.colorScheme === "light" ? "light" : "dark");
  root.setAttribute("data-tg", platform || "tg");
  try {
    if (ver("6.1")) {
      if (tp.secondary_bg_color) WA.setHeaderColor(tp.secondary_bg_color);
      if (tp.bg_color) WA.setBackgroundColor(tp.bg_color);
    }
    if (ver("7.10") && tp.secondary_bg_color) WA.setBottomBarColor(tp.secondary_bg_color);
  } catch (e) { /* older client */ }
}

function applySafeArea() {
  if (!inTG) return;
  const root = document.documentElement;
  const sa = WA.safeAreaInset || {}, csa = WA.contentSafeAreaInset || {};
  root.style.setProperty("--tg-safe-top", ((sa.top || 0) + (csa.top || 0)) + "px");
  root.style.setProperty("--tg-safe-bottom", (sa.bottom || 0) + "px");
}

/** Map start_param → hash route. Accepted: watchlist | alerts | billing | chart_<TICKER> | <TICKER>. */
export function routeFromStartParam(p) {
  if (!p) return null;
  const v = String(p).trim();
  if (/^(watchlist|alerts|billing)$/i.test(v)) return "#/" + v.toLowerCase();
  let m = /^chart[_-]([A-Za-z.\-]{1,10})$/.exec(v);
  if (m) return "#/chart/" + m[1].toUpperCase();
  if (/^[A-Za-z.\-]{1,6}$/.test(v) && !/^(login|miniapp|web|src)$/i.test(v)) return "#/chart/" + v.toUpperCase();
  return null;
}

/** Call once at boot, before auth/router. */
export function boot() {
  if (!inTG) {
    document.documentElement.setAttribute("data-tg", "web");
    return;
  }
  try { WA.ready(); } catch (e) { /* ignore */ }
  try { WA.expand(); } catch (e) { /* ignore */ }
  try { if (ver("7.7") && WA.disableVerticalSwipes) WA.disableVerticalSwipes(); } catch (e) { /* ignore */ }
  applyTheme();
  applySafeArea();
  try {
    WA.onEvent("themeChanged", applyTheme);
    WA.onEvent("safeAreaChanged", applySafeArea);
    WA.onEvent("contentSafeAreaChanged", applySafeArea);
  } catch (e) { /* ignore */ }
  const wanted = routeFromStartParam(startParam);
  // The initial hash is Telegram's #tgWebAppData=… — never a route. Replace it (history stays clean).
  const h = location.hash || "";
  if (wanted) history.replaceState(null, "", location.pathname + location.search + wanted);
  else if (!h.startsWith("#/")) history.replaceState(null, "", location.pathname + location.search + "#/watchlist");
}

// ---- MainButton / BackButton --------------------------------------------------------------
let mainHandler = null, backHandler = null;

export function showMain(text, onClick, opts) {
  if (!inTG || !WA.MainButton) return false;
  const mb = WA.MainButton;
  if (mainHandler) mb.offClick(mainHandler);
  mainHandler = onClick;
  mb.setParams(Object.assign({ text: text, is_visible: true, is_active: true }, opts || {}));
  mb.onClick(mainHandler);
  return true;
}
export function hideMain() {
  if (!inTG || !WA.MainButton) return;
  if (mainHandler) { WA.MainButton.offClick(mainHandler); mainHandler = null; }
  WA.MainButton.hide();
}
export function mainProgress(on) {
  if (!inTG || !WA.MainButton) return;
  if (on) WA.MainButton.showProgress(false); else WA.MainButton.hideProgress();
}

export function showBack(onClick) {
  if (!inTG || !WA.BackButton || !ver("6.1")) return false;
  if (backHandler) WA.BackButton.offClick(backHandler);
  backHandler = onClick;
  WA.BackButton.onClick(backHandler);
  WA.BackButton.show();
  return true;
}
export function hideBack() {
  if (!inTG || !WA.BackButton || !ver("6.1")) return;
  if (backHandler) { WA.BackButton.offClick(backHandler); backHandler = null; }
  WA.BackButton.hide();
}

// ---- Payments ------------------------------------------------------------------------------
/** openInvoice(link) → Promise<'paid'|'cancelled'|'failed'|'pending'>. Rejects when unavailable. */
export function openInvoice(link) {
  return new Promise((resolve, reject) => {
    if (!inTG || !ver("6.1") || !WA.openInvoice) return reject(new Error("openInvoice unavailable"));
    try { WA.openInvoice(link, (status) => resolve(status)); } catch (e) { reject(e); }
  });
}
export function openTelegramLink(url) {
  if (inTG && WA.openTelegramLink) { try { WA.openTelegramLink(url); return; } catch (e) { /* fallthrough */ } }
  window.open(url, "_blank", "noopener");
}
export function openLink(url) {
  if (inTG && WA.openLink) { try { WA.openLink(url); return; } catch (e) { /* fallthrough */ } }
  window.open(url, "_blank", "noopener");
}

// ---- Haptics (optional) --------------------------------------------------------------------
export function haptic(kind) {
  if (!inTG || !ver("6.1") || !WA.HapticFeedback) return;
  try {
    if (kind === "success" || kind === "error" || kind === "warning") WA.HapticFeedback.notificationOccurred(kind);
    else WA.HapticFeedback.impactOccurred(kind || "light");
  } catch (e) { /* ignore */ }
}

export function close() { if (inTG) { try { WA.close(); } catch (e) { /* ignore */ } } }
