// router.js — hash routes #/login #/watchlist #/alerts #/chart/<T> #/billing.
// Owns the Telegram MainButton (billing only) and BackButton (any non-root route).
import * as store from "./store.js";
import * as tg from "./tg.js";
import { clear, errorBox, spinner } from "./ui.js";

const ROUTES = {
  login: () => import("./views/login.js"),
  watchlist: () => import("./views/watchlist.js"),
  alerts: () => import("./views/alerts.js"),
  chart: () => import("./views/chart.js"),
  billing: () => import("./views/billing.js"),
  profile: () => import("./views/profile.js"),
  creators: () => import("./views/creators.js"),
  calendar: () => import("./views/calendar.js"),
  boards: () => import("./views/boards.js"),
};
const PUBLIC = new Set(["login"]);
let current = null, cleanup = null, seq = 0, controller = null;

export function parse(hash) {
  // finding router.js:20 — strip the query string BEFORE matching, else '#/profile?next=billing' yields the
  // route name 'profile?next=billing', misses ROUTES, and silently falls back to watchlist — killing every
  // '?next=' flow (main.js first-login prompt, billing profile-required bounce, profile 'continue' link).
  const raw = (hash || "").replace(/^#\/?/, "");
  const qi = raw.indexOf("?");
  const path = qi === -1 ? raw : raw.slice(0, qi);
  let query;
  try { query = new URLSearchParams(qi === -1 ? "" : raw.slice(qi + 1)); } catch (e) { query = new URLSearchParams(); }
  const parts = path.split("/").filter(Boolean);
  const name = parts[0] || "watchlist";
  if (name === "chart") return { name, params: { ticker: (parts[1] || "").toUpperCase(), query } };
  if (ROUTES[name]) return { name, params: { query } };
  return { name: "watchlist", params: { query } };
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
  if (controller) controller.abort();
  controller = new AbortController();
  route.params.signal = controller.signal;
  if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
  store.set("route", route);
  setActiveTab(route.name);
  document.body.setAttribute("data-route", route.name);
  clear(root);
  const main = root.closest(".app-main");
  if (main) main.scrollTop = 0;
  tg.hideMain(); tg.hideBack();
  // Each navigation owns its DOM: late responses cannot replace the next page.
  const page = document.createElement("div");
  page.className = "route-page";
  root.appendChild(page);
  page.appendChild(spinner());
  let mod;
  try { mod = await ROUTES[route.name](); } catch (e) { if (my !== seq) return; clear(page); page.appendChild(errorBox(e, () => render())); return; }
  if (my !== seq) return;
  current = route;
  clear(page);
  let ret;
  try { ret = await mod.mount(page, route.params); }
  catch (e) {
    if (my === seq) { clear(page); page.appendChild(errorBox(e, () => render())); }
    return;
  }
  if (my !== seq) { if (typeof ret === "function") ret(); return; }
  cleanup = typeof ret === "function" ? ret : null;
  // Telegram chrome
  if (route.name === "billing" && typeof mod.mainButton === "function") {
    const mb = mod.mainButton();
    if (mb) tg.showMain(mb.text, mb.onClick); else tg.hideMain();
  } else tg.hideMain();
  if (route.name === "chart" || route.name === "billing" || route.name === "alerts" || route.name === "profile" || route.name === "creators" || route.name === "calendar" || route.name === "boards") tg.showBack(() => go("#/watchlist"));
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
