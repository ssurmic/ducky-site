// router.js — hash routes #/login #/watchlist #/alerts #/chart/<T> #/billing.
// Owns the Telegram MainButton (billing only) and BackButton (any non-root route).
import * as store from "./store.js";
import * as tg from "./tg.js";
import { clear } from "./ui.js";

const ROUTES = {
  login: () => import("./views/login.js"),
  watchlist: () => import("./views/watchlist.js"),
  alerts: () => import("./views/alerts.js"),
  chart: () => import("./views/chart.js"),
  billing: () => import("./views/billing.js"),
  profile: () => import("./views/profile.js"),
};
const PUBLIC = new Set(["login"]);
let current = null, cleanup = null, seq = 0;

export function parse(hash) {
  const h = (hash || "").replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  const name = parts[0] || "watchlist";
  if (name === "chart") return { name, params: { ticker: (parts[1] || "").toUpperCase() } };
  if (ROUTES[name]) return { name, params: {} };
  return { name: "watchlist", params: {} };
}

export function go(hash) { if (location.hash !== hash) location.hash = hash; else render(); }

export async function render() {
  const root = document.getElementById("view");
  if (!root) return;
  let route = parse(location.hash);
  const authed = !!store.get("me");
  if (!authed && !PUBLIC.has(route.name)) { history.replaceState(null, "", "#/login"); route = { name: "login", params: {} }; }
  if (authed && route.name === "login") { history.replaceState(null, "", "#/watchlist"); route = { name: "watchlist", params: {} }; }
  const my = ++seq;
  if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
  store.set("route", route);
  setActiveTab(route.name);
  document.body.setAttribute("data-route", route.name);
  clear(root);
  root.scrollTop = 0;
  let mod;
  try { mod = await ROUTES[route.name](); } catch (e) { root.textContent = String(e); return; }
  if (my !== seq) return;
  current = route;
  const ret = await mod.mount(root, route.params);
  if (my !== seq) { if (typeof ret === "function") ret(); return; }
  cleanup = typeof ret === "function" ? ret : null;
  // Telegram chrome
  if (route.name === "billing" && typeof mod.mainButton === "function") {
    const mb = mod.mainButton();
    if (mb) tg.showMain(mb.text, mb.onClick); else tg.hideMain();
  } else tg.hideMain();
  if (route.name === "chart" || route.name === "billing" || route.name === "alerts" || route.name === "profile") tg.showBack(() => go("#/watchlist"));
  else tg.hideBack();
}

function setActiveTab(name) {
  document.querySelectorAll(".app-nav a[data-route]").forEach((a) => {
    const on = a.getAttribute("data-route") === name;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}

export function start() {
  window.addEventListener("hashchange", render);
  store.subscribe("me", (me) => { if (!me && current && !PUBLIC.has(current.name)) render(); });
  return render();
}
