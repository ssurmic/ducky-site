// main.js — boot: tg → auth → router. Entry point for /app/ (website dashboard + Telegram Mini App).
import * as tg from "./tg.js";
import * as auth from "./auth.js";
import * as api from "./api.js";
import * as router from "./router.js";
import * as store from "./store.js";
import * as ui from "./ui.js";
import { s } from "./strings.js";

async function boot() {
  tg.boot();
  api.setPaymentRequiredHandler(ui.upsell);
  document.body.classList.toggle("in-tg", tg.inTG);

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) logoutBtn.addEventListener("click", (e) => { e.preventDefault(); auth.logout(); });
  store.subscribe("me", (me) => { ui.renderTierBadge(); if (logoutBtn) logoutBtn.hidden = !me || tg.inTG; });

  let ok = false;
  try { ok = await auth.boot(); } catch (e) { console.warn(e); }
  if (!ok) history.replaceState(null, "", location.pathname + location.search + "#/login");
  else if (!location.hash.startsWith("#/") || location.hash === "#/login") history.replaceState(null, "", location.pathname + location.search + "#/watchlist");
  // §14: first login → complete profile (email) once; the dashboard stays usable, billing requires it
  const me0 = store.get("me");
  if (ok && me0 && me0.profile_complete === false && !sessionStorage.getItem("ducky_profile_prompted")) {
    sessionStorage.setItem("ducky_profile_prompted", "1");
    history.replaceState(null, "", location.pathname + location.search + "#/profile?next=watchlist");
  }
  ui.renderTierBadge();
  if (logoutBtn) logoutBtn.hidden = !ok || tg.inTG;
  await router.start();
  document.body.classList.add("ready");
}

boot().catch((e) => { console.error(e); ui.toast(s("common.error", { msg: e.message }), "err"); });
