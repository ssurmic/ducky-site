// views/alerts.js — list with state chips (pending/done/error/fired) · add form → 202 toast · 402 upsell · delete.
import { s } from "../strings.js";
import { mountDraft } from "./alert-draft.js";
import { mountSavedScreens } from './signal-screen.js';
import * as api from "../api.js";
import * as store from "../store.js";
import * as tg from "../tg.js";
import { el, clear, toast, spinner, empty, errorBox, confirm, date } from "../ui.js";


export function normalizeAlerts(resp) {
  const arr = Array.isArray(resp) ? resp : (resp && (resp.items || resp.alerts)) || [];
  return arr.map((a) => ({
    id: a.id ?? a.alert_id,
    ticker: String(a.ticker || a.symbol || "").toUpperCase(),
    condition: a.label || a.condition || a.condition_nl || a.text || "",
    state: stateOf(a),
    created_at: a.created_at || a.created || null,
    // finding alerts.js:14 — GET /alerts rows carry last_fired (db.list_alerts), not fired_at/triggered_at.
    fired_at: a.last_fired || a.fired_at || a.triggered_at || null,
  }));
}
export function stateOf(a) {
  // finding alerts.js:14 — the row's fired stamp is last_fired; compile_state (not status) drives pending/error.
  if (a.last_fired || a.fired_at || a.triggered_at || a.status === "fired" || a.status === "triggered") return "fired";
  const raw = String(a.compile_state || a.status || a.state || "done").toLowerCase();
  if (/pending|queued|compiling/.test(raw)) return "pending";
  if (/error|fail|invalid|reject/.test(raw)) return "error";
  return "done";
}

export async function mount(root, params = {}) {
  let alive = true;
  const epoch = store.epoch();
  const unsubs = []; let refreshTimer = null, refreshes = 0;
  const head = el("div.view-head", el("h1", s("alerts.title")), el("span.count.mono", { id: "alerts-count" }));
  const list = el("div.alist", { id: "alerts-list" });
  root.append(head);
  const disposeDraft = mountDraft(root, { signal: params.signal, company: (params.query?.get("ticker") || "").toUpperCase(), onCreated: load });
  root.append(list);
  const disposeScreens=mountSavedScreens(root,{signal:params.signal});

  async function onDelete(a) {
    if (!(await confirm(s("alerts.confirm_delete")))) return;
    try {
      await api.alerts.remove(a.id);
      toast(s("alerts.deleted"));
      tg.haptic("light");
      store.set("alerts", (store.get("alerts") || []).filter((x) => x.id !== a.id));
    } catch (err) { toast(s("common.error", { msg: err.message }), "err"); }
  }

  function render() {
    const items = store.get("alerts") || [];
    const me = store.get("me") || {};
    // finding alerts.js:71 — GET /me serves the cap top-level as alert_cap (app.py), never me.caps.alerts.
    const cap = me.alert_cap;
    const cnt = document.getElementById("alerts-count");
    if (cnt) cnt.textContent = cap ? s("alerts.count", { n: items.length, cap }) : String(items.length);
    clear(list);
    if (!items.length) { list.appendChild(empty(s("alerts.empty"))); return; }
    for (const a of items) {
      list.appendChild(el("article.card.alert-row", { "data-id": a.id, "data-state": a.state },
        el("div.alert-main",
          el("a.ticker.mono", { href: "#/chart/" + a.ticker }, "$" + a.ticker),
          el("span.cond", a.condition)),
        el("div.alert-side",
          el("span.chip", { class: "chip-" + a.state }, s("alerts.state_" + a.state)),
          a.created_at ? el("span.muted.small.mono", date(a.created_at)) : null,
          el("button.btn.btn-ghost.btn-sm.danger", { type: "button", "aria-label": s("common.delete"), onclick: () => onDelete(a) }, "✕"))));
    }
  }

  async function load() {
    try {
      const response = await api.alerts.list();
      if (!alive || store.epoch() !== epoch) return;
      store.set("alerts", normalizeAlerts(response));
      if ((store.get("alerts") || []).some((a) => a.state === "pending")) scheduleRefresh();
    } catch (err) { if (alive && store.epoch() === epoch) { clear(list); list.appendChild(errorBox(err, load)); } }
  }
  function scheduleRefresh() {
    if (!alive || refreshTimer || document.visibilityState === "hidden") return;
    // Long compiles must eventually settle in the UI; back off instead of stopping forever.
    refreshTimer = setTimeout(() => { refreshTimer = null; refreshes++; load(); }, Math.min(60000, 20000 * (refreshes + 1)));
  }

  unsubs.push(store.subscribe("alerts", render));
  const resume = () => { if (alive && document.visibilityState !== "hidden") { refreshes = 0; load(); } };
  window.addEventListener("online", resume);
  document.addEventListener("visibilitychange", resume);
  const dispose = () => { disposeDraft(); disposeScreens(); alive = false; unsubs.forEach((u) => u()); if (refreshTimer) clearTimeout(refreshTimer); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  params.signal?.addEventListener("abort", dispose, { once: true });
  if ((store.get("alerts") || []).length) render(); else list.appendChild(spinner());
  await load();
  return dispose;
}
