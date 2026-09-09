// router.js — hash routes #/login #/watchlist #/alerts #/chart/<T> #/billing.
// Owns the Telegram MainButton (billing only) and BackButton (any non-root route).
import * as store from "./store.js";
import * as tg from "./tg.js";
import { clear, errorBox, spinner, closeModal } from "./ui.js";
import { rememberTarget, takeTarget } from "./login-target.js";
import { showModuleRecovery } from "./release-recovery.js";
import { selectNavigation } from './navigation.js';
import {sharedReadRefresh} from './shared-read-refresh.js';

const ROUTES = {
  reports: () => import('./views/boards.js'),
  record: () => import('./views/record.js'),
  evidence: () => import('./views/evidence.js'),
  opportunities: () => import('./views/opportunities.js'),
  degen: () => import('./views/discovery.js'),
  vibe: () => import('./views/discovery.js'),
  market: () => import('./views/discovery.js'),
  macro: () => import('./views/discovery.js'),
  screens: () => import('./views/discovery.js'),
  research: () => import("./views/research.js"),
  login: () => import("./views/login.js"),
  oauth: () => import("./views/google.js"),
  register: () => import("./views/register.js"),
  forgot: () => import("./views/recovery.js"),
  reset: () => import("./views/recovery.js"),
  watchlist: () => import("./views/watchlist.js"),
  briefing: () => import("./views/briefing.js"),
  alerts: () => import("./views/alerts.js"),
  updates: () => import("./views/updates.js"),
  chart: () => import("./views/chart.js"),
  billing: () => store.billingEnabled() ? import("./views/billing.js") : import("./views/profile.js"),
  profile: () => import("./views/profile.js"),
  creators: () => import("./views/creators.js"),
  calendar: () => import("./views/calendar.js"),
  boards: () => import("./views/boards.js"),
};
const PUBLIC = new Set(["login", "forgot", "reset", "register", "oauth"]);
export function isPublic(hash) { return PUBLIC.has(parse(hash).name); }
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
  let name = parts[0] === "ducky" ? "evidence" : parts[0] || "watchlist";
  if(name==='billing' && !store.billingEnabled()){name='profile';query=new URLSearchParams();}
  if(name==='record'){let id='';try{id=decodeURIComponent(parts[1]||'');}catch{} return {name,params:{id,query}};}
  if (name === "chart" || name === "research" || name === "evidence") return { name, params: { ticker: (parts[1] || "").toUpperCase(), query } };
  if(name==='boards' && ['liquidity','digest','hiring','volscan'].includes(query.get('board')))return {name:'reports',params:{query}};
  if (ROUTES[name]) return { name, params: { query } };
  return { name: "watchlist", params: { query } };
}

export function go(hash) { if (location.hash !== hash) location.hash = hash; else render(); }

export async function render() {
  const root = document.getElementById("view");
  if (!root) return;
  let route = parse(location.hash);
  const authed = !!store.get("me");
  if (!authed && !PUBLIC.has(route.name)) {
    rememberTarget(location.hash);
    history.replaceState(null, "", "#/login"); route = { name: "login", params: {} };
  }
  if (authed && route.name === "login") {
    const target = takeTarget(); history.replaceState(null, "", target); route = parse(target);
  }
  const my = ++seq;
  closeModal();
  if (controller) controller.abort();
  controller = new AbortController();
  route.params.signal = controller.signal;
  if (cleanup) { try { cleanup(); } catch (e) { /* ignore */ } cleanup = null; }
  store.set("route", route);
  selectNavigation(route.name, route.params.query);
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
  try { mod = await ROUTES[route.name](); } catch (e) {
    if (my !== seq) return;
    clear(page);
    // A failed import may stay cached until a full refresh. Never repeat the same broken
    // import indefinitely or show the internal asset URL as the product's error message.
    showModuleRecovery(page, { signal: controller.signal });
    return;
  }
  if (my !== seq) return;
  current = route;
  clear(page);
  if(!PUBLIC.has(route.name)&&!['profile','billing','alerts'].includes(route.name)){
    // Keep this outside the view's DOM so its local render cannot erase the notice.
    sharedReadRefresh(root,{signal:controller.signal,reload:()=>{store.set('snapshots',{});render();}});
  }
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
  if (route.name === "updates") tg.showBack(() => go("#/alerts"));
  else if (route.name === "briefing" || route.name === "research" || route.name === "chart" || route.name === "billing" || route.name === "alerts" || route.name === "profile" || route.name === "creators" || route.name === "calendar" || route.name === "boards") tg.showBack(() => go("#/watchlist"));
  else if(!PUBLIC.has(route.name) && route.name!=='watchlist')tg.showBack(()=>go('#/watchlist'));
  else tg.hideBack();
}

export function start() {
  document.querySelector('.skip[href="#main"]')?.addEventListener('click', event => {
    event.preventDefault(); document.getElementById('main')?.focus({preventScroll:true});
  });
  document.addEventListener("keydown", (event) => {
    const more = document.querySelector(".nav-more[open]");
    if (event.key === "Escape" && more) {
      more.open = false;
      more.querySelector("summary")?.focus();
    }
  });
  document.addEventListener("click", (event) => {
    const more = document.querySelector(".nav-more[open]");
    if (more && (!more.contains(event.target) || event.target.closest("a[data-route]"))) {
      if(more.querySelector('.nav-more-panel')?.contains(document.activeElement)) more.querySelector('summary')?.focus({preventScroll:true});
      more.open = false;
    }
  });
  window.addEventListener("hashchange", render);
  store.subscribe("me", (me) => { if (!me && current && !PUBLIC.has(current.name)) render(); });
  return render();
}
