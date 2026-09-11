// main.js — boot: tg → auth → router. Entry point for /app/ (website dashboard + Telegram Mini App).
import * as tg from "./tg.js";
import * as auth from "./auth.js";
import * as api from "./api.js";
import * as router from "./router.js";
import * as store from "./store.js";
import * as ui from "./ui.js";
import {renderAccountAvatar} from "./account-avatar.js";
import { s } from "./strings.js";
import { rememberTarget, takeTarget, safeTarget, signedInTarget, needsEmailSetup } from "./login-target.js";

import {watchRelease} from './release-recovery.js';
import {legacyAuthLocaleTarget} from './locale-route.js';
import {renderBrandNavigation} from './navigation.js';

async function boot() {
  watchRelease(document.querySelector('.app-main')||document.body);
  tg.boot();
  api.setPaymentRequiredHandler(ui.upsell);
  document.body.classList.toggle("in-tg", tg.inTG);

  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) logoutBtn.addEventListener("click", (e) => { e.preventDefault(); auth.logout(); });
  store.subscribe("me", (me) => { renderBrandNavigation(me); renderAccountAvatar(me); ui.renderTierBadge(); if (logoutBtn) logoutBtn.hidden = !me || tg.inTG; });

  await restoreAndStart();
}

async function restoreAndStart() {
  const root=document.getElementById('view');
  root?.replaceChildren(ui.spinner(s('session.restoring')));

  let ok = false;
  const requested = location.hash;
  try { ok = await auth.boot(); } catch (e) {
    if(e.body?.detail==='session_busy' && !router.isPublic(requested)) {
      root?.replaceChildren(ui.el('section.card', {role:'status'},
        ui.el('h1', s('session.retry_title')),
        ui.el('p.muted', s('session.retry_body')),
        ui.el('button.btn.btn-primary', {type:'button', onclick:()=>restoreAndStart().catch(showBootError)}, s('common.retry'))));
      return;
    }
    console.warn(e);
  }
  if (!ok && !router.isPublic(requested)) {
    rememberTarget(requested);
    history.replaceState(null, "", location.pathname + location.search + "#/login");
  } else if (ok && auth.didAuthenticateOnBoot() && needsEmailSetup(store.get('me')) && !location.hash.startsWith('#/profile')) {
    const next = safeTarget(requested) || takeTarget();
    history.replaceState(null, "", location.pathname + location.search + signedInTarget(store.get('me'), next));
  } else if (ok && (!location.hash.startsWith("#/") || location.hash === "#/login")) history.replaceState(null, "", location.pathname + location.search + takeTarget());
  // Account recovery is a visible reminder, never a redirect away from a deep link.
  const reminder = document.getElementById("profile-reminder");
  const renderReminder = me => { if (reminder) reminder.hidden = !needsEmailSetup(me); };
  store.subscribe("me", renderReminder);
  renderReminder(store.get("me"));
  renderBrandNavigation(store.get('me'));
  ui.renderTierBadge();
  const logoutBtn = document.getElementById('logout');
  if (logoutBtn) logoutBtn.hidden = !ok || tg.inTG;
  await router.start();
  document.body.classList.add("ready");
}

function showBootError(e) {
  console.error(e);
  document.getElementById('view')?.replaceChildren(ui.errorBox(e,()=>location.reload()));
}
const legacyTarget = legacyAuthLocaleTarget(location);
if (legacyTarget) location.replace(legacyTarget);
else boot().catch(showBootError);
